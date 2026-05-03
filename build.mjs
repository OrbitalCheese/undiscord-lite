// ============================================================================
// BUNDLER
// ----------------------------------------------------------------------------
// Single-file ESM bundler with zero npm dependencies. Walks the import graph
// from src/index.js, inlines .html / .css imports as string defaults, wraps
// each module in an IIFE registered in a runtime cache, concatenates in
// topological order, and prepends the userscript banner.
//
// Supported ESM forms:
//   - import X from 'spec'
//   - import { a, b as c } from 'spec'
//   - import X, { a, b } from 'spec'           (mixed default + named)
//   - import 'spec'                            (side-effect)
//   - export const | let | var | function | class | default
//
// Not supported:
//   - dynamic imports
//   - re-exports (`export { x } from './y'`)
//   - namespace imports (`import * as ns from ...`)
//   - top-level `export` keywords not at column 0
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(ROOT, 'src', 'index.js');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const OUT = path.join(ROOT, pkg.main);


// ============================================================================
// USERSCRIPT BANNER
// ----------------------------------------------------------------------------
// Generates the // ==UserScript== / // ==/UserScript== block at the top of
// the bundle. Required fields come from package.json directly; optional fields
// (author, license, homepageURL, supportURL, downloadURL, updateURL) are
// included only when present in package.json.userScript.
// ============================================================================

/** Renders a `{ key: value | [values] }` map into the UserScript banner format with aligned key columns. */
function buildBanner(meta) {
  const longest = Math.max(...Object.keys(meta).map(k => k.length));
  const lines = [];
  for (const [k, v] of Object.entries(meta)) {
    const padded = k.padEnd(longest);
    if (Array.isArray(v)) v.forEach(item => lines.push(`// @${padded} ${item}`));
    else lines.push(`// @${padded} ${v}`);
  }
  return ['// ==UserScript==', ...lines, '// ==/UserScript==', ''].join('\n');
}

const BANNER = buildBanner({
  name:        pkg.nameFull,
  description: pkg.description,
  version:     pkg.version,
  namespace:   pkg.userScript.namespace,
  match:       pkg.userScript.match,
  grant:       pkg.userScript.grant,
  ...(pkg.userScript.author      && { author:      pkg.userScript.author }),
  ...(pkg.userScript.license     && { license:     pkg.userScript.license }),
  ...(pkg.userScript.homepageURL && { homepageURL: pkg.userScript.homepageURL }),
  ...(pkg.userScript.supportURL  && { supportURL:  pkg.userScript.supportURL }),
  ...(pkg.userScript.downloadURL && { downloadURL: pkg.userScript.downloadURL }),
  ...(pkg.userScript.updateURL   && { updateURL:   pkg.userScript.updateURL }),
});


// ============================================================================
// MODULE LOADER
// ----------------------------------------------------------------------------
// Recursively reads source files starting from the entry, resolving every
// `import` statement to an absolute path and registering each file as a module
// in the `modules` map. .html / .css files are stored as string content; .js
// files keep their raw source for later transformation.
// ============================================================================

const modules = new Map(); // id -> { id, abs, type, source|content, deps }

const moduleId = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');

/** Resolves an import specifier to an absolute file path. Tries the literal path, then `.js`/`.mjs` extensions, then `<dir>/index.js` for directory imports. */
function resolveSpec(spec, fromAbs) {
  const fromDir = path.dirname(fromAbs);
  const abs = path.resolve(fromDir, spec);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  for (const ext of ['.js', '.mjs']) {
    if (fs.existsSync(abs + ext)) return abs + ext;
  }
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    const idx = path.join(abs, 'index.js');
    if (fs.existsSync(idx)) return idx;
  }
  throw new Error(`Cannot resolve "${spec}" from ${fromAbs}`);
}

