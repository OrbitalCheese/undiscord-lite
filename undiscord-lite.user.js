// ==UserScript==
// @name        Undiscord Lite
// @description Bulk-delete Discord messages. Zero-dependency personal fork of Undiscord with multi-server batching.
// @version     1.0.0
// @namespace   https://github.com/OrbitalCheese/undiscord-lite
// @match       https://*.discord.com/app
// @match       https://*.discord.com/channels/*
// @grant       none
// @downloadURL https://raw.githubusercontent.com/OrbitalCheese/undiscord-lite/master/undiscord-lite.user.js
// @updateURL   https://raw.githubusercontent.com/OrbitalCheese/undiscord-lite/master/undiscord-lite.user.js
// ==/UserScript==
(function () {
'use strict';

const __modules = {};
const __cache = {};
function __require(id) {
  if (id in __cache) return __cache[id];
  const exports = {};
  __cache[id] = exports;        // cache before exec to handle cycles
  __modules[id](exports);
  return exports;
}

__modules["src/ui/styles.css"] = (__exports) => {
  __exports.default = "/* ----------------------------------------------------------------\n * Dark-mode fallback palette.\n * Each --_u-* var resolves to Discord's CSS variable when present,\n * and to a hand-picked dark color when Discord renames or removes it.\n * ---------------------------------------------------------------- */\n#undiscord { --_u-bg-panel:        var(--background-secondary, #2b2d31); --_u-bg-header:       var(--background-tertiary, #1e1f22); --_u-bg-sidebar:      var(--bg-overlay-4, var(--background-base-lowest, #1e1f22)); --_u-bg-main:         var(--bg-overlay-chat, var(--background-base-lower, #313338)); --_u-bg-toolbar:      var(--bg-overlay-2, var(--__header-bar-background, #2b2d31)); --_u-bg-input:        var(--input-background, #1e1f22); --_u-bg-floating:     var(--background-floating, #111214); --_u-bg-hover:        var(--background-modifier-hover, #35373c); --_u-bg-accent:       var(--background-modifier-accent, #3f4147); --_u-bg-surface-high: var(--background-surface-high, #2b2d31); --_u-text:        var(--text-normal, var(--text-default, #dbdee1)); --_u-text-muted:  var(--text-muted, #949ba4); --_u-text-header: var(--header-primary, #f2f3f5); --_u-text-label:  var(--header-secondary, #b5bac1); --_u-text-link:   var(--text-link, #00a8fc); --_u-int:        var(--interactive-normal, #b5bac1); --_u-int-hover:  var(--interactive-hover, #dbdee1); --_u-int-active: var(--interactive-active, #ffffff); --_u-int-muted:  var(--interactive-muted, #6d6f78); --_u-btn-secondary: var(--button-secondary-background, #4e5058); --_u-btn-danger:    var(--button-danger-background, #da373c); --_u-border:       var(--border-subtle, rgba(78, 80, 88, 0.48)); --_u-input-border: var(--input-border, #1e1f22); --_u-scrollbar-thumb: var(--scrollbar-thin-thumb, rgba(24, 25, 28, 0.6)); --_u-scrollbar-track: var(--scrollbar-thin-track, transparent); --_u-shadow:        var(--elevation-high, 0 8px 16px rgba(0, 0, 0, 0.24)); --_u-shadow-stroke: var(--elevation-stroke, 0 0 0 1px rgba(0, 0, 0, 0.2)); --_u-font-display:  var(--font-display, 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif); }\n/* undiscord window */\n#undiscord.browser { box-shadow: var(--_u-shadow-stroke), var(--_u-shadow); border: 1px solid var(--_u-border); overflow: hidden; }\n#undiscord.container,\n#undiscord .container { background-color: var(--_u-bg-surface-high); border-radius: 8px; box-sizing: border-box; cursor: default; flex-direction: column; }\n#undiscord .header { background-color: var(--_u-bg-header); height: 48px; align-items: center; min-height: 48px; padding: 0 16px; display: flex; color: var(--_u-text-label); }\n#undiscord .header .icon { color: var(--_u-int); margin-right: 8px; flex-shrink: 0; width: 24; height: 24; }\n#undiscord .header .icon:hover { color: var(--_u-int-hover); }\n#undiscord .header h3 { font-size: 16px; line-height: 20px; font-weight: 500; font-family: var(--_u-font-display); color: var(--_u-text-header); flex-shrink: 0; margin-right: 16px; }\n#undiscord .spacer { flex-grow: 1; }\n#undiscord .header .vert-divider { width: 1px; height: 24px; background-color: var(--_u-bg-accent); margin-right: 16px; flex-shrink: 0; }\n#undiscord legend,\n#undiscord label { color: var(--_u-text-label); font-size: 12px; line-height: 16px; font-weight: 500; text-transform: uppercase; cursor: default; font-family: var(--_u-font-display); margin-bottom: 8px; }\n#undiscord .multiInput { display: flex; align-items: center; font-size: 16px; box-sizing: border-box; width: 100%; border-radius: 3px; color: var(--_u-text); background-color: var(--_u-bg-input); border: none; transition: border-color 0.2s ease-in-out 0s; }\n#undiscord .multiInput :first-child { flex-grow: 1; }\n#undiscord .multiInput button:last-child { margin-right: 4px; }\n#undiscord .multiInput button + button { margin-left: 3px; }\n#undiscord .input-actions { display: flex; gap: 4px; margin-top: 6px; }\n#undiscord .input-actions button { flex: 1; /* Tighter horizontal padding than the base 16px so longer labels (Select, Delete) fit. */     padding: 2px 6px; }\n/* Action button accents — set: tinge-darker gray, add: muted forest green, del: bordeaux. */\n#undiscord .input-actions button[id^=\"set\"]    { background-color: #3f4147; }\n#undiscord .input-actions button[id^=\"add\"]    { background-color: #3a7d4d; }\n#undiscord .input-actions button[id^=\"del\"]    { background-color: #722f37; }\n/* Select buttons: blue when idle, amber while waiting for a click, light purple\n   while waiting AND Shift is held (shift-lock — multi-capture mode). */\n#undiscord .input-actions button[id^=\"select\"]                       { background-color: #2c5d8e; }\n#undiscord .input-actions button[id^=\"select\"].active                { background-color: #b8860b; }\n#undiscord .input-actions button[id^=\"select\"].active.shift-locked   { background-color: #a78bfa; }\n/* Global crosshair cursor while any Select button is armed. */\nbody.undiscord-selecting,\nbody.undiscord-selecting * { cursor: crosshair !important; }\n/* Inline Clear buttons — sit absolutely on the right edge of any text-input\n   wrapper. The .clearable class on the input adds matching right padding so\n   typed text doesn't slide under the button. */\n#undiscord .input-wrapper { position: relative; }\n#undiscord input.clearable { padding-right: 60px; }\n#undiscord button.clear-btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: auto; min-width: 0; height: 28px; min-height: 28px; padding: 0 10px; font-size: 11px; font-weight: 500; background-color: #4e5058; color: var(--_u-text); border-radius: 4px; cursor: pointer; z-index: 1; }\n/* Date-preset shortcuts — green/amber/red traffic-light scaling with scope. */\n#undiscord .date-preset-day  { background-color: #3a7d4d; }\n#undiscord .date-preset-week { background-color: #b8860b; }\n#undiscord .date-preset-all  { background-color: #722f37; }\n/* Stepper rows for the delay controls. Compact buttons next to a read-only display. */\n#undiscord .stepper { display: flex; align-items: center; gap: 4px; margin-top: 6px; }\n/* Input takes a fixed ~100px (~20% narrower than before), text left-aligned so\n   short values don't drift around. The freed horizontal space goes to the\n   stepper buttons (flex: 1) which grow to fill it equally. The input is\n   editable — users can type a value directly and it auto-clamps on commit. */\n#undiscord .stepper input[type=\"text\"] { flex: 0 0 100px; text-align: left; cursor: text; }\n#undiscord .stepper button { flex: 1; width: auto; min-width: 32px; padding: 0; font-weight: 700; }\n#undiscord .stepper-down { background-color: #722f37; }\n#undiscord .stepper-up { background-color: #3a7d4d; }\n#undiscord .stepper-reset { background-color: #2c5d8e; }\n/* Compact help button — pinned to the top-right of its fieldset (sibling of the\n   legend, since <legend> rendering doesn't reliably honor display:flex). The\n   right edge sits flush with the input/control edges below it. */\n#undiscord fieldset { position: relative; }\n#undiscord button.help-btn { position: absolute; top: -23px; right: 0; width: auto; min-width: 0; height: 16px; min-height: 16px; padding: 0 6px; font-size: 10px; font-weight: 500; text-transform: uppercase; border: none; border-radius: 3px; background-color: #2c5d8e; color: #ffffff; cursor: pointer; }\n/* Tab-level help button: vertically centered inside the <summary>, right-aligned. */\n#undiscord summary button.help-btn { top: 50%; right: 8px; transform: translateY(-50%); }\n/* Has-type checkbox grid — 2 per row inside the Include filter. */\n#undiscord .has-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 12px; }\n#undiscord .has-grid label { display: flex; align-items: center; margin-bottom: 0; text-transform: none; cursor: pointer; }\n#undiscord .has-grid input[type=\"checkbox\"] { margin-right: 6px; }\n/* Select dropdown styling — match the dark panel. */\n#undiscord select { background-color: var(--_u-bg-input); color: var(--_u-text); border: 1px solid var(--_u-input-border); border-radius: 4px; padding: 4px 6px; font-family: var(--_u-font-display); font-size: 14px; cursor: pointer; }\n/* Pill-style on/off toggle. Replaces every native checkbox visual inside the panel:\n   red when off, green when on. The .has-grid override below tightens margin in\n   the dense 2-column grids. */\n#undiscord input[type=\"checkbox\"] { appearance: none; -webkit-appearance: none; position: relative; width: 36px; height: 18px; margin: 0 8px 0 0; padding: 0; border: none; border-radius: 9px; background-color: #722f37; cursor: pointer; transition: background-color 0.2s ease; vertical-align: middle; flex-shrink: 0; }\n#undiscord input[type=\"checkbox\"]::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background-color: #ffffff; transition: transform 0.2s ease; }\n#undiscord input[type=\"checkbox\"]:checked { background-color: #3a7d4d; }\n#undiscord input[type=\"checkbox\"]:checked::after { transform: translateX(18px); }\n#undiscord .sectionDescription.tips > div { padding-left: 0.9em; text-indent: -0.9em; margin-bottom: 3px; }\n#undiscord #queueCounter { display: grid; grid-template-columns: max-content max-content; column-gap: 14px; row-gap: 2px; margin: 8px 0 12px; padding: 6px 10px; border-radius: 4px; background: var(--_u-bg-input); color: var(--_u-text); font-family: Consolas, Liberation Mono, Menlo, Courier, monospace; font-size: 12px; }\n#undiscord #queueCounter:empty { margin: 0; padding: 0; background: none; }\n#undiscord #queueCounter .qc-orphan { color: var(--_u-btn-danger, #da373c); }\n#undiscord .input { font-size: 16px; width: 100%; transition: border-color 0.2s ease-in-out 0s; padding: 10px; height: 44px; background-color: var(--_u-bg-input); border: 1px solid var(--_u-input-border); border-radius: 8px; box-sizing: border-box; color: var(--_u-text); }\n#undiscord fieldset { margin-top: 16px; }\n#undiscord .input-wrapper { display: flex; align-items: center; font-size: 16px; box-sizing: border-box; width: 100%; border-radius: 3px; color: var(--_u-text); background-color: var(--_u-bg-input); border: none; transition: border-color 0.2s ease-in-out 0s; }\n#undiscord input[type=\"text\"],\n#undiscord input[type=\"search\"],\n#undiscord input[type=\"password\"],\n#undiscord input[type=\"datetime-local\"],\n#undiscord input[type=\"number\"],\n#undiscord input[type=\"range\"] { background-color: var(--_u-bg-input); border: 1px solid var(--_u-input-border); border-radius: 8px; box-sizing: border-box; color: var(--_u-text); font-size: 16px; height: 44px; padding: 12px 10px; transition: border-color .2s ease-in-out; width: 100%; }\n#undiscord input[type=\"file\"] { color: var(--_u-text); }\n#undiscord hr { border: none; margin-bottom: 24px; padding-bottom: 4px; border-bottom: 1px solid var(--_u-bg-accent); }\n#undiscord .sectionDescription { margin-bottom: 16px; color: var(--_u-text-label); font-size: 14px; line-height: 20px; font-weight: 400; }\n#undiscord a { color: var(--_u-text-link); text-decoration: none; }\n#undiscord a:hover { text-decoration: underline; }\n#undiscord .btn,\n#undiscord button { position: relative; display: flex; -webkit-box-pack: center; justify-content: center; -webkit-box-align: center; align-items: center; box-sizing: border-box; background: none; border: none; border-radius: 3px; font-size: 14px; font-weight: 500; line-height: 16px; padding: 2px 16px; user-select: none; cursor: pointer; /* sizeSmall */     width: 60px; height: 32px; min-width: 60px; min-height: 32px; /* lookFilled colorPrimary */     color: #ffffff; background-color: var(--_u-btn-secondary); transition: background-color 0.15s ease, filter 0.15s ease; }\n#undiscord .btn:hover,\n#undiscord button:hover { filter: brightness(1.15); }\n#undiscord button:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }\n#undiscord .sizeMedium { width: 96px; height: 38px; min-width: 96px; min-height: 38px; }\n#undiscord .sizeMedium.icon { width: 38px; min-width: 38px; }\n#undiscord sup { vertical-align: top; }\n#undiscord .danger { background-color: var(--_u-btn-danger); }\n/* Scrollbar */\n#undiscord .scroll::-webkit-scrollbar { width: 8px; height: 8px; }\n#undiscord .scroll::-webkit-scrollbar-corner { background-color: transparent; }\n#undiscord .scroll::-webkit-scrollbar-thumb { background-clip: padding-box; border: 2px solid transparent; border-radius: 4px; background-color: var(--_u-scrollbar-thumb); min-height: 40px; }\n#undiscord .scroll::-webkit-scrollbar-track { border-color: var(--_u-scrollbar-track); background-color: var(--_u-scrollbar-track); border: 2px solid var(--_u-scrollbar-track); }\n/* fade scrollbar */\n#undiscord .scroll::-webkit-scrollbar-thumb,\n#undiscord .scroll::-webkit-scrollbar-track { visibility: hidden; }\n#undiscord .scroll:hover::-webkit-scrollbar-thumb,\n#undiscord .scroll:hover::-webkit-scrollbar-track { visibility: visible; }\n#undiscord :disabled { display: none; }\n/**** layout and utility classes ****/\n#undiscord,\n#undiscord * { box-sizing: border-box; }\n#undiscord .col { display: flex; flex-direction: column; }\n#undiscord .row { display: flex; flex-direction: row; align-items: center; }\n#undiscord .mb1 { margin-bottom: 8px; }\n#undiscord .log { margin-bottom: 0.25em; }\n#undiscord .log-debug { color: var(--_u-text); }\n#undiscord .log-info { color: #00b0f4; }\n#undiscord .log-verb { color: var(--_u-text-muted); }\n#undiscord .log-warn { color: #faa61a; }\n#undiscord .log-error { color: #f04747; }\n#undiscord .log-success { color: #43b581; }\n/**** Undiscord Button (FAB) ****/\n#undiscord-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--background-floating, #18191c); color: var(--interactive-normal); border-radius: 50%; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); cursor: pointer; transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease; }\n#undiscord-btn:hover { color: var(--interactive-active); background: var(--background-modifier-hover, #2e3035); transform: scale(1.05); }\n#undiscord-btn:focus-visible { outline: 2px solid var(--brand-experiment, #5865f2); outline-offset: 2px; }\n#undiscord-btn progress { position: absolute; bottom: 4px; left: 8px; width: 32px; height: 4px; display: none; }\n#undiscord-btn.running { color: var(--button-danger-background) !important; }\n#undiscord-btn.running progress { display: block; }\n/**** Undiscord Interface ****/\n#undiscord { position: fixed; z-index: 100; top: 58px; right: 10px; display: flex; flex-direction: column; width: 800px; height: 80vh; min-width: 610px; max-width: 100vw; min-height: 448px; max-height: 100vh; color: var(--_u-text); border-radius: 4px; background-color: var(--_u-bg-panel); box-shadow: var(--_u-shadow-stroke), var(--_u-shadow); will-change: top, left, width, height; }\n#undiscord .header .icon { cursor: pointer; }\n#undiscord .window-body { height: calc(100% - 48px); }\n#undiscord .sidebar { /* Always reserve scrollbar space — overflow-y: scroll keeps the gutter\n       even when content fits, so right-aligned elements don't shift when the\n       sidebar starts overflowing. Fade-on-hover .scroll rules still hide the\n       bar visually until mouseover. */\n    overflow-x: hidden; overflow-y: scroll; /* flex-shrink: 0 locks the sidebar at its target width regardless of what\n       .main wants — without it, log content growing inside .main pulls space\n       from the sidebar via the flex layout, shifting everything in here. */\n    width: 270px; flex-shrink: 0; height: 100%; max-height: 100%; padding: 8px; background: var(--_u-bg-sidebar); }\n#undiscord .sidebar legend,\n#undiscord .sidebar label { display: block; width: 100%; }\n#undiscord .main { display: flex; max-width: calc(100% - 250px); background-color: var(--_u-bg-main); flex-grow: 1; }\n#undiscord #logArea { font-family: Consolas, Liberation Mono, Menlo, Courier, monospace; font-size: 0.75rem; overflow: auto; padding: 10px; user-select: text; flex-grow: 1; cursor: auto; /* Wrap long lines at the panel's right edge instead of overflowing horizontally.\n       pre-wrap preserves intentional whitespace; overflow-wrap breaks unbroken\n       strings (URLs, snowflakes) when no whitespace is available to wrap on. */\n    white-space: pre-wrap; overflow-wrap: break-word; }\n#undiscord .tbar { padding: 8px; background-color: var(--_u-bg-toolbar); }\n#undiscord .tbar button { margin-right: 4px; margin-bottom: 4px; }\n#undiscord .footer #progressPercent { padding: 0 1em; font-size: small; color: var(--_u-text-muted); flex-grow: 1; }\n/**** Elements ****/\n#undiscord summary { font-size: 16px; font-weight: 500; line-height: 20px; position: relative; overflow: hidden; margin-bottom: 2px; padding: 6px 10px; cursor: pointer; white-space: nowrap; text-overflow: ellipsis; color: var(--_u-int); border-radius: 4px; flex-shrink: 0; }\n#undiscord summary:hover { color: var(--_u-int-hover); background-color: var(--_u-bg-hover); }\n#undiscord fieldset { padding-left: 8px; }\n#undiscord legend a { float: right; text-transform: initial; }\n#undiscord progress { height: 8px; margin-top: 4px; flex-grow: 1; }\n#undiscord .importJson { display: flex; flex-direction: row; }\n#undiscord .importJson button { margin-left: 5px; width: fit-content; }\n/**** Drag/resize handles ****/\n[name^=\"grab-\"] { position: absolute; --size: 6px; --corner-size: 16px; --offset: -1px; z-index: 9; }\n[name^=\"grab-\"]:hover { background: rgba(128, 128, 128, 0.1); }\n[name=\"grab-t\"] { top: 0; left: var(--corner-size); right: var(--corner-size); height: var(--size); margin-top: var(--offset); cursor: ns-resize; }\n[name=\"grab-r\"] { top: var(--corner-size); bottom: var(--corner-size); right: 0; width: var(--size); margin-right: var(--offset); cursor: ew-resize; }\n[name=\"grab-b\"] { bottom: 0; left: var(--corner-size); right: var(--corner-size); height: var(--size); margin-bottom: var(--offset); cursor: ns-resize; }\n[name=\"grab-l\"] { top: var(--corner-size); bottom: var(--corner-size); left: 0; width: var(--size); margin-left: var(--offset); cursor: ew-resize; }\n[name=\"grab-tl\"] { top: 0; left: 0; width: var(--corner-size); height: var(--corner-size); margin-top: var(--offset); margin-left: var(--offset); cursor: nwse-resize; }\n[name=\"grab-tr\"] { top: 0; right: 0; width: var(--corner-size); height: var(--corner-size); margin-top: var(--offset); margin-right: var(--offset); cursor: nesw-resize; }\n[name=\"grab-br\"] { bottom: 0; right: 0; width: var(--corner-size); height: var(--corner-size); margin-bottom: var(--offset); margin-right: var(--offset); cursor: nwse-resize; }\n[name=\"grab-bl\"] { bottom: 0; left: 0; width: var(--corner-size); height: var(--corner-size); margin-bottom: var(--offset); margin-left: var(--offset); cursor: nesw-resize; }\n/**** Decorative resize indicator + cursor hints ****/\n#undiscord .header { cursor: grab; }\n#undiscord .footer { cursor: se-resize; padding-right: 30px; }\n.resize-handle { position: absolute; bottom: -15px; right: -15px; width: 30px; height: 30px; transform: rotate(-45deg); background: repeating-linear-gradient(0, var(--_u-bg-accent, #3f4147), var(--_u-bg-accent, #3f4147) 1px, transparent 2px, transparent 4px); cursor: nwse-resize; }\n/* ----------------------------------------------------------------\n * Server-bar trash icon — injected into Discord's left rail between\n * the DM/Home separator and the first server. Mimics Discord's server\n * icon shape-morph: circle at rest, rounded square on hover/active.\n * Lives outside #undiscord, so selectors are global.\n * ---------------------------------------------------------------- */\n#undiscord-server-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; cursor: pointer; position: relative; user-select: none; }\n#undiscord-server-btn .udl-blob { width: 40px; height: 40px; border-radius: 50%; background-color: var(--background-floating, #1e1f22); color: var(--interactive-normal, #b5bac1); display: flex; align-items: center; justify-content: center; position: relative; transition: border-radius 0.15s ease, background-color 0.15s ease, color 0.15s ease; }\n#undiscord-server-btn:hover .udl-blob { border-radius: 16px; background-color: var(--button-danger-background, #da373c); color: #ffffff; }\n#undiscord-server-btn.running .udl-blob { border-radius: 16px; background-color: var(--button-danger-background, #da373c); color: #ffffff; }\n#undiscord-server-btn .udl-progress { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 28px; height: 4px; display: none; }\n#undiscord-server-btn.running .udl-progress { display: block; }\n/* Stoplight-amber progress on white track — grows as deletes complete, contrasts\n   cleanly against the red running-state blob. */\n#undiscord-server-btn .udl-progress::-webkit-progress-bar { background-color: #ffffff; border-radius: 2px; }\n#undiscord-server-btn .udl-progress::-webkit-progress-value { background-color: #b8860b; border-radius: 2px; transition: width 0.2s ease; }\n#undiscord-server-btn .udl-progress::-moz-progress-bar { background-color: #b8860b; border-radius: 2px; }\n";
};

__modules["src/ui/undiscord.html"] = (__exports) => {
  __exports.default = "<div id=\"undiscord\" class=\"browser container\" style=\"display:none;\">\n    <div class=\"header\">\n        <svg class=\"icon\" aria-hidden=\"false\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n            <path fill=\"currentColor\" d=\"M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z\"></path>\n            <path fill=\"currentColor\"\n                d=\"M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z\">\n            </path>\n        </svg>\n        <h3>Undiscord Lite</h3>\n        <div class=\"vert-divider\"></div>\n        <span> Bulk delete messages</span>\n        <div class=\"spacer\"></div>\n        <div id=\"hide\" class=\"icon\" aria-label=\"Minimize\" role=\"button\" tabindex=\"0\" title=\"Minimize (run continues in background)\">\n            <svg aria-hidden=\"false\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n                <path fill=\"currentColor\" d=\"M5 18h14v3H5z\"></path>\n            </svg>\n        </div>\n    </div>\n    <div class=\"window-body\" style=\"display: flex; flex-direction: row;\">\n        <div class=\"sidebar scroll\">\n            <details open>\n                <summary>General<button class=\"help-btn\" data-help=\"tabGeneral\" title=\"Show help for the General tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Author ID</legend>\n                    <button class=\"help-btn\" data-help=\"authorId\" title=\"Show help for Author ID\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input clearable\" id=\"authorId\" type=\"text\">\n                        <button class=\"clear-btn\" id=\"clearAuthor\" title=\"Clear Author ID\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"getAuthor\">Me</button>\n                        <button id=\"selectAuthor\" title=\"Click, then click a user or message in Discord to capture their User ID. Hold Shift to capture multiple in a row.\">Select</button>\n                    </div>\n                    <div class=\"sectionDescription tips\" style=\"margin-top: 4px;\">\n                        <div>› TIP: Hold down Shift to select multiple things in a row!</div>\n                    </div>\n                </fieldset>\n                <hr>\n                <fieldset>\n                    <legend>Server ID</legend>\n                    <button class=\"help-btn\" data-help=\"serverId\" title=\"Show help for Server ID\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input clearable\" id=\"guildId\" type=\"text\">\n                        <button class=\"clear-btn\" id=\"clearGuild\" title=\"Clear Server (also clears Channel)\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectGuild\" title=\"Click, then click a server icon in Discord to capture its ID\">Select</button>\n                        <button id=\"addGuild\">Add</button>\n                        <button id=\"delGuild\">Delete</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Channel ID</legend>\n                    <button class=\"help-btn\" data-help=\"channelId\" title=\"Show help for Channel ID\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input clearable\" id=\"channelId\" type=\"text\">\n                        <button class=\"clear-btn\" id=\"clearChannel\" title=\"Clear Channel only\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectChannel\" title=\"Click, then click a channel or message in Discord to capture its ID\">Select</button>\n                        <button id=\"addChannel\">Add</button>\n                        <button id=\"delChannel\">Delete</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>DMs</legend>\n                    <button class=\"help-btn\" data-help=\"dms\" title=\"Show help for DMs\">Help</button>\n                    <div class=\"input-actions\">\n                        <button id=\"addAllDms\" title=\"Queue every DM channel currently open in your sidebar\">Add DM's</button>\n                        <button id=\"delAllDms\" title=\"Remove every queued DM channel from the queue\">Clear DM's</button>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 3px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\" title=\"Toggle whether group DMs are included in the bulk add\"><input id=\"includeGroupDms\" type=\"checkbox\"><span id=\"includeGroupDmsLabel\">Skipping all group DM's</span></label>\n                    </div>\n                </fieldset>\n                <div id=\"queueCounter\"></div>\n            </details>\n            <hr>\n            <details>\n                <summary>Search filter<button class=\"help-btn\" data-help=\"tabSearchFilter\" title=\"Show help for the Search filter tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Include text</legend>\n                    <button class=\"help-btn\" data-help=\"includeText\" title=\"Show help for Include text\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"search\" type=\"text\" placeholder=\"Containing text\">\n                        <button class=\"clear-btn\" id=\"clearSearch\" title=\"Clear Include text\">Clear</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Include attachment type</legend>\n                    <button class=\"help-btn\" data-help=\"includeAttachment\" title=\"Show help for Include attachment type\">Help</button>\n                    <div class=\"has-grid\">\n                        <label><input id=\"hasLink\"    type=\"checkbox\">Link</label>\n                        <label><input id=\"hasImage\"   type=\"checkbox\">Image</label>\n                        <label><input id=\"hasVideo\"   type=\"checkbox\">Video</label>\n                        <label><input id=\"hasSound\"   type=\"checkbox\">Sound</label>\n                        <label><input id=\"hasSticker\" type=\"checkbox\">Sticker</label>\n                        <label><input id=\"hasPoll\"    type=\"checkbox\">Poll</label>\n                        <label><input id=\"hasEmbed\"   type=\"checkbox\">Embed</label>\n                        <label><input id=\"hasForward\" type=\"checkbox\">Forward</label>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 8px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\">Pinned:&nbsp;\n                            <select id=\"pinnedMode\">\n                                <option value=\"exclude\" selected>exclude (skip)</option>\n                                <option value=\"include\">include</option>\n                                <option value=\"only\">only pinned</option>\n                            </select>\n                        </label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Include @user</legend>\n                    <button class=\"help-btn\" data-help=\"includeUser\" title=\"Show help for Include @user\">Help</button>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"mentionEveryone\" type=\"checkbox\">Include @everyone / @here</label>\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"mentionsId\" type=\"text\" placeholder=\"Mentions user ID\">\n                        <button class=\"clear-btn\" id=\"clearMentions\" title=\"Clear Mentions user IDs\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectMentions\" title=\"Click, then click a user or message in Discord to capture their User ID\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Delete filter<button class=\"help-btn\" data-help=\"tabDeleteFilter\" title=\"Show help for the Delete filter tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Skip text</legend>\n                    <button class=\"help-btn\" data-help=\"excludeText\" title=\"Show help for Skip text\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"excludeSearch\" type=\"text\" placeholder=\"Skip messages containing\">\n                        <button class=\"clear-btn\" id=\"clearExcludeSearch\" title=\"Clear Exclude text\">Clear</button>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 6px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\" title=\"Substring: term appears anywhere in the message. Exact: term must appear as a standalone word.\">Match:&nbsp;\n                            <input id=\"excludeMatchPill\" type=\"checkbox\" checked>\n                            <span id=\"excludeMatchLabel\">Substring</span>\n                        </label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Skip attachment type</legend>\n                    <button class=\"help-btn\" data-help=\"excludeAttachment\" title=\"Show help for Skip attachment type\">Help</button>\n                    <div class=\"has-grid\">\n                        <label><input id=\"excludeLink\"    type=\"checkbox\">Link</label>\n                        <label><input id=\"excludeImage\"   type=\"checkbox\">Image</label>\n                        <label><input id=\"excludeVideo\"   type=\"checkbox\">Video</label>\n                        <label><input id=\"excludeSound\"   type=\"checkbox\">Sound</label>\n                        <label><input id=\"excludeSticker\" type=\"checkbox\">Sticker</label>\n                        <label><input id=\"excludePoll\"    type=\"checkbox\">Poll</label>\n                        <label><input id=\"excludeEmbed\"   type=\"checkbox\">Embed</label>\n                        <label><input id=\"excludeForward\" type=\"checkbox\">Forward</label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Skip @user</legend>\n                    <button class=\"help-btn\" data-help=\"excludeUser\" title=\"Show help for Skip @user\">Help</button>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"excludeMentionEveryone\" type=\"checkbox\">skip @everyone / @here</label>\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"excludeMentionsId\" type=\"text\" placeholder=\"Mentions user ID\">\n                        <button class=\"clear-btn\" id=\"clearExcludeMentions\" title=\"Clear Exclude mentions user IDs\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectExcludeMentions\" title=\"Click, then click a user or message in Discord to capture their User ID\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Messages interval<button class=\"help-btn\" data-help=\"tabMessagesInterval\" title=\"Show help for the Messages interval tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Interval of messages</legend>\n                    <button class=\"help-btn\" data-help=\"messagesInterval\" title=\"Show help for Messages interval\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"minId\" type=\"text\" placeholder=\"After a message ID\">\n                        <button class=\"clear-btn\" id=\"clearMinId\" title=\"Clear After message ID\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\" style=\"margin-bottom: 5px;\">\n                        <button id=\"selectMinId\" title=\"Click, then click a message in Discord to capture its ID as the After bound\">Select</button>\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"maxId\" type=\"text\" placeholder=\"Before a message ID\">\n                        <button class=\"clear-btn\" id=\"clearMaxId\" title=\"Clear Before message ID\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectMaxId\" title=\"Click, then click a message in Discord to capture its ID as the Before bound\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Date interval<button class=\"help-btn\" data-help=\"tabDateInterval\" title=\"Show help for the Date interval tab\">Help</button></summary>\n                <fieldset>\n                    <legend>After date</legend>\n                    <button class=\"help-btn\" data-help=\"dateInterval\" title=\"Show help for Date interval\">Help</button>\n                    <div class=\"input-wrapper mb1\">\n                        <input id=\"minDate\" type=\"datetime-local\" value=\"2015-01-01T00:00\" title=\"Messages posted AFTER this date (defaults to Discord's launch — clear or change as needed)\">\n                    </div>\n                    <legend>Before date</legend>\n                    <div class=\"input-wrapper\">\n                        <input id=\"maxDate\" type=\"datetime-local\" title=\"Messages posted BEFORE this date\">\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"datePresetDay\"  class=\"date-preset-day\"  title=\"Now − 24 hours\">1 Day</button>\n                        <button id=\"datePresetWeek\" class=\"date-preset-week\" title=\"Now − 7 days\">1 Week</button>\n                        <button id=\"datePresetAll\"  class=\"date-preset-all\"  title=\"Reset After to 2015 and clear Before\">All</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Advanced settings<button class=\"help-btn\" data-help=\"tabAdvanced\" title=\"Show help for the Advanced settings tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Search delay (ms)</legend>\n                    <button class=\"help-btn\" data-help=\"searchDelay\" title=\"Show help for Search delay\">Help</button>\n                    <div class=\"stepper\">\n                        <input id=\"searchDelay\" type=\"text\" title=\"Click to type a value (auto-clamps to 15000–60000 ms)\">\n                        <button id=\"searchDelayDown\" class=\"stepper-down\" title=\"−500 ms\">&lt;</button>\n                        <button id=\"searchDelayReset\" class=\"stepper-reset\" title=\"Reset to default\">↺</button>\n                        <button id=\"searchDelayUp\" class=\"stepper-up\" title=\"+500 ms\">&gt;</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Delete delay (ms)</legend>\n                    <button class=\"help-btn\" data-help=\"deleteDelay\" title=\"Show help for Delete delay\">Help</button>\n                    <div class=\"stepper\">\n                        <input id=\"deleteDelay\" type=\"text\" title=\"Click to type a value (auto-clamps to 100–3000 ms)\">\n                        <button id=\"deleteDelayDown\" class=\"stepper-down\" title=\"−50 ms\">&lt;</button>\n                        <button id=\"deleteDelayReset\" class=\"stepper-reset\" title=\"Reset to default\">↺</button>\n                        <button id=\"deleteDelayUp\" class=\"stepper-up\" title=\"+50 ms\">&gt;</button>\n                    </div>\n                </fieldset>\n            </details>\n        </div>\n        <div class=\"main col\">\n            <div class=\"tbar col\">\n                <div class=\"row\">\n                    <button id=\"start\" class=\"sizeMedium danger\" style=\"width: 150px;\" title=\"Start the deletion process\">▶︎ Delete</button>\n                    <button id=\"stop\" class=\"sizeMedium\" title=\"Stop the deletion process\" disabled>🛑 Stop</button>\n                    <button id=\"clear\" class=\"sizeMedium\">Clear Log</button>\n                    <label class=\"row\" style=\"margin-left: 12px; margin-bottom: 0;\" title=\"Redact message content in the log preview\"><input id=\"streamerMode\" type=\"checkbox\" checked>Streamer mode</label>\n                </div>\n                <div class=\"row\">\n                    <progress id=\"progressBar\" style=\"display:none;\"></progress>\n                </div>\n            </div>\n            <pre id=\"logArea\" class=\"logarea scroll\"></pre>\n            <div class=\"tbar footer row\">\n                <div id=\"progressPercent\"></div>\n                <span class=\"spacer\"></span>\n                <label>\n                    <input id=\"autoScroll\" type=\"checkbox\" checked> Auto scroll\n                </label>\n                <div class=\"resize-handle\"></div>\n            </div>\n        </div>\n    </div>\n</div>\n";
};

__modules["src/helpers.js"] = (__exports) => {
  // ---------- General utilities ----------
  
  const msToHMS = s => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;
  const escapeHTML = html => String(html).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\'': '&#039;' })[m]);
  const queryString = params => params.filter(p => p[1] !== undefined).map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&');
  // 10ms setTimeout lets queued log writes paint before the blocking modal pops.
  const askYesNo = async msg => new Promise(resolve => setTimeout(() => resolve(window.confirm(msg)), 10));
  // Convert a datetime-local string ("YYYY-MM-DDTHH:MM") to a Discord snowflake.
  // Plain numeric strings pass through unchanged (already a snowflake).
  // Negative offsets get clamped to 0 because Discord rejects negative snowflakes,
  // and datetime-local is interpreted in the user's local timezone — eastern offsets
  // can place "2015-01-01T00:00" before Discord's UTC epoch.
  const toSnowflake = (date) => {
    if (!/:/.test(date)) return date;
    const offset = new Date(date).getTime() - 1420070400000;
    return Math.max(0, offset) * Math.pow(2, 22);
  };
  
  // ---------- DOM helpers ----------
  
  function createElm(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.removeChild(temp.firstElementChild);
  }
  
  function insertCss(css) {
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
    return style;
  }
  
  // ---------- Log facade ----------
  
  let logFn;
  const setLogFn = (fn) => logFn = fn;
  const log = {
    debug(...args)   { return logFn ? logFn('debug',   args) : console.debug(...args); },
    info(...args)    { return logFn ? logFn('info',    args) : console.info(...args); },
    verb(...args)    { return logFn ? logFn('verb',    args) : console.log(...args); },
    warn(...args)    { return logFn ? logFn('warn',    args) : console.warn(...args); },
    error(...args)   { return logFn ? logFn('error',   args) : console.error(...args); },
    success(...args) { return logFn ? logFn('success', args) : console.info(...args); },
  };
  
  // ---------- Discord ID / token extractors ----------
  
  // Discord blocks direct localStorage access from the page; an iframe inherits
  // the parent origin's storage and is the standard workaround.
  function withIframeLocalStorage(read) {
    const f = document.body.appendChild(document.createElement('iframe'));
    try { return read(f.contentWindow.localStorage); }
    finally { f.remove(); }
  }
  
  const CHANNEL_URL_RE = /channels\/([\w@]+)\/(\d+)/;
  
  // Reads the Discord auth token from the same localStorage entry Discord's own
  // client uses. The beforeunload dispatch nudges Discord to flush its in-memory
  // token cache to localStorage first; without it, a fresh tab may show an empty key.
  function getToken() {
    window.dispatchEvent(new Event('beforeunload'));
    return withIframeLocalStorage(ls => JSON.parse(ls.token));
  }
  
  function getAuthorId() {
    return withIframeLocalStorage(ls => JSON.parse(ls.user_id_cache));
  }
  
  function getGuildId() {
    const m = location.href.match(CHANNEL_URL_RE);
    if (m) return m[1];
    alert('Could not find the Guild ID!\nPlease make sure you are on a Server or DM.');
    return null;
  }
  
  function getChannelId() {
    const m = location.href.match(CHANNEL_URL_RE);
    if (m) return m[2];
    alert('Could not find the Channel ID!\nPlease make sure you are on a Channel or DM.');
    return null;
  }
  
  function fillToken() {
    try {
      return getToken();
    } catch (err) {
      log.verb(err);
      log.error('Could not automatically detect Authorization Token!');
      log.info('Please make sure Undiscord Lite is up to date');
    }
    return '';
  }
  
  __exports.msToHMS = msToHMS;
  __exports.escapeHTML = escapeHTML;
  __exports.queryString = queryString;
  __exports.askYesNo = askYesNo;
  __exports.toSnowflake = toSnowflake;
  __exports.setLogFn = setLogFn;
  __exports.log = log;
  __exports.createElm = createElm;
  __exports.insertCss = insertCss;
  __exports.getToken = getToken;
  __exports.getAuthorId = getAuthorId;
  __exports.getGuildId = getGuildId;
  __exports.getChannelId = getChannelId;
  __exports.fillToken = fillToken;
};

