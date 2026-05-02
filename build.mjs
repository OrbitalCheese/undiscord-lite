// Tiny bundler — replaces rollup. Zero npm dependencies.
//
// What it does:
//  1. Walks ESM imports starting from src/index.js
//  2. Inlines .html / .css imports as string defaults
//  3. Compacts CSS
//  4. Wraps each module in a small IIFE registered in a runtime cache
//  5. Concatenates in topological order, prepends the userscript banner
//
// Limitations (not present in this codebase, but worth knowing):
//  - No dynamic imports
//  - No re-exports (`export { x } from './y'`)
//  - No namespace imports (`import * as ns from ...`)
//  - Top-level `export` keyword must be at column 0 of the line

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(ROOT, 'src', 'index.js');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const OUT = path.join(ROOT, pkg.main);

// ---------- Banner ----------
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
  // Optional banner fields. Each is included only if present in package.json
  // so the rendered metadata stays minimal when a field isn't configured.
  //   author / license      — shown by Tampermonkey and required by Greasy Fork
  //   homepageURL / supportURL — shown in the Tampermonkey install prompt
  //   downloadURL / updateURL  — Tampermonkey checks these for new versions
  ...(pkg.userScript.author      && { author:      pkg.userScript.author }),
  ...(pkg.userScript.license     && { license:     pkg.userScript.license }),
  ...(pkg.userScript.homepageURL && { homepageURL: pkg.userScript.homepageURL }),
  ...(pkg.userScript.supportURL  && { supportURL:  pkg.userScript.supportURL }),
  ...(pkg.userScript.downloadURL && { downloadURL: pkg.userScript.downloadURL }),
  ...(pkg.userScript.updateURL   && { updateURL:   pkg.userScript.updateURL }),
});

// ---------- Module loader ----------
const modules = new Map(); // id -> { id, abs, type, source|content, deps }

const moduleId = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');

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

function compactCss(code) {
  return code
    .replace(/^\s*\n/gm, '')
    .replace(/\{\n */g, '{ ')
    .replace(/;\n */g, '; ')
    .replace(/;\s(\/\*.+\*\/)\n/g, '; $1 ');
}

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

// ---------- JS transformation ----------
function parseNamed(s) {
  s = s.trim();
  if (!s) return '';
  const parts = s.split(/\s+as\s+/);
  return parts.length === 2 ? `${parts[0].trim()}: ${parts[1].trim()}` : parts[0];
}

function transformJs(mod) {
  let src = mod.source;

  // Map import specifier strings → resolved module IDs for this file
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

// ---------- Topological sort ----------
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

// ---------- Emit ----------
const indent = (s, by = '  ') => s.split('\n').map(l => by + l).join('\n');

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

// ---------- Build ----------
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