/** Strips redundant whitespace from a CSS string (blank lines, post-`{` indent, post-`;` indent). */
function compactCss(code) {
  return code
    .replace(/^\s*\n/gm, '')
    .replace(/\{\n */g, '{ ')
    .replace(/;\n */g, '; ')
    .replace(/;\s(\/\*.+\*\/)\n/g, '; $1 ');
}

/** Reads a source file and registers it in the `modules` map, recursing into every imported dependency. Returns the module record. */
function loadModule(abs) {
  const id = moduleId(abs);
  if (modules.has(id)) return modules.get(id);

  const ext = path.extname(abs);
  const raw = fs.readFileSync(abs, 'utf8');

  if (ext === '.html' || ext === '.css') {
    const content = ext === '.css' ? compactCss(raw) : raw;
    const mod = { id, abs, type: 'string', content, deps: [] };
    modules.set(id, mod);
    return mod;
  }

  const mod = { id, abs, type: 'js', source: raw, deps: [] };
  modules.set(id, mod);

  // Collect every import — handles single-line and multi-line `from 'spec'` forms.
  const importRegex = /^\s*import\b[\s\S]*?from\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
  let m;
  while ((m = importRegex.exec(raw)) !== null) {
    const spec = m[1];
    const depAbs = resolveSpec(spec, abs);
    mod.deps.push({ spec, id: moduleId(depAbs) });
    loadModule(depAbs);
  }

  return mod;
}


// ============================================================================
// JS TRANSFORMATION
// ----------------------------------------------------------------------------
// Rewrites ESM `import` and `export` statements into CommonJS-style calls
// against the runtime's `__require()` / `__exports` shims, so each module can
// run inside an IIFE without the ESM module system.
// ============================================================================

/** Parses one named-import fragment ("a" or "a as b") into an object-destructuring fragment ("a" or "a: b"). */
function parseNamed(s) {
  s = s.trim();
  if (!s) return '';
  const parts = s.split(/\s+as\s+/);
  return parts.length === 2 ? `${parts[0].trim()}: ${parts[1].trim()}` : parts[0];
}

/** Rewrites a JS module's source — turns every `import` into a `__require()` call and every `export` into an `__exports.X = X` assignment. Returns the transformed source. */
function transformJs(mod) {
  let src = mod.source;

  // Map import specifier strings → resolved module IDs for this file.
  const specToId = Object.fromEntries(mod.deps.map(d => [d.spec, d.id]));
  const reqExpr = (spec) => `__require(${JSON.stringify(specToId[spec])})`;

  // ---- Imports ----

  // import X, { a, b } from 'spec';   (mixed default + named)
  src = src.replace(
    /^\s*import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (_, defName, names, spec) => {
      const list = names.split(',').map(parseNamed).filter(Boolean).join(', ');
      return `const __m_${defName} = ${reqExpr(spec)}; const ${defName} = __m_${defName}.default; const { ${list} } = __m_${defName};`;
    }
  );

  // import { a, b as c, ... } from 'spec';   (multi-line braces allowed)
  src = src.replace(
    /^\s*import\s*\{\s*([\s\S]*?)\s*\}\s*from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (_, names, spec) => {
      const list = names.split(',').map(parseNamed).filter(Boolean).join(', ');
      return `const { ${list} } = ${reqExpr(spec)};`;
    }
  );

  // import X from 'spec';
  src = src.replace(
    /^\s*import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (_, name, spec) => `const ${name} = ${reqExpr(spec)}.default;`
  );

  // import 'spec';   (side-effect)
  src = src.replace(
    /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (_, spec) => `${reqExpr(spec)};`
  );

  // ---- Exports ----
  const exports = []; // { name, isDefault }

  // export default class X / function X
  src = src.replace(
    /^export\s+default\s+(class|function\*?|async\s+function\*?)\s+(\w+)/gm,
    (_, kind, name) => { exports.push({ name, isDefault: true }); return `${kind} ${name}`; }
  );

  // export default <identifier>;     — single-line bare identifier
  src = src.replace(
    /^export\s+default\s+(\w+)\s*;?\s*$/gm,
    (_, name) => { exports.push({ name, isDefault: true }); return ''; }
  );

  // export const|let|var X = ...
  src = src.replace(
    /^export\s+(const|let|var)\s+(\w+)/gm,
    (_, kind, name) => { exports.push({ name, isDefault: false }); return `${kind} ${name}`; }
  );

  // export function X / async function X
  src = src.replace(
    /^export\s+(async\s+)?function(\*?)\s+(\w+)/gm,
    (_, asyncKw, gen, name) => {
      exports.push({ name, isDefault: false });
      return `${asyncKw || ''}function${gen} ${name}`;
    }
  );

  // export class X
  src = src.replace(
    /^export\s+class\s+(\w+)/gm,
    (_, name) => { exports.push({ name, isDefault: false }); return `class ${name}`; }
  );

  const tail = exports
    .map(({ name, isDefault }) => `__exports.${isDefault ? 'default' : name} = ${name};`)
    .join('\n');

  return tail ? `${src}\n${tail}` : src;
}


// ============================================================================
// TOPOLOGICAL SORT
// ----------------------------------------------------------------------------
// Orders modules so each one is emitted after its dependencies.
// ============================================================================

/** Returns module IDs in dependency order — every module appears after its deps. */
function topoSort(rootId) {
  const visited = new Set();
  const order = [];
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const d of modules.get(id).deps) visit(d.id);
    order.push(id);
  }
  visit(rootId);
  return order;
}


// ============================================================================
// EMIT
// ----------------------------------------------------------------------------
// Wraps each module in an IIFE registered in the `__modules` cache, then
// concatenates them inside the runtime shim and prepends the banner.
// ============================================================================

/** Indents every line of `s` by the given prefix. */
const indent = (s, by = '  ') => s.split('\n').map(l => by + l).join('\n');

/** Wraps a module into the `__modules[id] = (__exports) => { ... }` registration form expected by the runtime shim. */
function emitModule(mod) {
  if (mod.type === 'string') {
    return `__modules[${JSON.stringify(mod.id)}] = (__exports) => {\n  __exports.default = ${JSON.stringify(mod.content)};\n};`;
  }
  return `__modules[${JSON.stringify(mod.id)}] = (__exports) => {\n${indent(transformJs(mod))}\n};`;
}

const RUNTIME = `const __modules = {};
const __cache = {};
function __require(id) {
  if (id in __cache) return __cache[id];
  const exports = {};
  __cache[id] = exports;        // cache before exec to handle cycles
  __modules[id](exports);
  return exports;
}`;


// ============================================================================
// BUILD
// ----------------------------------------------------------------------------

loadModule(ENTRY);
const entryId = moduleId(ENTRY);
const order = topoSort(entryId);
const decls = order.map(id => emitModule(modules.get(id))).join('\n\n');

const output = `${BANNER}(function () {
'use strict';

${RUNTIME}

${decls}

__require(${JSON.stringify(entryId)});
})();
`;

fs.writeFileSync(OUT, output, 'utf8');
console.log(`built ${path.relative(ROOT, OUT)} — ${(output.length / 1024).toFixed(1)} KB, ${modules.size} modules`);