__modules["src/undiscord-core.js"] = (__exports) => {
  const { log, msToHMS, escapeHTML, queryString, askYesNo, toSnowflake } = __require("src/helpers.js");
  const API_BASE = 'https://discord.com/api/v9';
  const MAX_DELETE_ATTEMPTS = 2;     // Per-message retry on transient failures.
  const MAX_TRANSIENT_RETRIES = 3;   // Search-side retries for 5xx and network errors.
  
  // Human-readable labels for state.endReason — used in the failure-summary line
  // (the `else` branch in run()'s end-summary). 'completed' and 'no-matches' have
  // their own dedicated branches, so they're intentionally not in this map.
  const END_REASON_LABELS = {
    'empty-page-exhausted': 'Empty-page retry budget exhausted',
    'user-stopped': 'User cancelled',
    'user-declined': 'User declined the confirmation prompt',
    'auth-expired': 'Auth token expired',
    'fetch-error': 'Network or server error',
    'api-error': 'API rejected the request',
  };
  
  class UndiscordCore {
  
    // ---- Private state ----
    // run() bumps #runId on entry; each loop captures the value at start and bails
    // out if it ever differs — meaning a fresh run() has superseded this loop.
    #runId = 0;
    #waitAbort = null; // set while a #wait() is in flight; calling it resolves the wait early
    #beforeTs = 0;     // timestamp at request-send, used by afterRequest() for ping calc
  
    /** Cancellable sleep — stop() resolves this immediately so the loop checks state.running without delay. */
    #wait(ms) {
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          this.#waitAbort = null;
          resolve();
        }, ms);
        this.#waitAbort = () => {
          clearTimeout(t);
          this.#waitAbort = null;
          resolve();
        };
      });
    }
  
    // ---- Public configuration / state ----
    options = {
      authToken: null,
      authorId: null,
      guildId: null,
      channelId: null,
      minId: null,
      maxId: null,
      content: null,
      hasLink: null,    // server-side: has an auto-embedded link preview
      hasImage: null,   // server-side: has image attachment
      hasVideo: null,   // server-side: has video attachment
      hasSound: null,   // server-side: has audio attachment
      hasSticker: null, // server-side: has sticker
      hasPoll: null,    // server-side: has a poll
      hasEmbed: null,   // server-side: has any embed (broader than link — includes manual embeds)
      hasForward: null, // server-side: has a forwarded message snapshot
      mentions: null,         // server-side: filter to messages @mentioning this user ID
      mentionEveryone: null,  // server-side: filter to messages with @everyone / @here
      pinnedMode: 'exclude',  // 'exclude' | 'include' | 'only' — server-side pinned filter
      excludeContent: null, // post-search filter: drop messages containing this text
      excludeMatchMode: 'substring', // 'substring' (term appears anywhere) | 'exact' (term appears as a standalone word)
      excludeLink: null,    // post-search filter: drop messages with auto-link previews or URLs in content
      excludeImage: null,   // post-search filter: drop messages with image attachments
      excludeVideo: null,   // post-search filter: drop messages with video attachments
      excludeSound: null,   // post-search filter: drop messages with audio attachments
      excludeSticker: null, // post-search filter: drop messages with stickers
      excludePoll: null,    // post-search filter: drop messages with polls
      excludeEmbed: null,   // post-search filter: drop messages with any embed
      excludeForward: null, // post-search filter: drop forwarded messages
      excludeMentions: null,        // post-search filter: drop messages @mentioning ANY of these user IDs (comma-separated)
      excludeMentionEveryone: null, // post-search filter: drop messages with @everyone / @here
      searchDelay: null,
      deleteDelay: null,
      maxEmptyPageRetries: 5, // re-fetch this many times when grandTotal says more remain but the page is empty
      askForConfirmation: true,
      streamerMode: false, // redact message content in the confirmation preview and per-delete log
    };
  
    state = {
      running: false,
      delCount: 0,
      failCount: 0,
      grandTotal: 0,
      offset: 0,
      emptyPageRetry: 0,
      endReason: null, // 'completed' | 'empty-page-exhausted' | 'user-stopped' | 'user-declined' | 'auth-expired' | 'fetch-error' | 'api-error'
      _userDeleteDelay: 0, // baseline the user chose; options.deleteDelay decays back toward this after 429 bumps
      _userSearchDelay: 0, // baseline the user chose; options.searchDelay decays back toward this after 429 bumps
  
      _searchResponse: null,
      _messagesToDelete: [],
      _skippedMessages: [],
    };
  
    stats = {
      startTime: null,
      throttledCount: 0,
      throttledTotalTime: 0,
      lastPing: null,    // most recent request round-trip; status display only
      avgPing: null,     // EMA of lastPing; status display only
      avgPostsInPage: 0, // running mean of deletable posts per page; drives ETR
      pagesProcessed: 0, // count of productive pages observed (for the running mean)
      etr: 0,
    };
  
    // events
    onStart = undefined;
    onProgress = undefined;
    onStop = undefined;
  
    resetState() {
      this.state = {
        running: false,
        delCount: 0,
        failCount: 0,
        grandTotal: 0,
        offset: 0,
        emptyPageRetry: 0,
        endReason: null,
        _userDeleteDelay: 0,
        _userSearchDelay: 0,
  
        _searchResponse: null,
        _messagesToDelete: [],
        _skippedMessages: [],
      };
  
      this.options.askForConfirmation = true;
    }
  
    // Batch wrapper. Calls run() once per queued (server, channel) target, sequentially.
    // The confirmation prompt only fires on the first job; subsequent jobs proceed silently.
    async runBatch(queue) {
      if (this.state.running) return log.error('Already running!');
  
      log.info(`Running batch with queue of ${queue.length} jobs`);
      for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        log.info('Starting job...', `(${i + 1}/${queue.length})`);
  
        this.options = { ...this.options, ...job };
  
        await this.run(true);
        if (!this.state.running) break;
  
        log.info('Job ended.', `(${i + 1}/${queue.length})`);
        this.resetState();
        this.options.askForConfirmation = false;
      }
  
      log.info('Batch finished.');
      this.state.running = false;
    }
  
    // Main delete loop for a single (server, channel) target. Repeats:
    // search → filter → confirm (first page only) → delete page → wait,
    // until the search returns empty or stop() fires.
    async run(inBatch = false) {
      if (this.state.running && !inBatch) return log.error('Already running!');
  
      this.#runId++;                  // any prior loop now sees a stale id and exits
      const myRunId = this.#runId;    // captured for this run only
      this.state.running = true;
      this.state._userDeleteDelay = this.options.deleteDelay; // baseline for decay after rate-limit bumps
      this.state._userSearchDelay = this.options.searchDelay;
      this.stats.startTime = new Date();
      // Fresh running mean for the new run — page sizes vary by channel/content.
      this.stats.avgPostsInPage = 0;
      this.stats.pagesProcessed = 0;
  
      log.success(`\nStarted at ${this.stats.startTime.toLocaleString()}`);
  
      if (this.onStart) this.onStart(this.state, this.stats);
  
      do {
        // Bail out if a newer run() has superseded this loop.
        if (this.#runId !== myRunId) {
          log.verb('Run instance superseded — exiting old loop.');
          return;
        }
  
        log.verb('Fetching messages...');
        await this.search();
  
        // search() can short-circuit on stop during a 202/429 cooldown, returning
        // before _searchResponse is populated. Bail out cleanly in that case.
        if (!this.state.running || this.#runId !== myRunId) return;
  
        await this.filterResponse();
  
        log.verb(`Grand total: ${this.state.grandTotal}`);
        log.verb(`Messages in current page: ${this.state._searchResponse.messages.length}`);
        log.verb(`To be deleted: ${this.state._messagesToDelete.length}`);
        log.verb(`Skipped: ${this.state._skippedMessages.length}`);
        log.verb(`offset: ${this.state.offset}`);
        this.printStats();
  
        this.calcEtr();
        log.verb(`Estimated time remaining: ${msToHMS(this.stats.etr)}`);
  
        if (this.state._messagesToDelete.length > 0) {
          this.state.emptyPageRetry = 0; // got a productive page, reset retry counter
  
          if (await this.promptConfirmation() === false) {
            this.state.endReason = 'user-declined';
            this.state.running = false;
            break;
          }
  
          await this.deleteMessagesFromList();
          // If user clicked Stop during the delete loop, exit before the trailing search delay.
          if (!this.state.running) break;
  
          // Last-page short-circuit: if we've handled everything Discord said exists,
          // skip the trailing wait + redundant empty-page confirmation search.
          // (Page size isn't a reliable signal — Discord pages are content-bounded,
          // so a sub-25 response can happen mid-run on long messages.)
          if (this.state.delCount + this.state.failCount >= this.state.grandTotal) {
            this.state.endReason = 'completed';
            break;
          }
        }
        else if (this.state._skippedMessages.length > 0) {
          this.state.emptyPageRetry = 0; // got a non-empty page, reset retry counter
          // The page has results but no deletable ones (e.g. all system messages).
          // Advance the offset and check the next page; loop ends when a fully empty page returns.
          const oldOffset = this.state.offset;
          this.state.offset += this.state._skippedMessages.length;
          log.verb('Nothing deletable on this page, checking next page...');
          log.verb(`Skipped ${this.state._skippedMessages.length} out of ${this.state._searchResponse.messages.length} in this page.`, `(Offset was ${oldOffset}, adjusted to ${this.state.offset})`);
        }
        else {
          // Empty page. Decide whether to retry (search index lag is common) or stop (truly done).
          const expectedRemaining = this.state.grandTotal - (this.state.delCount + this.state.failCount);
          const max = this.options.maxEmptyPageRetries;
  
          if (expectedRemaining > 0 && this.state.emptyPageRetry < max) {
            this.state.emptyPageRetry++;
            log.warn(
              `API returned an empty page, but ~${expectedRemaining} message(s) should still remain.`,
              `Retrying (${this.state.emptyPageRetry}/${max})...`
            );
            // fall through to the trailing searchDelay wait, then loop iterates
          }
          else {
            if (this.state.delCount + this.state.failCount === 0 && this.state.grandTotal === 0) {
              // First search returned zero — the filters didn't match anything in this target.
              // Distinct from a successful run; surface it as its own end state.
              this.state.endReason = 'no-matches';
            } else if (this.state.emptyPageRetry >= max) {
              log.warn(`Gave up after ${max} consecutive empty pages.`, `(${expectedRemaining} message(s) still expected per grandTotal — may be unreachable due to search index lag, offset cap, or filter mismatch.)`);
              this.state.endReason = 'empty-page-exhausted';
            } else {
              this.state.endReason = 'completed';
            }
            if (inBatch) break; // break without stopping if this is part of a job
            this.state.running = false;
            break; // skip the trailing searchDelay wait — done
          }
        }
  
        // wait before next page (fix search page not updating fast enough)
        log.verb(`Waiting ${(this.options.searchDelay / 1000).toFixed(2)}s before next page...`);
        await this.#wait(this.options.searchDelay);
  
      } while (this.state.running);
  
      // If a fresh run() bumped #runId while this loop was waiting, the end-summary
      // and onStop belong to that new run — skip them here. Manual stop() does not
      // bump #runId, so a user-triggered stop falls through to the summary below.
      if (this.#runId !== myRunId) return;
  
      const endTime = new Date();
      const elapsed = msToHMS(endTime.getTime() - this.stats.startTime.getTime());
  
      // Pick the end-summary log level/format from how the run ended. Each line gets
      // its own log call so they stack vertically (and inherit the level's color).
      if (this.state.endReason === 'no-matches') {
        log.warn('No matching messages found.');
        log.warn('The search filter returned zero results — no messages match the current parameters.');
        log.warn(`Total time elapsed: ${elapsed}`);
      } else if (this.state.endReason === 'completed' && this.state.failCount === 0) {
        log.success('Run completed successfully.');
        log.success(`All messages deleted: ${this.state.delCount}/${this.state.grandTotal}`);
        log.success(`Total time elapsed: ${elapsed}`);
      } else if (this.state.endReason === 'completed') {
        log.warn('Run completed with failures.');
        log.warn(`Deleted: ${this.state.delCount}/${this.state.grandTotal}`);
        log.warn(`Failure count: ${this.state.failCount}`);
        log.warn(`Total time elapsed: ${elapsed}`);
      } else {
        const mode = END_REASON_LABELS[this.state.endReason] || 'Unknown';
        log.error('Run failed early.');
        log.error(`Failure mode: ${mode}`);
        log.error(`Deleted: ${this.state.delCount}/${this.state.grandTotal}`);
        log.error(`Total time elapsed: ${elapsed}`);
      }
      this.printStats();
  
      if (this.onStop) this.onStop(this.state, this.stats);
    }
  
    // Aborts the run. Sets state.running=false and wakes any in-flight sleep so the
    // main loop exits at its next checkpoint and prints the end-summary.
    stop() {
      if (this.state.running) this.state.endReason = 'user-stopped';
      this.state.running = false;
      if (this.#waitAbort) this.#waitAbort();
      if (this.onStop) this.onStop(this.state, this.stats);
    }
  
    // Estimated time remaining = perPostCost × remaining, where perPostCost is
    // derived from observed page sizes:
    //   perPageCost = searchDelay + (avgPostsInPage * deleteDelay)
    //   perPostCost = perPageCost / avgPostsInPage
    // Uses an avgN of 25 as a starting estimate before any productive page has been
    // observed (Discord's pages are content-bounded so real values often fall lower);
    // the running mean converges within a handful of pages.
    // (Ping is intentionally out of this formula — its variance dwarfs deleteDelay
    // on stable connections, and rate-limit bumps are reflected via options.deleteDelay
    // already, so adding ping double-counts during throttle.)
    calcEtr() {
      const remaining = this.state.grandTotal - this.state.delCount - this.state.failCount;
      if (remaining <= 0) { this.stats.etr = 0; return; }
      const avgN = this.stats.avgPostsInPage > 0 ? this.stats.avgPostsInPage : 25;
      const perPageCost = this.options.searchDelay + (avgN * this.options.deleteDelay);
      this.stats.etr = (perPageCost / avgN) * remaining;
    }
  
    // Shows a browser confirm() dialog with the estimated count, ETA, and a content
    // preview. Fires once per run (or once per batch); subsequent pages skip the prompt.
    async promptConfirmation() {
      if (!this.options.askForConfirmation) return true;
  
      log.verb('Waiting for your confirmation...');
      const sm = this.options.streamerMode;
      const preview = this.state._messagesToDelete.map(m => {
        const author = sm ? '••••' : `${m.author?.username ?? '[system]'}#${m.author?.discriminator ?? '0'}`;
        const body = m.attachments?.length ? '[ATTACHMENTS]' : (sm ? '••••' : m.content);
        return `${author}: ${body}`;
      }).join('\n');
  
      const answer = await askYesNo(
        `Do you want to delete ~${this.state.grandTotal} messages? (Estimated time: ${msToHMS(this.stats.etr)})` +
        '(The actual number of messages may be less, depending if you\'re using filters to skip some messages)' +
        '\n\n---- Preview ----\n' +
        preview
      );
  
      if (!answer) {
        log.error('Aborted by you!');
        return false;
      }
      else {
        log.verb('OK');
        this.options.askForConfirmation = false; // do not ask for confirmation again on the next request
        return true;
      }
    }
  
    // Fetches the next page of matching messages from Discord's search API.
    // Handles 202 (channel not yet indexed), 429 (rate limit, with delay bump),
    // 401 (auth expired), 5xx (transient retry), and network errors.
    async search(transientAttempt = 0) {
      const base = this.options.guildId === '@me'
        ? `${API_BASE}/channels/${this.options.channelId}/messages/`  // DMs
        : `${API_BASE}/guilds/${this.options.guildId}/messages/`;     // Server
  
      let resp;
      try {
        this.beforeRequest();
        resp = await fetch(base + 'search?' + queryString([
          ['author_id', this.options.authorId || undefined],
          // Omit channel_id for DMs (URL already has it) AND for server-wide wipes (empty channelId).
          ['channel_id', (this.options.guildId !== '@me' && this.options.channelId) ? this.options.channelId : undefined],
          ['min_id', this.options.minId ? toSnowflake(this.options.minId) : undefined],
          ['max_id', this.options.maxId ? toSnowflake(this.options.maxId) : undefined],
          ['sort_by', 'timestamp'],
          ['sort_order', 'desc'],
          ['offset', this.state.offset],
          ['has', this.options.hasLink    ? 'link'     : undefined],
          ['has', this.options.hasImage   ? 'image'    : undefined],
          ['has', this.options.hasVideo   ? 'video'    : undefined],
          ['has', this.options.hasSound   ? 'sound'    : undefined],
          ['has', this.options.hasSticker ? 'sticker'  : undefined],
          ['has', this.options.hasPoll    ? 'poll'     : undefined],
          ['has', this.options.hasEmbed   ? 'embed'    : undefined],
          ['has', this.options.hasForward ? 'snapshot' : undefined],
          ['mentions',         this.options.mentions || undefined],
          ['mention_everyone', this.options.mentionEveryone ? true : undefined],
          ['pinned',
            this.options.pinnedMode === 'only'    ? true  :
            this.options.pinnedMode === 'exclude' ? false : undefined],
          ['content', this.options.content || undefined],
          // Always include NSFW channels — the flag is permissive (whitelists NSFW results),
          // not restrictive, so SFW channels return normally either way. Omitting it would
          // silently zero-result any age-gated channel in the queue.
          ['include_nsfw', true],
        ]), {
          headers: { 'Authorization': this.options.authToken }
        });
        this.afterRequest();
      } catch (err) {
        // Network error (offline, DNS, etc). Retry with exponential backoff.
        if (transientAttempt < MAX_TRANSIENT_RETRIES) {
          const w = Math.pow(2, transientAttempt) * 1000; // 1s, 2s, 4s
          log.warn(`Search request failed (likely network). Retrying in ${w}ms (${transientAttempt + 1}/${MAX_TRANSIENT_RETRIES})...`, err);
          await this.#wait(w);
          if (!this.state.running) return;
          return await this.search(transientAttempt + 1);
        }
        this.state.endReason = 'fetch-error';
        this.state.running = false;
        log.error(`Search request failed ${MAX_TRANSIENT_RETRIES + 1} times:`, err);
        throw err;
      }
  
      // not indexed yet
      if (resp.status === 202) {
        let w = (await resp.json()).retry_after * 1000;
        w = w || this.options.searchDelay; // Fix retry_after 0 — fall back to user's search delay
        this.stats.throttledCount++;
        this.stats.throttledTotalTime += w;
        log.warn(`This channel isn't indexed yet. Waiting ${w}ms for discord to index it...`);
        await this.#wait(w);
        if (!this.state.running) return;
        return await this.search();
      }
  
      if (!resp.ok) {
        // 429: rate limited
        if (resp.status === 429) {
          let w = (await resp.json()).retry_after * 1000;
          w = w || this.options.searchDelay;
  
          this.stats.throttledCount++;
          this.stats.throttledTotalTime += w;
          // Bump effective delay (monotonic — never lower it). Successful searches will decay it back toward the user's baseline.
          this.options.searchDelay = Math.max(this.options.searchDelay, w);
          log.warn(`Being rate limited by the API for ${w}ms! Bumped search delay to ${this.options.searchDelay}ms (will decay back to ${this.state._userSearchDelay}ms on success).`);
          this.printStats();
          log.verb(`Cooling down for ${w}ms before retrying...`);
  
          await this.#wait(w);
          if (!this.state.running) return;
          return await this.search();
        }
  
        // 401: token expired or invalid — clearer message, no retry.
        if (resp.status === 401) {
          this.state.endReason = 'auth-expired';
          this.state.running = false;
          log.error('Your Discord session expired or the token is invalid. Reload Discord and try again.');
          throw resp;
        }
  
        // 5xx: transient server error. Retry with exponential backoff.
        if (resp.status >= 500 && transientAttempt < MAX_TRANSIENT_RETRIES) {
          const w = Math.pow(2, transientAttempt) * 1000;
          log.warn(`Search got ${resp.status} from the API. Retrying in ${w}ms (${transientAttempt + 1}/${MAX_TRANSIENT_RETRIES})...`);
          await this.#wait(w);
          if (!this.state.running) return;
          return await this.search(transientAttempt + 1);
        }
  
        // Anything else: hard error.
        this.state.endReason = (resp.status >= 500) ? 'fetch-error' : 'api-error';
        this.state.running = false;
        log.error(`Error searching messages, API responded with status ${resp.status}!\n`, await resp.json());
        throw resp;
      }
      const data = await resp.json();
  
      // Successful search — decay the delay back toward the user's baseline (half-life per success).
      if (this.options.searchDelay > this.state._userSearchDelay) {
        this.options.searchDelay = Math.max(
          this.state._userSearchDelay,
          Math.floor((this.options.searchDelay + this.state._userSearchDelay) / 2)
        );
      }
  
      this.state._searchResponse = data;
      return data;
    }
  
    // Narrows the latest search response down to the messages this script will
    // actually delete: drops system messages and (by default) pinned messages.
    // Records the rest as "skipped" so the caller can advance the search offset past them.
    async filterResponse() {
      const data = this.state._searchResponse;
  
      // grandTotal locks in the highest total_results ever seen and only ever grows.
      // The per-search total_results shrinks as deletes succeed, but we keep the peak
      // so the post-loop "deleted N/M" denominator reflects the original target size.
      const total = data.total_results;
      if (total > this.state.grandTotal) this.state.grandTotal = total;
  
      // search returns conversation context (messages near the matched one); only the message
      // marked hit:true is the actual match. .filter(Boolean) drops any convo missing a hit
      // (defensive — Discord normally guarantees a hit per convo).
      const discoveredMessages = data.messages.map(convo => convo.find(message => message.hit === true)).filter(Boolean);
  
      // Type 0 = regular user message; types 6-21 cover pins, joins, replies, etc.
      // System messages outside that range cannot be deleted via this endpoint.
      let messagesToDelete = discoveredMessages;
      messagesToDelete = messagesToDelete.filter(msg => msg.type === 0 || (msg.type >= 6 && msg.type <= 21));
  
      // Pinned mode is enforced server-side via the `pinned` query param. Re-filter
      // here as a safety net in case Discord ever returns a stray non-matching message.
      if (this.options.pinnedMode === 'exclude') {
        messagesToDelete = messagesToDelete.filter(msg => !msg.pinned);
      } else if (this.options.pinnedMode === 'only') {
        messagesToDelete = messagesToDelete.filter(msg => msg.pinned);
      }
  
      // Exclude filters — Discord's search API has no "doesn't have" parameter, so
      // these run client-side after the search response comes back. Each one drops
      // messages that match the corresponding has-type, mirroring the Include grid.
      const opt = this.options;
      if (opt.excludeContent) {
        const term = opt.excludeContent.toLowerCase();
        if (opt.excludeMatchMode === 'exact') {
          // Word-boundary match: term must appear as a standalone word in the message.
          // "cat" skips "I love my cat." but NOT "I love cats". Term is regex-escaped
          // so special chars (.+*?[](){} etc.) match literally.
          const escaped = opt.excludeContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`\\b${escaped}\\b`, 'i');
          messagesToDelete = messagesToDelete.filter(msg => !re.test(msg.content || ''));
        } else {
          messagesToDelete = messagesToDelete.filter(msg => !(msg.content || '').toLowerCase().includes(term));
        }
      }
      if (opt.excludeLink) {
        messagesToDelete = messagesToDelete.filter(msg =>
          !(msg.embeds?.some(e => e.type === 'link' || e.type === 'article')) &&
          !/https?:\/\//i.test(msg.content || ''));
      }
      if (opt.excludeImage) {
        messagesToDelete = messagesToDelete.filter(msg =>
          !(msg.attachments?.some(a => a.content_type?.startsWith('image/'))));
      }
      if (opt.excludeVideo) {
        messagesToDelete = messagesToDelete.filter(msg =>
          !(msg.attachments?.some(a => a.content_type?.startsWith('video/'))));
      }
      if (opt.excludeSound) {
        messagesToDelete = messagesToDelete.filter(msg =>
          !(msg.attachments?.some(a => a.content_type?.startsWith('audio/'))));
      }
      if (opt.excludeSticker) {
        messagesToDelete = messagesToDelete.filter(msg =>
          !(msg.sticker_items?.length > 0) && !(msg.stickers?.length > 0));
      }
      if (opt.excludePoll) {
        messagesToDelete = messagesToDelete.filter(msg => !msg.poll);
      }
      if (opt.excludeEmbed) {
        messagesToDelete = messagesToDelete.filter(msg => !(msg.embeds?.length > 0));
      }
      if (opt.excludeForward) {
        messagesToDelete = messagesToDelete.filter(msg =>
          !(msg.message_snapshots?.length > 0) && msg.message_reference?.type !== 1);
      }
      if (opt.excludeMentions) {
        // Skip @user is a multi-value list — applied client-side, so any number of
        // mentioned users can be skipped per run (the API limitation only affects
        // Include @user, which is single-value at search time).
        const skipIds = String(opt.excludeMentions).split(/\s*,\s*/).filter(Boolean);
        if (skipIds.length) {
          messagesToDelete = messagesToDelete.filter(msg =>
            !(msg.mentions?.some(u => skipIds.includes(u.id))));
        }
      }
      if (opt.excludeMentionEveryone) {
        messagesToDelete = messagesToDelete.filter(msg => !msg.mention_everyone);
      }
  
      // Skipped messages still count toward the search offset for the next page.
      const skippedMessages = discoveredMessages.filter(msg => !messagesToDelete.find(m => m.id === msg.id));
  
      this.state._messagesToDelete = messagesToDelete;
      this.state._skippedMessages = skippedMessages;
  
      // Feed the running mean of deletable posts per page — only on productive pages,
      // since skipped-only pages don't follow the (search → N deletes) cost model.
      if (messagesToDelete.length > 0) {
        this.stats.pagesProcessed++;
        this.stats.avgPostsInPage += (messagesToDelete.length - this.stats.avgPostsInPage) / this.stats.pagesProcessed;
      }
    }
  
    // Issues one DELETE per message in the current page, with per-message retry on
    // transient failures and a deleteDelay sleep between each.
    async deleteMessagesFromList() {
      const myRunId = this.#runId;
      for (let i = 0; i < this.state._messagesToDelete.length; i++) {
        // Stop if user clicked stop OR a newer run has superseded this one.
        if (this.#runId !== myRunId || !this.state.running) return log.error('Stopped by you!');
  
        const message = this.state._messagesToDelete[i];
  
        const sm = this.options.streamerMode;
        const author = sm ? '••••' : `${message.author?.username ?? '[system]'}#${message.author?.discriminator ?? '0'}`;
        log.debug(
          `[${this.state.delCount + 1}/${this.state.grandTotal}] ` +
          `<sup>${new Date(message.timestamp).toLocaleString()}</sup> ` +
          `<b>${escapeHTML(author)}</b>` +
          `: <i>${escapeHTML(sm ? '••••' : (message.content ?? '')).replace(/\n/g, '↵')}</i>` +
          (message.attachments?.length ? (sm ? ' [ATTACHMENTS]' : escapeHTML(JSON.stringify(message.attachments))) : ''),
          `<sup>{ID:${escapeHTML(message.id)}}</sup>`
        );
  
        let attempt = 0;
        while (attempt < MAX_DELETE_ATTEMPTS) {
          const result = await this.deleteMessage(message);
  
          if (result === 'RETRY') {
            attempt++;
            if (this.#runId !== myRunId) return; // abandon retries on supersede
            log.verb(`Retrying in ${this.options.deleteDelay}ms... (${attempt}/${MAX_DELETE_ATTEMPTS})`);
            await this.#wait(this.options.deleteDelay);
          }
          else break;
        }
  
        this.calcEtr();
        if (this.onProgress) this.onProgress(this.state, this.stats);
  
        await this.#wait(this.options.deleteDelay);
      }
    }
  
    // Deletes a single message via DELETE /channels/<id>/messages/<id>.
    // Returns 'OK' (deleted), 'RETRY' (transient — caller may try again),
    // or 'FAILED' (permanent — counted toward failCount).
    async deleteMessage(message) {
      const API_DELETE_URL = `${API_BASE}/channels/${message.channel_id}/messages/${message.id}`;
      let resp;
      try {
        this.beforeRequest();
        resp = await fetch(API_DELETE_URL, {
          method: 'DELETE',
          headers: { 'Authorization': this.options.authToken },
        });
        this.afterRequest();
      } catch (err) {
        // Network error — let the per-message retry loop try once more.
        log.warn('Delete request threw an error (likely network), will retry:', err);
        log.verb('Related object:', escapeHTML(JSON.stringify(message)));
        return 'RETRY';
      }
  
      if (!resp.ok) {
        if (resp.status === 429) {
          // deleting messages too fast
          const w = (await resp.json()).retry_after * 1000;
          this.stats.throttledCount++;
          this.stats.throttledTotalTime += w;
          // Bump effective delay (monotonic — never lower it). Successful deletes will decay it back toward the user's baseline.
          this.options.deleteDelay = Math.max(this.options.deleteDelay, w);
          log.warn(`Being rate limited by the API for ${w}ms! Bumped delete delay to ${this.options.deleteDelay}ms (will decay back to ${this.state._userDeleteDelay}ms on success).`);
          this.printStats();
          log.verb(`Cooling down for ${w}ms before retrying...`);
          await this.#wait(w);
          return 'RETRY';
        } else if (resp.status === 401) {
          // Token expired or invalid — abort the whole run, not just this message.
          this.state.endReason = 'auth-expired';
          this.state.running = false;
          log.error('Your Discord session expired or the token is invalid. Reload Discord and try again.');
          this.state.failCount++;
          return 'FAILED';
        } else if (resp.status >= 500) {
          // Transient server error — retry via the per-message retry loop.
          log.warn(`Delete got ${resp.status} from the API, will retry.`);
          return 'RETRY';
        } else {
          const body = await resp.text();
  
          try {
            const r = JSON.parse(body);
  
            if (resp.status === 400 && r.code === 50083) {
              // 400 with code 50083 means the thread is archived. Bump the offset
              // so the same message doesn't reappear on the next search page.
              log.warn('Error deleting message (Thread is archived). Will increment offset so we don\'t search this in the next page...');
              this.state.offset++;
              this.state.failCount++;
              return 'FAILED';
            }
  
            log.error(`Error deleting message, API responded with status ${resp.status}!`, r);
            log.verb('Related object:', escapeHTML(JSON.stringify(message)));
            this.state.failCount++;
            return 'FAILED';
          } catch (e) {
            log.error(`Failed to parse JSON. API responded with status ${resp.status}!`, body);
            this.state.failCount++;
            return 'FAILED';
          }
        }
      }
  
      // Successful delete — decay the delay back toward the user's baseline (half-life per success).
      if (this.options.deleteDelay > this.state._userDeleteDelay) {
        this.options.deleteDelay = Math.max(
          this.state._userDeleteDelay,
          Math.floor((this.options.deleteDelay + this.state._userDeleteDelay) / 2)
        );
      }
  
      this.state.delCount++;
      return 'OK';
    }
  
    beforeRequest() {
      this.#beforeTs = Date.now();
    }
    afterRequest() {
      this.stats.lastPing = (Date.now() - this.#beforeTs);
      this.stats.avgPing = this.stats.avgPing > 0 ? (this.stats.avgPing * 0.9) + (this.stats.lastPing * 0.1) : this.stats.lastPing;
    }
  
    printStats() {
      log.verb(`Delete delay: ${this.options.deleteDelay}ms, Search delay: ${this.options.searchDelay}ms`);
      log.verb(`Last Ping: ${this.stats.lastPing}ms, Average Ping: ${this.stats.avgPing | 0}ms`);
      log.verb(`Rate Limited: ${this.stats.throttledCount} times.`);
      log.verb(`Total time throttled: ${msToHMS(this.stats.throttledTotalTime)}.`);
    }
  }
  
  
  __exports.default = UndiscordCore;
};

__modules["src/ui/drag.js"] = (__exports) => {
  // Drag/resize for the panel window. Mouse only (desktop target).
  // Creates 8 invisible grab handles around the element edges plus uses an
  // existing handle (e.g. the header) for moving.
  
  const MOVE = 0;
  const RESIZE_T = 1;
  const RESIZE_B = 2;
  const RESIZE_L = 4;
  const RESIZE_R = 8;
  const RESIZE_TL = RESIZE_T + RESIZE_L;
  const RESIZE_TR = RESIZE_T + RESIZE_R;
  const RESIZE_BL = RESIZE_B + RESIZE_L;
  const RESIZE_BR = RESIZE_B + RESIZE_R;
  
  class DragResize {
    constructor({ elm, moveHandle, options }) {
      this.options = defaultArgs({
        minWidth: 200,
        maxWidth: Infinity,
        minHeight: 100,
        maxHeight: Infinity,
        draggingClass: 'drag',
        createHandlers: true,
      }, options);
  
      elm.style.position = 'fixed';
  
      new Draggable(elm, moveHandle, MOVE, this.options);
  
      if (this.options.createHandlers) {
        const sides = [
          ['grab-t',  RESIZE_T],  ['grab-r',  RESIZE_R],
          ['grab-b',  RESIZE_B],  ['grab-l',  RESIZE_L],
          ['grab-tl', RESIZE_TL], ['grab-tr', RESIZE_TR],
          ['grab-br', RESIZE_BR], ['grab-bl', RESIZE_BL],
        ];
        for (const [name, op] of sides) {
          const handle = createElement('div', { name }, elm);
          new Draggable(elm, handle, op, this.options);
        }
      }
    }
  }
  
  class Draggable {
    constructor(targetElm, handleElm, op, options) {
      Object.assign(this, options);
  
      this._targetElm = targetElm;
      this._handleElm = handleElm;
  
      let vw = window.innerWidth;
      let vh = window.innerHeight;
      let initialX, initialY, initialT, initialL, initialW, initialH;
  
      const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
  
      const moveOp = (x, y) => {
        const t = clamp(initialT + (y - initialY), 0, vh - initialH);
        const l = clamp(initialL + (x - initialX), 0, vw - initialW);
        this._targetElm.style.top = t + 'px';
        this._targetElm.style.left = l + 'px';
      };
  
      const resizeOp = (x, y) => {
        x = clamp(x, 0, vw);
        y = clamp(y, 0, vh);
        const dx = x - initialX;
        const dy = y - initialY;
        const dirX = (op & RESIZE_L) ? -1 : 1;
        const dirY = (op & RESIZE_T) ? -1 : 1;
        const dxClamped = clamp(dx * dirX, this.minWidth - initialW, this.maxWidth - initialW);
        const dyClamped = clamp(dy * dirY, this.minHeight - initialH, this.maxHeight - initialH);
        const t = initialT + dyClamped * dirY;
        const l = initialL + dxClamped * dirX;
        const w = initialW + dxClamped;
        const h = initialH + dyClamped;
        if (op & RESIZE_T) { this._targetElm.style.top = t + 'px'; this._targetElm.style.height = h + 'px'; }
        if (op & RESIZE_B) { this._targetElm.style.height = h + 'px'; }
        if (op & RESIZE_L) { this._targetElm.style.left = l + 'px'; this._targetElm.style.width = w + 'px'; }
        if (op & RESIZE_R) { this._targetElm.style.width = w + 'px'; }
      };
  
      const operation = op === MOVE ? moveOp : resizeOp;
  
      this._dragStartHandler = (e) => {
        if (e.buttons !== 1 && e.which !== 1) return;
        e.preventDefault();
        initialX = e.clientX;
        initialY = e.clientY;
        vw = window.innerWidth;
        vh = window.innerHeight;
        initialT = this._targetElm.offsetTop;
        initialL = this._targetElm.offsetLeft;
        initialW = this._targetElm.clientWidth;
        initialH = this._targetElm.clientHeight;
        document.addEventListener('mousemove', this._dragMoveHandler);
        document.addEventListener('mouseup', this._dragEndHandler);
        this._targetElm.classList.add(this.draggingClass);
      };
  
      this._dragMoveHandler = (e) => {
        e.preventDefault();
        // If the button isn't down (e.g. mouseup happened off-window), end the drag.
        if ((e.buttons || e.which) !== 1) return this._dragEndHandler();
        operation(e.clientX, e.clientY);
      };
  
      this._dragEndHandler = () => {
        document.removeEventListener('mousemove', this._dragMoveHandler);
        document.removeEventListener('mouseup', this._dragEndHandler);
        this._targetElm.classList.remove(this.draggingClass);
      };
  
      this._handleElm.addEventListener('mousedown', this._dragStartHandler);
    }
  }
  
  function createElement(tag, attrs, parent) {
    const elm = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) elm.setAttribute(k, v);
    if (parent) parent.appendChild(elm);
    return elm;
  }
  
  function defaultArgs(defaults, options) {
    if (options && typeof options === 'object') {
      for (const k in defaults) {
        if (options[k] !== undefined) defaults[k] = options[k];
      }
    }
    return defaults;
  }
  
  __exports.default = DragResize;
};

__modules["src/undiscord-ui.js"] = (__exports) => {
  const LOG_PREFIX = '[UNDISCORD-LITE]';const styles = __require("src/ui/styles.css").default;const undiscordTemplate = __require("src/ui/undiscord.html").default;const UndiscordCore = __require("src/undiscord-core.js").default;const Drag = __require("src/ui/drag.js").default;const { createElm, insertCss, log, setLogFn, msToHMS, getAuthorId, getGuildId, getChannelId, fillToken } = __require("src/helpers.js");
  const buttonHtml = `<div id="undiscord-btn" tabindex="0" role="button" aria-label="Delete Messages" title="Delete Messages with Undiscord Lite">
    <svg aria-hidden="false" width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
      <path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
    </svg>
    <progress></progress>
  </div>`;
  
  // -------------------------- User interface ------------------------------- //
  
  const undiscordCore = new UndiscordCore();
  
  const ui = {
    undiscordWindow: null,
    undiscordBtn: null,
    logArea: null,
    autoScroll: null,
  
    // progress handler
    progressMain: null,
    progressIcon: null,
    percent: null,
  };
  const $ = s => ui.undiscordWindow.querySelector(s);
  
  // Channel input uses ';' to separate per-server groups, ',' between channels in a group.
  // e.g. server="X,Y" + channel="C1,C2;C3" → X gets C1+C2, Y gets C3.
  // An empty group (";", or "C1;") means server-wide wipe of that server.
  // If the channel input has no ';', the legacy parallel-CSV interpretation is used
  // for backward compatibility — Add buttons rewrite it to grouped format on the next click.
  function parseTargets() {
    const guildRaw = $('input#guildId').value.trim();
    const channelRaw = $('input#channelId').value.trim();
    const servers = guildRaw ? guildRaw.split(/\s*,\s*/) : [];
  
    const targets = [];
    let orphans = 0;
  
    if (channelRaw.includes(';') || servers.length <= 1) {
      // Grouped format (or single-server, where grouped and legacy are identical).
      const groups = channelRaw
        ? channelRaw.split(/\s*;\s*/).map(g => g.split(/\s*,\s*/).filter(Boolean))
        : [];
      for (let i = 0; i < servers.length; i++) {
        const s = servers[i];
        if (!s) continue;
        const g = groups[i] ?? [];
        if (g.length === 0) targets.push({ guildId: s, channelId: '' });
        else for (const c of g) targets.push({ guildId: s, channelId: c });
      }
      // Channels in groups beyond the server list = orphans
      for (let i = servers.length; i < groups.length; i++) orphans += groups[i].length;
    } else {
      // Legacy parallel-CSV (multiple servers, no ';' delimiter): each comma in the
      // channel list pairs with the same-index server, last-server clamps.
      const channels = channelRaw.split(/\s*,\s*/);
      const max = Math.max(servers.length, channels.length);
      for (let i = 0; i < max; i++) {
        const g = servers[Math.min(i, servers.length - 1)] ?? '';
        const c = channels[i] ?? '';
        if (!g) { if (c) orphans++; continue; }
        targets.push({ guildId: g, channelId: c });
      }
    }
    return { targets, orphans };
  }
  
  // Append a (server, channel) pair using the grouped format.
  //   - Adding (S, '') over (S, channels) absorbs the channels — server-wide wins.
  //   - Adding (S, C) over (S, '') narrows the server-wide entry to just C.
  //   - Plain duplicates surface as a "<id> is already in the queue." log line.
  // Migrates legacy parallel-CSV input to grouped format on the way in.
  function addPair(server, channel) {
    if (!server) return;
    const guildInput = $('input#guildId');
    const channelInput = $('input#channelId');
  
    const { servers, groups } = readQueue(guildInput.value, channelInput.value);
  
    let idx = servers.indexOf(server);
    const wasNew = idx === -1;
    if (wasNew) {
      servers.push(server);
      groups.push([]);
      idx = servers.length - 1;
    }
  
    if (channel === '') {
      // Server-wide. Absorb existing channel-specifics for this server.
      if (!wasNew && groups[idx].length === 0) {
        // Already queued as server-wide — nothing to do, but surface the no-op.
        return log.info(`${server} is already queued as server-wide.`);
      }
      if (!wasNew && groups[idx].length > 0) {
        log.warn(`Server-wide wipe of ${server} absorbed ${groups[idx].length} channel-specific entr${groups[idx].length === 1 ? 'y' : 'ies'}.`);
      }
      groups[idx] = [];
    } else {
      // Channel-specific. If the server is currently server-wide, NARROW it to this
      // channel. (Add Channel after Add Server means "actually, just this one".)
      if (!wasNew && groups[idx].length === 0) {
        log.info(`Server-wide wipe of ${server} narrowed to ${server}:${channel}.`);
        groups[idx] = [channel];
      } else {
        if (groups[idx].includes(channel)) {
          // Already queued — surface the no-op instead of silently returning.
          return log.info(`${server}:${channel} is already in the queue.`);
        }
        groups[idx].push(channel);
      }
    }
  
    writeQueue(servers, groups);
  }
  
  // Read inputs into { servers: [], groups: [[], []...] }. Migrates legacy parallel-CSV
  // (where servers may be duplicated to align with channels) into grouped form.
  function readQueue(guildVal, channelVal) {
    const guildRaw = guildVal.trim();
    const channelRaw = channelVal.trim();
    const servers = guildRaw ? guildRaw.split(/\s*,\s*/) : [];
  
    // Already grouped, or single server (where formats are equivalent).
    if (channelRaw.includes(';') || servers.length <= 1) {
      const groups = channelRaw
        ? channelRaw.split(/\s*;\s*/).map(g => g.split(/\s*,\s*/).filter(Boolean))
        : [];
      while (groups.length < servers.length) groups.push([]);
      return { servers, groups };
    }
  
    // Legacy parallel-CSV migration: dedup servers and merge their channels.
    const channels = channelRaw.split(/\s*,\s*/);
    const tmpGroups = servers.map(() => []);
    for (let i = 0; i < channels.length; i++) {
      const idx = Math.min(i, servers.length - 1);
      if (channels[i]) tmpGroups[idx].push(channels[i]);
    }
    const uniqueServers = [];
    const uniqueGroups = [];
    for (let i = 0; i < servers.length; i++) {
      const existing = uniqueServers.indexOf(servers[i]);
      if (existing === -1) {
        uniqueServers.push(servers[i]);
        uniqueGroups.push([...tmpGroups[i]]);
      } else {
        for (const c of tmpGroups[i]) {
          if (!uniqueGroups[existing].includes(c)) uniqueGroups[existing].push(c);
        }
      }
    }
    return { servers: uniqueServers, groups: uniqueGroups };
  }
  
  function writeQueue(servers, groups) {
    $('input#guildId').value   = servers.join(',');
    $('input#channelId').value = groups.map(g => g.join(',')).join(';');
    renderQueue();
  }
  
  function removeServer(server) {
    const { servers, groups } = readQueue($('input#guildId').value, $('input#channelId').value);
    const idx = servers.indexOf(server);
    if (idx === -1) {
      log.info(`${server} is not in the batch — nothing to remove.`);
      return;
    }
    servers.splice(idx, 1);
    groups.splice(idx, 1);
    log.info(`Removed ${server} from the batch.`);
    writeQueue(servers, groups);
  }
  
  // Remove a single (server, channel) pair from the queue. If the server has no channels
  // left after removal, the server is dropped too — there is no auto-conversion to server-wide.
  function removeChannel(server, channel) {
    const { servers, groups } = readQueue($('input#guildId').value, $('input#channelId').value);
    const idx = servers.indexOf(server);
    if (idx === -1) {
      log.info(`${server}:${channel} is not in the batch — nothing to remove.`);
      return;
    }
    if (groups[idx].length === 0) {
      log.info(`${server} is queued as server-wide — use 'del' on the server to remove it.`);
      return;
    }
    const cIdx = groups[idx].indexOf(channel);
    if (cIdx === -1) {
      log.info(`${server}:${channel} is not in the batch — nothing to remove.`);
      return;
    }
    groups[idx].splice(cIdx, 1);
    if (groups[idx].length === 0) {
      // Empty group means server-wide. Mirrors the opposite direction (Add Channel
      // over a server-wide narrows it down) so removing the last channel widens it back out.
      log.info(`Removed ${server}:${channel} — last channel, server converted to server-wide wipe.`);
    } else {
      log.info(`Removed ${server}:${channel} from the batch.`);
    }
    writeQueue(servers, groups);
  }
  
  function renderQueue() {
    const { targets, orphans } = parseTargets();
    const counter = $('#queueCounter');
  
    // Group targets by server, preserving first-appearance order.
    // Server-wide entries (empty channelId) leave channels at 0 — that means "all of them".
    const groups = new Map(); // guildId -> channel count
    for (const t of targets) {
      if (!groups.has(t.guildId)) groups.set(t.guildId, 0);
      if (t.channelId) groups.set(t.guildId, groups.get(t.guildId) + 1);
    }
  
    if (groups.size === 0 && !orphans) {
      counter.innerHTML = '';
      return;
    }
  
    const cells = [];
    let i = 0;
    for (const count of groups.values()) {
      const label = letterLabel(i++);
      cells.push(`<span>Server: ${label}</span><span>|| Channels: ${count === 0 ? 'All' : count}</span>`);
    }
    if (orphans) {
      cells.push(`<span class="qc-orphan">Orphans:</span><span class="qc-orphan">|| ${orphans} channel${orphans > 1 ? 's' : ''} without a server</span>`);
    }
    counter.innerHTML = cells.join('');
  }
  
  // 0→A, 1→B, ..., 25→Z, 26→AA, 27→AB, ...
  function letterLabel(i) {
    let s = '';
    do {
      s = String.fromCharCode(65 + (i % 26)) + s;
      i = Math.floor(i / 26) - 1;
    } while (i >= 0);
    return s;
  }
  
  // Entry point. Called once on script load: injects the panel HTML/CSS, mounts the
  // floating trash-icon button, registers Ctrl+Shift+D, and binds every panel button
  // to its handler. After this returns, the script is idle until the user clicks Delete.
  function initUI() {
  
    insertCss(styles);
  
    ui.undiscordWindow = createElm(undiscordTemplate);
    document.body.appendChild(ui.undiscordWindow);
  
    // draggable by the header, resizable from 8 edge/corner handles
    new Drag({ elm: ui.undiscordWindow, moveHandle: $('.header') });
  
    // floating action button — fallback trash icon in the bottom-right.
    // Stays hidden whenever the server-bar injection succeeds (see syncServerBarBtn).
    ui.undiscordBtn = createElm(buttonHtml);
    ui.undiscordBtn.onclick = toggleWindow;
    document.body.appendChild(ui.undiscordBtn);
  
    // Server-bar injection — try to mount the trash icon inside Discord's left rail
    // (between the DM/Home separator and the first server). Polls every 1s to
    // re-inject if React drops it. Falls back to the FAB if Discord's DOM doesn't
    // expose the expected anchors.
    syncServerBarBtn();
    setInterval(syncServerBarBtn, 1000);
  
    // keyboard shortcut: Ctrl+Shift+D toggles the panel
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === 'KeyD') {
        e.preventDefault();
        e.stopPropagation();
        toggleWindow();
      }
    }, true);
  
    function toggleWindow() {
      if (ui.undiscordWindow.style.display !== 'none') {
        ui.undiscordWindow.style.display = 'none';
        ui.undiscordBtn.style.color = 'var(--interactive-normal)';
      }
      else {
        ui.undiscordWindow.style.display = '';
        ui.undiscordBtn.style.color = 'var(--interactive-active)';
      }
    }
  
    // Builds the trash-icon DOM element to inject into Discord's server bar.
    // Style and shape come from the unscoped #undiscord-server-btn rules in styles.css.
    function buildServerBarBtn() {
      const div = document.createElement('div');
      div.id = 'undiscord-server-btn';
      div.setAttribute('role', 'button');
      div.setAttribute('aria-label', 'Undiscord Lite');
      div.setAttribute('tabindex', '0');
      div.setAttribute('title', 'Undiscord Lite — click to open (Ctrl+Shift+D)');
      div.draggable = false;
      div.innerHTML = `
        <div class="udl-blob">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
            <path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
          </svg>
          <progress class="udl-progress"></progress>
        </div>`;
      div.onclick = toggleWindow;
      return div;
    }
  
    // Ensures the server-bar trash icon exists; injects if missing, hides the FAB
    // when present, shows the FAB as fallback when Discord's DOM doesn't have the
    // expected anchors (selector match by class prefix is robust to hash changes).
    function syncServerBarBtn() {
      let btn = document.getElementById('undiscord-server-btn');
      if (!btn) {
        const sep = document.querySelector('[class*="guildSeparator"]');
        const item = sep && sep.closest('[class*="listItem"]');
        if (item) {
          btn = buildServerBarBtn();
          item.insertAdjacentElement('afterend', btn);
          ui.serverBarBtn = btn;
          // Mirror running state if a job is already in flight.
          if (undiscordCore.state.running) btn.classList.add('running');
        }
      } else {
        ui.serverBarBtn = btn;
      }
      // FAB visibility mirrors injection state.
      ui.undiscordBtn.style.display = btn ? 'none' : '';
    }
  
    // cached elements
    ui.logArea = $('#logArea');
    ui.autoScroll = $('#autoScroll');
    ui.progressMain = $('#progressBar');
    ui.progressIcon = ui.undiscordBtn.querySelector('progress');
    ui.percent = $('#progressPercent');
  
    $('#hide').onclick = toggleWindow;
    $('button#start').onclick = startAction;
    $('button#stop').onclick = stopAction;
    $('button#clear').onclick = () => ui.logArea.innerHTML = '';
    $('button#getAuthor').onclick = () => {
      const id = getAuthorId();
      if (id) $('input#authorId').value = id;
    };
    // Server / Channel selection now uses the global selection-mode infrastructure
    // (sel buttons), wired up alongside the other Select bindings below. The old
    // URL-context-based setGuild/setChannel handlers are gone; the same workflow
    // is achievable by clicking sel and then clicking the target in Discord.
    // Add Server queues (currentServer, '') as a server-wide wipe.
    $('button#addGuild').onclick = () => addPair(getGuildId(), '');
    // Add Channel queues (currentServer, currentChannel) as a specific-channel entry.
    $('button#addChannel').onclick = () => {
      const server = getGuildId();
      const channel = getChannelId();
      if (server && channel) addPair(server, channel);
    };
    $('button#delGuild').onclick = () => {
      const server = getGuildId();
      if (server) removeServer(server);
    };
    $('button#delChannel').onclick = () => {
      const server = getGuildId();
      const channel = getChannelId();
      if (server && channel) removeChannel(server, channel);
    };
    // Add all DMs: fetch the user's open DM channels (GET /users/@me/channels) and
    // queue each as (@me, <channelId>). Group DMs (type 3) are skipped by default
    // (red pill); toggle green to include them. DMs X'd out of the sidebar aren't
    // returned by this endpoint, so they're skipped.
    $('button#addAllDms').onclick = async () => {
      const token = fillToken();
      if (!token) return; // fillToken already logs the error.
  
      log.info('Fetching your open DM channels...');
      let channels;
      try {
        const resp = await fetch('https://discord.com/api/v9/users/@me/channels', {
          headers: { 'Authorization': token },
        });
        if (!resp.ok) return log.error(`Could not fetch DMs — Discord returned ${resp.status}.`);
        channels = await resp.json();
      } catch (err) {
        return log.error('Network error fetching DMs:', err);
      }
  
      const includeGroups = $('input#includeGroupDms').checked;
      const dms = channels.filter(c => c.type === 1 || (includeGroups && c.type === 3));
      if (!dms.length) return log.info('No open DM channels found.');
  
      for (const c of dms) addPair('@me', c.id);
  
      const direct = dms.filter(c => c.type === 1).length;
      const group = dms.filter(c => c.type === 3).length;
      const summary = includeGroups
        ? `Queued ${dms.length} DM${dms.length === 1 ? '' : 's'} (${direct} direct, ${group} group).`
        : `Queued ${direct} direct DM${direct === 1 ? '' : 's'} (group DMs excluded).`;
      log.info(summary);
    };
    // Del DMs: strip the @me server entry (and all its DM channels) from the queue.
    $('button#delAllDms').onclick = () => {
      const { servers, groups } = readQueue($('input#guildId').value, $('input#channelId').value);
      const idx = servers.indexOf('@me');
      if (idx === -1) return log.info('No DMs in the queue to remove.');
      const dmCount = groups[idx].length;
      servers.splice(idx, 1);
      groups.splice(idx, 1);
      if (dmCount === 0) {
        log.info('Removed @me from the queue.');
      } else {
        log.info(`Removed ${dmCount} DM${dmCount === 1 ? '' : 's'} from the queue.`);
      }
      writeQueue(servers, groups);
    };
  
    // Live-update the queue counter when the user manually edits either input.
    $('input#guildId').addEventListener('input', renderQueue);
    $('input#channelId').addEventListener('input', renderQueue);
    renderQueue();
  
    // Stepper controls for search/delete delays. User-driven changes go straight to
    // core options + decay baseline. Rate-limit bumps inside core can still push the
    // effective delay above the user's max temporarily; it decays back to the baseline.
    setDelayDisplay('searchDelay', SEARCH_DEFAULT);
    setDelayDisplay('deleteDelay', DELETE_DEFAULT);
    bindStepper('searchDelay', SEARCH_MIN, SEARCH_MAX, SEARCH_STEP, SEARCH_DEFAULT, '_userSearchDelay');
    bindStepper('deleteDelay', DELETE_MIN, DELETE_MAX, DELETE_STEP, DELETE_DEFAULT, '_userDeleteDelay');
  
    // Strip Discord message links pasted into the message-interval inputs down to the trailing ID.
    bindLinkStrip($('input#minId'));
    bindLinkStrip($('input#maxId'));
  
    // Paste handling for user-ID fields:
    //   - Author ID and Skip mentions support multiple IDs (Cartesian batching for
    //     authors, post-filter list-check for skips). Multi-paste appends with dedup.
    //   - Include mentions (Search filter) is single-value because Discord's
    //     `mentions=` query param only accepts one ID per request. Pastes overwrite.
    bindMultiUserPaste($('input#authorId'),          'Author ID');
    bindSingleUserPaste($('input#mentionsId'),       'Mentions');
    bindMultiUserPaste($('input#excludeMentionsId'), 'Skip mentions');
  
    // Point-and-click ID capture: each Select button arms a global click listener;
    // the next click on a Discord user/avatar/message/server-icon/channel extracts
    // the relevant ID. Server and Channel sel buttons replace the old URL-based
    // setGuild/setChannel — same workflow, just click instead of view-and-press.
    bindSelector('selectAuthor',         'authorId',         'user',    'Author ID');
    bindSelector('selectGuild',          'guildId',          'server',  'Server ID');
    bindSelector('selectChannel',        'channelId',        'channel', 'Channel ID');
    bindSelector('selectMentions',       'mentionsId',       'user-single', 'Mentions');
    bindSelector('selectExcludeMentions','excludeMentionsId','user',    'Skip mentions');
    bindSelector('selectMinId',          'minId',            'message', 'After message ID');
    bindSelector('selectMaxId',          'maxId',            'message', 'Before message ID');
  
    // Clear buttons inside each text input. Server clear cascades to Channel
    // (channels are scoped to a parent server). Channel clear leaves Server alone.
    bindClearButton('clearAuthor',          'authorId',          'Author ID');
    bindClearButton('clearSearch',          'search',            'Include text');
    bindClearButton('clearExcludeSearch',   'excludeSearch',     'Skip text');
    bindClearButton('clearMentions',        'mentionsId',        'Mentions');
    bindClearButton('clearExcludeMentions', 'excludeMentionsId', 'Skip mentions');
    bindClearButton('clearMinId',           'minId',             'After message ID');
    bindClearButton('clearMaxId',           'maxId',             'Before message ID');
    // Server clear also clears Channel — Channel can't exist without its parent.
    $('button#clearGuild').onclick = () => {
      const g = $('input#guildId'), c = $('input#channelId');
      if (!g.value.trim() && !c.value.trim()) return log.info('Server and Channel are already empty.');
      g.value = '';
      c.value = '';
      log.info('Cleared Server and Channel fields.');
      renderQueue();
    };
    // Channel clear leaves Server intact.
    $('button#clearChannel').onclick = () => {
      const c = $('input#channelId');
      if (!c.value.trim()) return log.info('Channel field is already empty.');
      c.value = '';
      log.info('Cleared Channel field.');
      renderQueue();
    };
  
    // Date interval shortcuts. 1 day / 1 week set min=now−Δ, max=now. "all" resets
    // After to Discord's epoch (visible lower bound) and clears Before (no upper bound).
    $('button#datePresetDay').onclick  = () => setDateRange(1);
    $('button#datePresetWeek').onclick = () => setDateRange(7);
    $('button#datePresetAll').onclick  = () => setDateRange(null);
  
    // Live pre-2015 clamp on each date field — fires the moment the user commits a value.
    bindDateClamp('minDate', 'After date');
    bindDateClamp('maxDate', 'Before date');
  
    // Exclude-match pill: flips the label text alongside the pill state for clarity.
    $('input#excludeMatchPill').addEventListener('change', (e) => {
      $('#excludeMatchLabel').textContent = e.target.checked ? 'Substring' : 'Exact';
    });
  
    // Group-DMs pill: red (unchecked, default) = skip group DMs in the bulk add;
    // green (checked) = include them. Label flips to match the active state.
    $('input#includeGroupDms').addEventListener('change', (e) => {
      $('#includeGroupDmsLabel').textContent = e.target.checked ? "Including all group DM's" : "Skipping all group DM's";
    });
  
    // Help-button delegation: every <button class="help-btn" data-help="<key>"> in the
    // panel routes to the matching HELP_TEXT entry. preventDefault stops the click
    // from triggering the parent <details> when the button is embedded in a <summary>.
    ui.undiscordWindow.addEventListener('click', (e) => {
      const btn = e.target.closest('button.help-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        showHelp(btn.dataset.help);
      }
    });
  
    // Mutually-exclusive checkbox pairs between Search filter and Delete filter — checking
    // one auto-unchecks its counterpart. Both checked at once would always match nothing.
    for (const t of ['Link', 'Image', 'Video', 'Sound', 'Sticker', 'Poll', 'Embed', 'Forward']) {
      bindMutex(`has${t}`, `exclude${t}`);
    }
    bindMutex('mentionEveryone', 'excludeMentionEveryone');
  
    // redirect console logs to inside the window after setting up the UI
    setLogFn(printLog);
  
    bindCoreEvents();
  }
  
  // ---- Date interval helpers ----
  
  // Discord's snowflake epoch — no messages exist before this timestamp.
  const DISCORD_EPOCH_LOCAL = '2015-01-01T00:00';
  const DISCORD_EPOCH_MS = new Date(DISCORD_EPOCH_LOCAL).getTime();
  
  // Format a Date as the YYYY-MM-DDTHH:MM string that <input type="datetime-local"> requires.
  function fmtLocal(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  
  // On every committed change to a date input, snap out-of-range values back into
  // [Discord epoch, now] and emit a warning. Empty values and currently-invalid
  // drafts are left alone (startAction surfaces parse errors at run time).
  function bindDateClamp(inputId, fieldName) {
    const input = $(`input#${inputId}`);
    input.addEventListener('change', () => {
      const v = input.value.trim();
      if (!v) return;
      const ms = new Date(v).getTime();
      if (Number.isNaN(ms)) return;
      if (ms < DISCORD_EPOCH_MS) {
        input.value = DISCORD_EPOCH_LOCAL;
        log.warn(`"${fieldName}" was before 2015-01-01 — clamped to ${DISCORD_EPOCH_LOCAL} (Discord did not exist before then).`);
      } else if (ms > Date.now()) {
        const nowLocal = fmtLocal(new Date());
        input.value = nowLocal;
        log.warn(`"${fieldName}" was in the future — clamped to ${nowLocal} (no messages exist yet for that time).`);
      }
    });
  }
  
  // Sets the After/Before date inputs to "now − N days" through "now". Pass null
  // for "all time" — After resets to Discord's epoch (visually clear that the
  // lower bound is the launch date), Before clears (no upper bound).
  function setDateRange(days) {
    const minInput = $('input#minDate');
    const maxInput = $('input#maxDate');
    if (days === null) {
      minInput.value = DISCORD_EPOCH_LOCAL;
      maxInput.value = '';
      return;
    }
    const now = new Date();
    const past = new Date(now.getTime() - days * 86400000);
    minInput.value = fmtLocal(past);
    maxInput.value = fmtLocal(now);
  }
  
  // ---- Help-button registry ----
  
  // Each key maps to a { name, lines } entry printed into the log when a [Help]
  // button with the matching `data-help=<key>` attribute is clicked. HTML is
  // preserved in lines (so <i>/<b>/<code> work); use &lt;/&gt; for literal angle
  // brackets and &nbsp; for indentation.
  //
  // To add help for a new section:
  //   1. Add a key + { name, lines: [...] } entry below.
  //   2. Add a <button class="help-btn" data-help="<key>">Help</button> as a
  //      sibling of the relevant <legend> in undiscord.html.
  const HELP_TEXT = {
    tabGeneral: {
      name: 'General',
      lines: [
        "Defines <i>who</i> is being deleted (Author ID), <i>where</i> (Server / Channel / DMs), and builds the queue for batch wipes.",
        "Each fieldset has its own <b>[Help]</b> button for detailed instructions on that field.",
        "Multiple servers and channels can be queued — the run processes them sequentially as one batch.",
      ],
    },
    tabSearchFilter: {
      name: 'Search filter',
      lines: [
        "Narrows what Discord's search API returns before the script considers anything for deletion. Server-side filters are faster than client-side ones.",
        "Three groups: <b>Include text</b>, <b>Include attachment type</b>, <b>Include @user</b>. Each has its own [Help] for details.",
        "Anything Discord returns can still be excluded post-search via the <b>Delete filter</b> tab.",
      ],
    },
    tabDeleteFilter: {
      name: 'Delete filter',
      lines: [
        "Drops messages from the deletion list <i>after</i> Discord's search returns them. Same three-group shape as the Search filter — text, attachment types, @user.",
        "Each Search/Delete attachment-type pair is mutually exclusive — checking one auto-unchecks the other (both checked at once would always match nothing).",
        "Useful when Discord's tokenized search can't express what you want — e.g. \"delete everything <i>except</i> messages mentioning Alice.\"",
      ],
    },
    tabMessagesInterval: {
      name: 'Messages interval',
      lines: [
        "Bound the wipe to a snowflake range using two message IDs.",
        "Right-click any message → <b>Copy Message Link</b>, paste into either field. The script auto-strips the URL down to just the ID.",
        "<b>Messages interval overrides Date interval</b> if both are set.",
      ],
    },
    tabDateInterval: {
      name: 'Date interval',
      lines: [
        "Bound the wipe by date. Use the date pickers, or click <b>1 day</b> / <b>1 week</b> / <b>all</b> for convenience presets.",
        "Pre-2015 and future dates auto-clamp on input with a warning. After defaults to Discord's launch (2015-01-01).",
        "Ignored if <b>Messages interval</b> is also set.",
      ],
    },
    tabAdvanced: {
      name: 'Advanced settings',
      lines: [
        "Tune the per-page wait (<b>Search delay</b>) and per-delete pause (<b>Delete delay</b>).",
        "Both auto-bump on Discord's 429 rate-limit responses, then decay back toward your slider value as subsequent requests succeed.",
        "Defaults (45000 ms search / 1000 ms delete) are tuned to never trigger 429s. Lower at your own risk.",
      ],
    },
    authorId: {
      name: 'Author ID',
      lines: [
        "The UserID of the person whose messages you want to delete.",
        "Click <b>Me</b> to autofill your own UserID.",
        "You <i>can</i> delete others' messages if you have <i>Manage Messages</i> permission over them — e.g. you're an admin in a server you own, or have mod perms in.",
        "To copy someone else's UserID from a chat:",
        "&nbsp;&nbsp;1. Enable Developer Mode (Discord settings &rarr; Advanced).",
        "&nbsp;&nbsp;2. Right-click their profile icon &rarr; <b>Copy User ID</b>.",
        "&nbsp;&nbsp;3. Right-click a message &rarr; <b>Copy Message ID</b> (also useful for Messages interval).",
        "To chain multiple people, comma-separate the IDs: <code>id1,id2,id3</code>. The run expands to one job per (target × author).",
        "Non-self authors require <i>Manage Messages</i> permission on their target server. A pre-flight check runs once at the top of the batch and aborts early if any pair lacks it.",
        "DMs are excluded from multi-author batching — Discord only lets you delete your own DM messages, so each DM target spawns one self-author job regardless of how many IDs are in the list.",
      ],
    },
    serverId: {
      name: 'Server ID',
      lines: [
        "The Discord Server (Guild) where messages should be deleted.",
        "Click <b>set</b> while viewing a server to fill the field from your current location.",
        "Click <b>add</b> to queue this server alongside others — supports any number of servers in one batch run.",
        "An empty <b>Channel ID</b> with this set means <i>wipe the entire server</i> (every channel you have access to).",
        "Right-click a server icon &rarr; <b>Copy Server ID</b> (Developer Mode required).",
      ],
    },
    channelId: {
      name: 'Channel ID',
      lines: [
        "Restrict the wipe to a specific channel inside the queued server.",
        "Click <b>set</b>/<b>add</b> while inside a channel to populate from your current view.",
        "Click <b>del</b> to remove the current channel from the queue. If it's the last channel under that server, the server reverts to a server-wide wipe.",
        "Leave empty (with a Server ID set) to target the whole server.",
        "Right-click a channel name &rarr; <b>Copy Channel ID</b> (Developer Mode required).",
      ],
    },
    dms: {
      name: 'DMs',
      lines: [
        "Click <b>Add DM's</b> to queue every DM channel currently open in your sidebar — both 1:1 and group DMs.",
        "Click <b>Clear DM's</b> to remove every queued DM at once.",
        "The <b>group DMs</b> pill controls whether group DMs are included in the bulk add. Default red/off skips them; toggle green/on to include them.",
        "DMs you've X'd out of the sidebar aren't returned by Discord's API — re-open them in Discord first if you need them included.",
        "Uses Discord's <code>GET /users/@me/channels</code> endpoint with your existing auth token.",
      ],
    },
    includeText: {
      name: 'Include text',
      lines: [
        "Only search for messages whose content contains this text.",
        "Discord's search is <i>tokenized</i> and case-insensitive: <b>cat</b> matches messages with the word <i>cat</i> but not <i>catdog</i> or <i>category</i>.",
        "Leave empty to match any text content.",
      ],
    },
    includeAttachment: {
      name: 'Include attachment type',
      lines: [
        "Restrict the search to messages that include the toggled type(s): Link, Image, Video, Sound, Sticker, Poll, Embed, Forward.",
        "Multiple toggles are <b>AND-combined</b> by Discord — checking Image AND Video returns messages with <i>both</i>, not either. Most users want to check one at a time.",
        "<b>Pinned</b>: choose <i>exclude</i> (skip pinned), <i>include</i> (delete pinned alongside others), or <i>only pinned</i> (target pinned only).",
      ],
    },
    includeUser: {
      name: 'Include @user',
      lines: [
        "Restrict the search to messages where this user is @mentioned.",
        "<b>Single user only</b> — Discord's search API can only filter by one mentioned user per request, so this field accepts exactly one ID. Pasting or capturing a new ID overwrites the current value.",
        "If you need to match several mentioned users, run separate passes (one per ID). The asymmetry only affects this side — see <b>Skip @user</b> for the multi-value variant.",
        "Toggle <b>has @everyone / @here</b> to also include messages that pinged everyone or online users.",
        "Right-click a user &rarr; <b>Copy User ID</b> (Developer Mode required), or use <b>Select</b> and click any avatar/username in the message list.",
        "Leave the field empty to ignore mentions when matching.",
      ],
    },
    excludeText: {
      name: 'Skip text',
      lines: [
        "Skip messages whose content matches this text — they survive the run.",
        "<b>Match: Substring</b> — term appears anywhere (<i>cat</i> skips <i>I love my cat</i> AND <i>I love cats</i>).",
        "<b>Match: Exact</b> — term must appear as a standalone word (<i>cat</i> skips <i>I love my cat</i> but NOT <i>I love cats</i>).",
        "Applied client-side after the search response — works in combination with the include side.",
      ],
    },
    excludeAttachment: {
      name: 'Skip attachment type',
      lines: [
        "Skip messages that include the toggled type(s) — they survive the run.",
        "Mutually exclusive with the matching toggle in <b>Include attachment type</b>: checking one here automatically un-checks its counterpart on the search side, since both checked at once would always match nothing.",
        "Applied client-side after the search response.",
      ],
    },
    excludeUser: {
      name: 'Skip @user',
      lines: [
        "Skip messages where any of these users are @mentioned — they survive the run.",
        "<b>Multi-value</b> — comma-separate any number of user IDs, or paste/capture them one at a time and they'll append (with dedup). Every listed ID is checked against each message's mentions at filter time, so all of them work in a single pass — unlike <b>Include @user</b>, this side has no API limit because it's a client-side check after the search response.",
        "Toggle <b>skip @everyone / @here</b> to also skip messages that pinged everyone or online users.",
        "Right-click a user &rarr; <b>Copy User ID</b> (Developer Mode required), or use <b>Select</b> and click avatars/usernames; hold Shift to capture several in a row.",
        "An ID listed here cannot also be in <b>Include @user</b> — that combination would always match nothing.",
      ],
    },
    messagesInterval: {
      name: 'Messages interval',
      lines: [
        "Bound the search to messages between two specific message IDs (Discord snowflakes).",
        "Right-click a message &rarr; <b>Copy Message Link</b>, then paste into either field — the script auto-strips the URL to just the trailing message ID.",
        "<b>After ID</b> must be older (smaller snowflake) than <b>Before ID</b>.",
        "If only one bound is set, the other is unbounded (channel start or current time).",
        "<b>Messages interval overrides Date interval</b> if both are set.",
      ],
    },
    dateInterval: {
      name: 'Date interval',
      lines: [
        "Bound the search to messages posted between two dates.",
        "Use the datetime pickers, or click <b>1 day</b> / <b>1 week</b> / <b>all</b> for convenience presets.",
        "<b>After date</b> defaults to Discord's launch (2015-01-01) so the lower bound is always explicit.",
        "Both fields auto-clamp to <code>[2015-01-01, now]</code> on input — out-of-range values snap and log a warning.",
        "If only one bound is set, the other is unbounded.",
        "<b>Date interval is ignored</b> if Messages interval is also set.",
      ],
    },
    searchDelay: {
      name: 'Search delay',
      lines: [
        "Time the script waits between fetching pages of messages from Discord's search API.",
        "Range <b>15000–60000 ms</b>, default <b>45000 ms</b> (45s).",
        "Lower = faster but more 429 rate-limit hits. Discord throttles search aggressively below ~30s.",
        "On a 429, the effective delay auto-bumps to whatever Discord asks for, then decays back toward your slider value as subsequent requests succeed (half-life decay).",
        "Click <b>↺</b> to reset to default.",
      ],
    },
    deleteDelay: {
      name: 'Delete delay',
      lines: [
        "Pause between individual delete API calls.",
        "Range <b>100–3000 ms</b>, default <b>1000 ms</b> (1s).",
        "Lower = faster, but more risk of mid-run rate-limiting.",
        "Same auto-bump and half-life-decay behavior as Search delay.",
        "Click <b>↺</b> to reset to default.",
      ],
    },
  };
  
  function showHelp(key) {
    const entry = HELP_TEXT[key];
    if (!entry) return;
    log.info(`── ${entry.name.toUpperCase()} ──`);
    for (const line of entry.lines) log.info(`› ${line}`);
  }
  
  // ---- Mutually-exclusive checkbox pair ----
  
  // When the user checks one checkbox, silently uncheck its paired counterpart so they
  // can't both be on at once (which would always produce an empty result set).
  function bindMutex(idA, idB) {
    const a = $(`input#${idA}`);
    const b = $(`input#${idB}`);
    a.addEventListener('change', () => { if (a.checked && b.checked) b.checked = false; });
    b.addEventListener('change', () => { if (a.checked && b.checked) a.checked = false; });
  }
  
  // ---- Delay stepper helpers ----
  
  const SEARCH_MIN = 15000, SEARCH_MAX = 60000, SEARCH_STEP = 500, SEARCH_DEFAULT = 45000;
  const DELETE_MIN = 100,   DELETE_MAX = 3000,  DELETE_STEP = 50,  DELETE_DEFAULT = 1000;
  
  // Display delays as raw integers — unit suffix lives in the legend "(ms)" instead.
  function setDelayDisplay(inputId, ms) {
    const input = $(`input#${inputId}`);
    input.dataset.ms = ms;
    input.value = String(ms);
  }
  
  function getDelayMs(inputId) {
    return parseInt($(`input#${inputId}`).dataset.ms);
  }
  
  function bindStepper(inputId, min, max, step, defaultMs, stateKey) {
    const apply = (next) => {
      next = Math.max(min, Math.min(max, next));
      setDelayDisplay(inputId, next);
      undiscordCore.options[inputId] = next;
      undiscordCore.state[stateKey] = next;
    };
    $(`button#${inputId}Down`).onclick  = () => apply(getDelayMs(inputId) - step);
    $(`button#${inputId}Up`).onclick    = () => apply(getDelayMs(inputId) + step);
    $(`button#${inputId}Reset`).onclick = () => apply(defaultMs);
  
    // Direct typing — parse the digits the user typed, clamp to [min, max], apply.
    // Strips the trailing " ms" suffix and any other non-numeric characters so the
    // user can edit the displayed string in place. Fires on blur or Enter.
    const input = $(`input#${inputId}`);
    input.addEventListener('change', () => {
      const raw = input.value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed)) {
        setDelayDisplay(inputId, getDelayMs(inputId)); // revert to last good value
        log.warn(`Invalid delay value — reverted.`);
        return;
      }
      const rounded = Math.round(parsed);
      const clamped = Math.max(min, Math.min(max, rounded));
      if (clamped !== rounded) {
        log.info(`${inputId} clamped from ${rounded} ms to ${clamped} ms (range ${min}–${max}).`);
      }
      apply(clamped);
    });
    // Enter commits the edit and blurs (browsers fire change on blur after edit).
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  }
  
  // ---- Message link auto-strip ----
  
  // On paste, if the clipboard contains a Discord message link, replace the
  // pasted content with just the trailing message ID. Otherwise paste as normal.
  function bindLinkStrip(input) {
    input.addEventListener('paste', (e) => {
      const text = ((e.clipboardData || window.clipboardData).getData('text') || '').trim();
      const m = text.match(/^https?:\/\/(?:[\w.-]+\.)?discord\.com\/channels\/[\w@]+\/\d+\/(\d{15,25})\/?$/);
      if (m) {
        e.preventDefault();
        input.value = m[1];
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
  
  // ---- Point-and-click ID capture (selection mode) ----
  
  // Active-selection state. Single instance — only one Select can be armed at a
  // time. Shape: { input, type, label, button } where type is one of
  // 'user' | 'user-single' | 'server' | 'channel' | 'message'.
  let selection = null;
  let selectionTimeout = null;
  const SELECTION_TIMEOUT_MS = 60000;
  
  // Walks up from the click target to find a Discord message wrapper, then
  // extracts the message ID from its `id="chat-messages-CHANNEL-MESSAGE"` attribute.
  // That id pattern has been stable in Discord for years.
  function extractMessageId(elem) {
    const wrapper = elem.closest && elem.closest('[id^="chat-messages-"]');
    const m = wrapper && wrapper.id.match(/chat-messages-\d+-(\d+)/);
    return m ? m[1] : null;
  }
  
  // Extracts a server (guild) ID. Discord's server-list items carry
  // `data-list-item-id="guildsnav___<SERVERID>"`. Falls back to the URL of the
  // currently-viewed server (`/channels/<server>/<channel>`) so the user can
  // click anywhere within a server view to capture its ID.
  function extractServerId(elem) {
    const item = elem.closest && elem.closest('[data-list-item-id^="guildsnav___"]');
    if (item) {
      const m = item.getAttribute('data-list-item-id').match(/guildsnav___(\d+)/);
      if (m) return m[1];
    }
    const urlMatch = location.href.match(/channels\/(\w+)\/\d+/);
    return urlMatch ? urlMatch[1] : null;
  }
  
  // Extracts a channel ID. Tries (in order) a channel-list item attribute, the
  // chat-messages wrapper's encoded channel, and finally the URL of the
  // currently-viewed channel.
  function extractChannelId(elem) {
    const item = elem.closest && elem.closest('[data-list-item-id^="channels___"]');
    if (item) {
      const m = item.getAttribute('data-list-item-id').match(/channels___(\d+)/);
      if (m) return m[1];
    }
    const msg = elem.closest && elem.closest('[id^="chat-messages-"]');
    if (msg) {
      const m = msg.id.match(/chat-messages-(\d+)-\d+/);
      if (m) return m[1];
    }
    const urlMatch = location.href.match(/channels\/\w+\/(\d+)/);
    return urlMatch ? urlMatch[1] : null;
  }
  
  // Pulls the author user-ID out of any Discord CDN URL form we know about.
  //   - Global avatar : cdn.discordapp.com/avatars/<UID>/<HASH>.<ext>
  //   - Per-server    : cdn.discordapp.com/guilds/<GID>/users/<UID>/avatars/<HASH>.<ext>
  //   - Banner / etc  : cdn.discordapp.com/banners/<UID>/<HASH>.<ext>  (rare in chat, harmless to support)
  // The /users/ form must be checked BEFORE /avatars/ since per-server URLs contain
  // both segments, but only /users/<UID>/ holds the user's ID.
  function userIdFromCdnUrl(url) {
    if (!url) return null;
    const m = url.match(/\/users\/(\d+)\//) || url.match(/\/avatars\/(\d+)\//) || url.match(/\/banners\/(\d+)\//);
    return m ? m[1] : null;
  }
  
  // Scans every Discord-CDN image inside a message <li> for a user ID.
  function scanMessageForUid(msg) {
    const candidates = msg.querySelectorAll('img[src*="cdn.discordapp.com"], img[src*="discordapp.net"]');
    for (const c of candidates) {
      const id = userIdFromCdnUrl(c.src);
      if (id) return id;
    }
    return null;
  }
  
  function extractUserId(elem) {
    // 1. Avatar/banner at or near the click target — most reliable.
    const img = (elem.closest && elem.closest('img')) || (elem.querySelector && elem.querySelector('img'));
    const fromImg = img && userIdFromCdnUrl(img.src);
    if (fromImg) return fromImg;
  
    // 2. Walk up to the enclosing message and try every CDN-served image inside.
    //    Server-scoped avatars use /guilds/<GID>/users/<UID>/avatars/<HASH>, so we
    //    can't restrict the selector to "src contains avatars/" — match users/ too.
    const msg = elem.closest && elem.closest('[id^="chat-messages-"]');
    if (msg) {
      const direct = scanMessageForUid(msg);
      if (direct) return direct;
  
      // 2b. Grouped follow-up message: Discord renders consecutive same-author posts
      //     as one "group" where only the FIRST <li> carries the avatar / username
      //     header. Subsequent posts in the bundle have no img to scan. Walk back
      //     through previous siblings (skipping dividers, timestamps, system rows
      //     with no avatar) until we hit a sibling that yields a user ID — that's
      //     the group head, which by Discord's grouping rules is the same author.
      let cursor = msg.previousElementSibling;
      while (cursor) {
        const id = scanMessageForUid(cursor);
        if (id) return id;
        cursor = cursor.previousElementSibling;
      }
    }
  
    // 3. Explicit data-user-id attribute (mentions, some popout elements).
    const withData = elem.closest && elem.closest('[data-user-id]');
    return (withData && withData.getAttribute('data-user-id')) || null;
  }
  
  function startSelection(input, type, label, button) {
    // Re-clicking the active Select button toggles it off.
    if (selection && selection.button === button) {
      cancelSelection();
      log.info('Selection cancelled.');
      return;
    }
    if (selection) cancelSelection();
  
    selection = { input, type, label, button };
    button.classList.add('active');
    document.body.classList.add('undiscord-selecting');
    document.addEventListener('click',   handleSelectionClick, true);
    document.addEventListener('keydown', handleSelectionKey,   true);
    document.addEventListener('keyup',   handleSelectionKey,   true);
    resetSelectionTimeout();
  
    const target =
      (type === 'user' || type === 'user-single') ? 'a user, avatar, or message author' :
      type === 'server'  ? 'a server icon in the left rail' :
      type === 'channel' ? 'a channel in the sidebar (or any message in it)' :
                           'a message';
    log.info(`Select mode active for ${label}: click ${target} in Discord to capture its ID. Hold Shift to capture multiple in a row. Esc to cancel.`);
  }
  
  function cancelSelection() {
    if (!selection) return;
    selection.button.classList.remove('active');
    selection.button.classList.remove('shift-locked');
    document.body.classList.remove('undiscord-selecting');
    document.removeEventListener('click',   handleSelectionClick, true);
    document.removeEventListener('keydown', handleSelectionKey,   true);
    document.removeEventListener('keyup',   handleSelectionKey,   true);
    if (selectionTimeout) { clearTimeout(selectionTimeout); selectionTimeout = null; }
    selection = null;
  }
  
  // Restart the 60s auto-cancel timer — called on selection start and after each
  // shift-held capture (so a long multi-select run doesn't time out mid-batch).
  function resetSelectionTimeout() {
    if (selectionTimeout) clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      log.warn('Selection mode timed out after 60s — cancelled.');
      cancelSelection();
    }, SELECTION_TIMEOUT_MS);
  }
  
  // Capture-phase click handler — fires before Discord's own listeners so we can
  // suppress popouts / message-jumps / etc. when extracting.
  function handleSelectionClick(e) {
    // Clicks inside our panel (including on Select buttons themselves) bubble
    // through normally so the user can toggle modes / interact with the UI.
    if (e.target.closest('#undiscord') || e.target.closest('#undiscord-server-btn')) return;
  
    e.preventDefault();
    e.stopPropagation();
  
    const t = selection.type;
    const id =
      (t === 'user' || t === 'user-single') ? extractUserId(e.target)    :
      t === 'message'                       ? extractMessageId(e.target) :
      t === 'server'                        ? extractServerId(e.target)  :
      t === 'channel'                       ? extractChannelId(e.target) : null;
    if (!id) {
      const typeLabel = selection.type === 'user-single' ? 'user' : selection.type;
      log.warn(`Couldn't extract a ${typeLabel} ID from the clicked element. Selection cancelled.`);
      cancelSelection();
      return;
    }
    insertCapturedId(selection.input, selection.label, id, selection.type);
  
    // Shift-held → stay in selection mode for another capture; refresh the timeout
    // so a long batch run doesn't auto-cancel mid-stream. Otherwise exit normally.
    if (e.shiftKey) {
      resetSelectionTimeout();
    } else {
      cancelSelection();
    }
  }
  
  // Unified keydown/keyup handler:
  //   - Esc cancels selection mode entirely.
  //   - Shift down/up toggles the shift-lock visual on the active button (green
  //     while held, amber otherwise).
  function handleSelectionKey(e) {
    if (e.key === 'Escape' && e.type === 'keydown') {
      cancelSelection();
      log.info('Selection cancelled.');
      return;
    }
    if (e.key === 'Shift' && selection) {
      if (e.type === 'keydown') selection.button.classList.add('shift-locked');
      else                       selection.button.classList.remove('shift-locked');
    }
  }
  
  // User-ID inputs are multi-value (comma-separated, dedup); user-single inputs
  // hold one ID (overwrite); message-ID inputs are single-value (overwrite).
  // Server and Channel captures are *additive* — they go through addPair() which
  // appends to the queue's grouped format and emits its own dedup/absorb/narrow logs.
  function insertCapturedId(input, label, id, type) {
    if (type === 'user') {
      const list = input.value.trim().split(/\s*,\s*/).filter(Boolean);
      if (list.includes(id)) {
        log.info(`${id} is already in ${label} — skipped.`);
        return;
      }
      list.push(id);
      input.value = list.join(',');
      log.success(`Captured user ID ${id} → ${label}.`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (type === 'user-single') {
      const previous = input.value.trim();
      if (previous === id) {
        log.info(`${id} is already set in ${label} — no change.`);
        return;
      }
      input.value = id;
      if (previous) log.success(`Captured user ID ${id} → ${label} (overwrote ${previous}).`);
      else          log.success(`Captured user ID ${id} → ${label}.`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (type === 'server') {
      log.success(`Captured server ID ${id} → adding to queue (server-wide).`);
      addPair(id, ''); // addPair handles dedup/absorb logging
    } else if (type === 'channel') {
      const urlMatch = location.href.match(/channels\/(\w+)\/\d+/);
      if (!urlMatch) {
        return log.warn(`Captured channel ID ${id} but couldn't determine its parent server from the URL — open the channel in Discord first, then try again.`);
      }
      log.success(`Captured channel ID ${id} → adding to queue under server ${urlMatch[1]}.`);
      addPair(urlMatch[1], id); // addPair handles dedup/narrow logging
    } else {
      input.value = id;
      log.success(`Captured message ID ${id} → ${label}.`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  
  function bindSelector(buttonId, inputId, type, label) {
    const button = $(`button#${buttonId}`);
    const input = $(`input#${inputId}`);
    button.onclick = () => startSelection(input, type, label, button);
  }
  
  // Binds a Clear button next to a text input — wipes the field and logs the action.
  // No-op (with a "already empty" log) when the input is already empty.
  // Special-case clears (Server clears Channel too, etc) are wired inline in initUI.
  function bindClearButton(buttonId, inputId, label) {
    const button = $(`button#${buttonId}`);
    const input = $(`input#${inputId}`);
    button.onclick = () => {
      if (!input.value.trim()) return log.info(`${label} is already empty.`);
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      log.info(`Cleared ${label}.`);
    };
  }
  
  // ---- Multi-user-ID paste handling ----
  
  // On paste, if the clipboard contains one or more Discord user-ID snowflakes
  // (a single numeric ID, or a comma-separated list of them), append them to
  // the field's existing comma-separated list with deduplication. Lets the user
  // build a list by repeatedly right-click → Copy User ID → paste, instead of
  // having to manually type commas. Non-snowflake clipboards fall through to
  // native paste behavior.
  function bindMultiUserPaste(input, label) {
    input.addEventListener('paste', (e) => {
      const text = ((e.clipboardData || window.clipboardData).getData('text') || '').trim();
      if (!/^\d{15,25}(\s*,\s*\d{15,25})*$/.test(text)) return; // not an ID list — let native paste run
  
      e.preventDefault();
      const incoming = text.split(/\s*,\s*/);
      const list = input.value.trim().split(/\s*,\s*/).filter(Boolean);
  
      let added = 0, dupes = 0;
      for (const id of incoming) {
        if (list.includes(id)) dupes++;
        else { list.push(id); added++; }
      }
  
      input.value = list.join(',');
      input.dispatchEvent(new Event('input', { bubbles: true }));
  
      if (added > 0) log.info(`Appended ${added} ID${added === 1 ? '' : 's'} to ${label}.`);
      if (dupes > 0) log.info(`${dupes} ID${dupes === 1 ? ' was' : 's were'} already in ${label} — skipped.`);
    });
  }
  
  // Single-value variant for fields that can only hold one user ID (Include @user —
  // Discord's `mentions=` query param accepts only one ID per request). New paste
  // overwrites the field. Non-snowflake clipboards fall through to native paste.
  function bindSingleUserPaste(input, label) {
    input.addEventListener('paste', (e) => {
      const text = ((e.clipboardData || window.clipboardData).getData('text') || '').trim();
      if (!/^\d{15,25}$/.test(text)) return;
  
      e.preventDefault();
      const previous = input.value.trim();
      if (previous === text) {
        log.info(`${label}: ${text} is already set — no change.`);
        return;
      }
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (previous) log.info(`${label}: replaced ${previous} with ${text}.`);
      else          log.info(`${label}: set to ${text}.`);
    });
  }
  
  const LOG_MAX_ENTRIES = 1000; // trim oldest beyond this — prevents unbounded DOM growth on long wipes
  
  // Renders a single log entry into the in-panel log area. Wired in as the global
  // log sink (setLogFn) once initUI() has the DOM ready, so anything called via
  // `log.info()` / `log.error()` / etc from anywhere shows up here.
  function printLog(type = '', args) {
    // For Errors, force serialization of normally-non-enumerable props (message, stack, etc).
    const html = args.map(o => {
      if (typeof o !== 'object') return o;
      return JSON.stringify(o, o instanceof Error ? Object.getOwnPropertyNames(o) : null);
    }).join('\t');
    ui.logArea.insertAdjacentHTML('beforeend', `<div class="log log-${type}">${html}</div>`);
    while (ui.logArea.childElementCount > LOG_MAX_ENTRIES) ui.logArea.firstElementChild.remove();
    if (ui.autoScroll.checked) ui.logArea.lastElementChild.scrollIntoView(false);
    if (type === 'error') console.error(LOG_PREFIX, ...args);
  }
  
  // Wires the core's lifecycle callbacks (onStart / onProgress / onStop) into UI updates:
  // disables/enables buttons, animates the trash FAB, and updates the progress bar.
  function bindCoreEvents() {
    undiscordCore.onStart = () => {
      $('#start').disabled = true;
      $('#stop').disabled = false;
      ui.undiscordBtn.classList.add('running');
      if (ui.serverBarBtn) ui.serverBarBtn.classList.add('running');
      ui.progressMain.style.display = 'block';
      ui.percent.style.display = 'block';
    };
  
    undiscordCore.onProgress = (state, stats) => {
      const value = state.delCount + state.failCount;
      const max = Math.max(state.grandTotal, value);
  
      if (max) {
        const percent = Math.round(value / max * 100) + '%';
        const elapsed = msToHMS(Date.now() - stats.startTime.getTime());
        const remaining = msToHMS(stats.etr);
        ui.percent.innerHTML = `${percent} (${value}/${max}) Elapsed: ${elapsed} Remaining: ${remaining}`;
        ui.progressIcon.setAttribute('max', max);
        ui.progressMain.setAttribute('max', max);
        ui.progressIcon.value = value;
        ui.progressMain.value = value;
        // Mirror progress onto the server-bar button too, if injected.
        const srvProgress = ui.serverBarBtn && ui.serverBarBtn.querySelector('.udl-progress');
        if (srvProgress) {
          srvProgress.setAttribute('max', max);
          srvProgress.value = value;
        }
      } else {
        ui.percent.innerHTML = '...';
        ui.progressIcon.removeAttribute('value');
        ui.progressMain.removeAttribute('value');
      }
  
      // Sync the stepper display to reflect any rate-limit bump/decay applied by core.
      setDelayDisplay('searchDelay', undiscordCore.options.searchDelay);
      setDelayDisplay('deleteDelay', undiscordCore.options.deleteDelay);
    };
  
    undiscordCore.onStop = () => {
      $('#start').disabled = false;
      $('#stop').disabled = true;
      ui.undiscordBtn.classList.remove('running');
      if (ui.serverBarBtn) ui.serverBarBtn.classList.remove('running');
      ui.progressMain.style.display = 'none';
      ui.percent.style.display = 'none';
    };
  }
  
  // Pre-flight permission check for multi-author batching. Hits Discord's
  // /users/@me/guilds endpoint once, indexes guilds where the user has Manage
  // Messages or Administrator, and rejects any (server, non-self-author) pair
  // targeting a guild outside that index. DMs are skipped entirely (you only
  // have access to your own DM messages anyway). Returns true to proceed,
  // false to abort.
  async function checkBatchPermissions(jobs, authToken) {
    const selfId = getAuthorId(); // user's own ID from localStorage; null if read fails
    // Collect every (serverId → Set of non-self authors) we need to check.
    const pairs = new Map();
    for (const job of jobs) {
      if (job.guildId === '@me') continue;            // DMs don't need this check
      if (selfId && job.authorId === selfId) continue; // self-author = no perm needed
      if (!pairs.has(job.guildId)) pairs.set(job.guildId, new Set());
      pairs.get(job.guildId).add(job.authorId || '<any>');
    }
    if (pairs.size === 0) return true; // nothing to verify — self-only or DM-only run
  
    log.info('Pre-flight: checking Manage Messages permission for non-self authors...');
  
    let guilds;
    try {
      const resp = await fetch('https://discord.com/api/v9/users/@me/guilds', {
        headers: { 'Authorization': authToken },
      });
      if (!resp.ok) {
        log.error(`Pre-flight: couldn't fetch your guilds (status ${resp.status}). Aborting.`);
        return false;
      }
      guilds = await resp.json();
    } catch (err) {
      log.error('Pre-flight: network error fetching guilds. Aborting.', err);
      return false;
    }
  
    // Index guilds where the user has Manage Messages (0x2000) or Administrator (0x8).
    const MANAGE_MESSAGES = 0x2000n;
    const ADMINISTRATOR  = 0x8n;
    const validServers = new Set();
    for (const g of guilds) {
      const perms = BigInt(g.permissions || '0');
      if ((perms & ADMINISTRATOR) || (perms & MANAGE_MESSAGES)) validServers.add(g.id);
    }
  
    // Compare against queue. Aggregate failures by server so the user gets one
    // line per problematic server with all the relevant authors listed.
    const failures = [];
    for (const [serverId, authors] of pairs) {
      if (validServers.has(serverId)) continue;
      failures.push({ serverId, authors: [...authors] });
    }
    if (failures.length === 0) {
      log.info(`Pre-flight passed: you have Manage Messages on all ${pairs.size} server(s) targeted by non-self authors.`);
      return true;
    }
  
    for (const f of failures) {
      log.error(`You do not have permissions on Server id: ${f.serverId} to delete the messages of UserId('s): ${f.authors.join(', ')}`);
    }
    log.error('Run aborted by pre-flight permission check.');
    return false;
  }
  
  // Click handler for the ▶︎ Delete button. Reads every form input, captures the
  // auth token, parses the queue, expands jobs across (target × author), runs a
  // pre-flight permission check, and dispatches to undiscordCore.run() (single
  // target+author) or undiscordCore.runBatch() (multiple jobs).
  async function startAction() {
    // general
    const authorId = $('input#authorId').value.trim();
    // filter — include
    const content = $('input#search').value.trim();
    const hasLink    = $('input#hasLink').checked;
    const hasImage   = $('input#hasImage').checked;
    const hasVideo   = $('input#hasVideo').checked;
    const hasSound   = $('input#hasSound').checked;
    const hasSticker = $('input#hasSticker').checked;
    const hasPoll    = $('input#hasPoll').checked;
    const hasEmbed   = $('input#hasEmbed').checked;
    const hasForward = $('input#hasForward').checked;
    const mentions = $('input#mentionsId').value.trim();
    const mentionEveryone = $('input#mentionEveryone').checked;
    const pinnedMode = $('select#pinnedMode').value;
    // filter — exclude (applied client-side after the search response)
    const excludeContent = $('input#excludeSearch').value.trim();
    const excludeMatchMode = $('input#excludeMatchPill').checked ? 'substring' : 'exact';
    const excludeLink    = $('input#excludeLink').checked;
    const excludeImage   = $('input#excludeImage').checked;
    const excludeVideo   = $('input#excludeVideo').checked;
    const excludeSound   = $('input#excludeSound').checked;
    const excludeSticker = $('input#excludeSticker').checked;
    const excludePoll    = $('input#excludePoll').checked;
    const excludeEmbed   = $('input#excludeEmbed').checked;
    const excludeForward = $('input#excludeForward').checked;
    const excludeMentions = $('input#excludeMentionsId').value.trim();
    const excludeMentionEveryone = $('input#excludeMentionEveryone').checked;
    // message interval
    const minId = $('input#minId').value.trim();
    const maxId = $('input#maxId').value.trim();
    // date range
    const minDate = $('input#minDate').value.trim();
    const maxDate = $('input#maxDate').value.trim();
    // advanced (stepper-backed; raw ms lives in dataset)
    const searchDelay = getDelayMs('searchDelay');
    const deleteDelay = getDelayMs('deleteDelay');
    const streamerMode = $('input#streamerMode').checked;
  
    // ---- Validation ----
  
    // Snowflake IDs must be numeric and form a valid range.
    if (minId && !/^\d+$/.test(minId)) return log.error(`"After message ID" must be a numeric Discord ID, got: "${minId}"`);
    if (maxId && !/^\d+$/.test(maxId)) return log.error(`"Before message ID" must be a numeric Discord ID, got: "${maxId}"`);
    if (minId && maxId && BigInt(minId) >= BigInt(maxId)) {
      return log.error('"After message ID" must be older (smaller snowflake) than "Before message ID".');
    }
  
    // Author IDs may be comma-separated (each one expands the batch). Validate numeric.
    const authorList = authorId ? authorId.split(/\s*,\s*/).filter(Boolean) : [];
    for (const a of authorList) {
      if (!/^\d+$/.test(a)) return log.error(`Author ID list contains a non-numeric value: "${a}"`);
    }
    // Include @user is single-value — Discord's `mentions=` query param accepts only
    // one ID per request, so multi-build doesn't help on this side. The paste/select
    // helpers overwrite rather than append; reject if the user typed multiple manually.
    if (mentions && !/^\d+$/.test(mentions)) {
      return log.error(`"Include @user" must be a single numeric Discord ID. Multi-mention only works on the Skip side (Discord's search API can only filter to one mention at a time).`);
    }
    // Skip @user IS multi-value — applied client-side as a list check, so any number
    // of mentioned users can be skipped from a single run.
    const excludeMentionsList = excludeMentions ? excludeMentions.split(/\s*,\s*/).filter(Boolean) : [];
    for (const m of excludeMentionsList) {
      if (!/^\d+$/.test(m)) return log.error(`Skip mentions user ID list contains a non-numeric value: "${m}"`);
    }
  
    // Search-filter / Delete-filter overlap checks.
    if (content && excludeContent && content.toLowerCase() === excludeContent.toLowerCase()) {
      return log.error('Include text and Skip text are the same — nothing would match. Clear one.');
    }
    if (mentions && excludeMentionsList.includes(mentions)) {
      return log.error(`Include @user (${mentions}) is also in Skip @user — nothing would match. Remove from one.`);
    }
  
    // Datetime validation. Date inputs are live-clamped to Discord's epoch via
    // bindDateClamp() the moment the user commits a value, so by the time we get
    // here, the only remaining work is parse-check, default-empty-min, range-check.
    let minDateUsed = minDate;
    const maxDateUsed = maxDate;
    if (minDateUsed && Number.isNaN(new Date(minDateUsed).getTime())) {
      return log.error('Invalid "After date" — please re-enter using the date picker.');
    }
    if (maxDateUsed && Number.isNaN(new Date(maxDateUsed).getTime())) {
      return log.error('Invalid "Before date" — please re-enter using the date picker.');
    }
    if (!minDateUsed) minDateUsed = DISCORD_EPOCH_LOCAL;
    const minDateMs = new Date(minDateUsed).getTime();
    const maxDateMs = maxDateUsed ? new Date(maxDateUsed).getTime() : null;
    if (maxDateMs !== null && minDateMs >= maxDateMs) {
      return log.error('"After date" must be earlier than "Before date".');
    }
  
    // Warn if both intervals are set — the message-ID range wins, the date range is ignored.
    if ((minId || maxId) && (minDate || maxDate)) {
      log.warn('Both Message interval and Date interval are set — Message interval takes precedence.');
    }
  
    // token (auto-fetched, no manual input)
    const authToken = fillToken();
    if (!authToken) return; // fillToken already logs an error.
  
    // Build the target list from the two parallel CSVs.
    const { targets, orphans } = parseTargets();
    if (!targets.length) return log.error('You must fill the "Server ID" field!');
    if (orphans) log.warn(`${orphans} channel entr${orphans === 1 ? 'y has' : 'ies have'} no server and will be skipped. Channels need a parent server.`);
  
    // Expand (target × author) into per-job entries. DMs are intentionally excluded
    // from multi-author batching — Discord won't let you delete other users' DM
    // messages, so DMs only ever spawn one job each (with the first author in the
    // list, presumed to be self).
    const jobs = [];
    for (const t of targets) {
      if (t.guildId === '@me') {
        if (authorList.length > 1) {
          log.warn(`DM ${t.channelId}: multi-author batching skipped — DMs only support self-author. Using first author (${authorList[0]}).`);
        }
        jobs.push({ ...t, authorId: authorList[0] || '' });
      } else if (authorList.length > 1) {
        for (const a of authorList) jobs.push({ ...t, authorId: a });
      } else {
        jobs.push({ ...t, authorId: authorList[0] || '' });
      }
    }
  
    // Pre-flight permission check: any non-DM job with a non-self author needs
    // Manage Messages or Administrator on its target server. One API call total.
    const ok = await checkBatchPermissions(jobs, authToken);
    if (!ok) return;
  
    ui.logArea.innerHTML = '';
  
    undiscordCore.resetState();
    // Common options applied to every job. guildId/channelId/authorId are set per-job below.
    undiscordCore.options = {
      ...undiscordCore.options,
      authToken,
      authorId,
      minId: minId || minDateUsed,
      maxId: maxId || maxDateUsed,
      content,
      hasLink,
      hasImage,
      hasVideo,
      hasSound,
      hasSticker,
      hasPoll,
      hasEmbed,
      hasForward,
      mentions, // single ID (validated above)
      mentionEveryone,
      pinnedMode,
      excludeContent,
      excludeMatchMode,
      excludeLink,
      excludeImage,
      excludeVideo,
      excludeSound,
      excludeSticker,
      excludePoll,
      excludeEmbed,
      excludeForward,
      excludeMentions, // comma-separated string; core parses into a list at filter time
      excludeMentionEveryone,
      searchDelay,
      deleteDelay,
      streamerMode,
    };
  
    if (jobs.length === 1) {
      undiscordCore.options.guildId  = jobs[0].guildId;
      undiscordCore.options.channelId = jobs[0].channelId; // '' = server-wide
      undiscordCore.options.authorId  = jobs[0].authorId;
      try { await undiscordCore.run(); }
      catch (err) { log.error('CoreException', err); undiscordCore.stop(); }
    } else {
      try { await undiscordCore.runBatch(jobs); }
      catch (err) { log.error('CoreException', err); }
    }
  }
  
  // Click handler for the 🛑 Stop button. Forwards to core.stop().
  function stopAction() {
    undiscordCore.stop();
  }
  
  
  __exports.default = initUI;
};

__modules["src/index.js"] = (__exports) => {
  // Userscript entry point. Tampermonkey/Violentmonkey runs this once when Discord
  // loads; initUI() injects the panel and FAB. No work happens until the user clicks Delete.const initUI = __require("src/undiscord-ui.js").default;
  initUI();
  
};

__require("src/index.js");
})();
