// ==UserScript==
// @name        Undiscord Lite
// @description Bulk-delete Discord messages. Zero-dependency personal fork of Undiscord with multi-server batching.
// @version     1.1.0
// @namespace   https://github.com/OrbitalCheese/undiscord-lite
// @match       https://*.discord.com/app
// @match       https://*.discord.com/channels/*
// @grant       none
// @author      OrbitalCheese
// @license     MIT
// @homepageURL https://github.com/OrbitalCheese/undiscord-lite
// @supportURL  https://github.com/OrbitalCheese/undiscord-lite/issues
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
  __exports.default = "/* ============================================================================\n * PALETTE\n * ----------------------------------------------------------------------------\n * Self-contained dark palette pinned to hardcoded hex values — does not read\n * from Discord's --background-* / --text-* CSS variables, so custom themes\n * (BetterDiscord, Vencord, etc.) cannot recolour the panel. Centralised here\n * so the whole scheme can be retuned in one place without touching individual\n * rules.\n * ============================================================================ */\n#undiscord { --_u-bg-panel:        #2b2d31; --_u-bg-header:       #1e1f22; --_u-bg-sidebar:      #17181b; /* deliberately darker than --_u-bg-input so text fields visually sit on top of the sidebar instead of blending into it */   --_u-bg-main:         #313338; --_u-bg-toolbar:      #2b2d31; --_u-bg-input:        #1e1f22; --_u-bg-floating:     #111214; --_u-bg-hover:        #35373c; --_u-bg-accent:       #3f4147; --_u-bg-surface-high: #2b2d31; --_u-text:        #dbdee1; --_u-text-muted:  #949ba4; --_u-text-header: #f2f3f5; --_u-text-label:  #b5bac1; --_u-text-link:   #00a8fc; --_u-int:        #b5bac1; --_u-int-hover:  #dbdee1; --_u-int-active: #ffffff; --_u-int-muted:  #6d6f78; --_u-btn-secondary: #4e5058; --_u-btn-danger:    #da373c; --_u-border:       rgba(78, 80, 88, 0.48); --_u-input-border: #1e1f22; --_u-scrollbar-thumb: rgba(24, 25, 28, 0.6); --_u-scrollbar-track: transparent; --_u-shadow:        0 8px 16px rgba(0, 0, 0, 0.24); --_u-shadow-stroke: 0 0 0 1px rgba(0, 0, 0, 0.2); --_u-font-display:  'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; }\n/* undiscord window */\n#undiscord.browser { box-shadow: var(--_u-shadow-stroke), var(--_u-shadow); border: 1px solid var(--_u-border); overflow: hidden; }\n#undiscord.container,\n#undiscord .container { background-color: var(--_u-bg-surface-high); border-radius: 8px; box-sizing: border-box; cursor: default; flex-direction: column; }\n#undiscord .header { background-color: var(--_u-bg-header); height: 48px; align-items: center; min-height: 48px; padding: 0 16px; display: flex; color: var(--_u-text-label); }\n#undiscord .header .icon { color: var(--_u-int); margin-right: 8px; flex-shrink: 0; width: 24; height: 24; }\n#undiscord .header .icon:hover { color: var(--_u-int-hover); }\n#undiscord .header h3 { font-size: 16px; line-height: 20px; font-weight: 500; font-family: var(--_u-font-display); color: var(--_u-text-header); flex-shrink: 0; margin-right: 16px; }\n#undiscord .spacer { flex-grow: 1; }\n#undiscord .header .vert-divider { width: 1px; height: 24px; background-color: var(--_u-bg-accent); margin-right: 16px; flex-shrink: 0; }\n#undiscord legend,\n#undiscord label { color: var(--_u-text-label); font-size: 12px; line-height: 16px; font-weight: 500; text-transform: uppercase; cursor: default; font-family: var(--_u-font-display); margin-bottom: 8px; }\n#undiscord .multiInput { display: flex; align-items: center; font-size: 16px; box-sizing: border-box; width: 100%; border-radius: 3px; color: var(--_u-text); background-color: var(--_u-bg-input); border: none; transition: border-color 0.2s ease-in-out 0s; }\n#undiscord .multiInput :first-child { flex-grow: 1; }\n#undiscord .multiInput button:last-child { margin-right: 4px; }\n#undiscord .multiInput button + button { margin-left: 3px; }\n#undiscord .input-actions { display: flex; gap: 4px; margin-top: 6px; }\n#undiscord .input-actions button { flex: 1; /* Tighter horizontal padding than the base 16px so longer labels (Select, Delete) fit. */     padding: 2px 6px; }\n/* Action button accents — set: tinge-darker gray, add: muted forest green, del: bordeaux. */\n#undiscord .input-actions button[id^=\"set\"]    { background-color: #3f4147; }\n#undiscord .input-actions button[id^=\"add\"]    { background-color: #3a7d4d; }\n#undiscord .input-actions button[id^=\"del\"]    { background-color: #722f37; }\n/* Select buttons: blue when idle, amber while waiting for a click, light purple\n   while waiting AND Shift is held (shift-lock — multi-capture mode). */\n#undiscord .input-actions button[id^=\"select\"]                       { background-color: #2c5d8e; }\n#undiscord .input-actions button[id^=\"select\"].active                { background-color: #b8860b; }\n#undiscord .input-actions button[id^=\"select\"].active.shift-locked   { background-color: #a78bfa; }\n/* Global crosshair cursor while any Select button is armed. */\nbody.undiscord-selecting,\nbody.undiscord-selecting * { cursor: crosshair !important; }\n/* Inline Clear buttons — sit absolutely on the right edge of any text-input\n   wrapper. The .clearable class on the input adds matching right padding so\n   typed text doesn't slide under the button. */\n#undiscord .input-wrapper { position: relative; }\n#undiscord input.clearable { padding-right: 60px; }\n#undiscord button.clear-btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: auto; min-width: 0; height: 28px; min-height: 28px; padding: 0 10px; font-size: 11px; font-weight: 500; background-color: #4e5058; color: var(--_u-text); border-radius: 4px; cursor: pointer; z-index: 1; }\n/* Date-preset shortcuts — green/amber/red traffic-light scaling with scope. */\n#undiscord .date-preset-day  { background-color: #3a7d4d; }\n#undiscord .date-preset-week { background-color: #b8860b; }\n#undiscord .date-preset-all  { background-color: #722f37; }\n/* Stepper rows for the delay controls. Compact buttons next to a read-only display. */\n#undiscord .stepper { display: flex; align-items: center; gap: 4px; margin-top: 6px; }\n/* Input is fixed at 100px and text-left-aligned so short values don't drift.\n   Stepper buttons (flex: 1) grow to fill the remaining horizontal space\n   equally. The input is editable — typed values auto-clamp on commit. */\n#undiscord .stepper input[type=\"text\"] { flex: 0 0 100px; text-align: left; cursor: text; }\n#undiscord .stepper button { flex: 1; width: auto; min-width: 32px; padding: 0; font-weight: 700; }\n#undiscord .stepper-down { background-color: #722f37; }\n#undiscord .stepper-up { background-color: #3a7d4d; }\n#undiscord .stepper-reset { background-color: #2c5d8e; }\n/* Compact help button — pinned to the top-right of its fieldset (sibling of the\n   legend, since <legend> rendering doesn't reliably honor display:flex). The\n   right edge sits flush with the input/control edges below it. */\n#undiscord fieldset { position: relative; }\n#undiscord button.help-btn { position: absolute; top: -23px; right: 0; width: auto; min-width: 0; height: 16px; min-height: 16px; padding: 0 6px; font-size: 10px; font-weight: 500; text-transform: uppercase; border: none; border-radius: 3px; background-color: #2c5d8e; color: #ffffff; cursor: pointer; }\n/* Tab-level help button: vertically centered inside the <summary>, right-aligned. */\n#undiscord summary button.help-btn { top: 50%; right: 8px; transform: translateY(-50%); }\n/* Has-type checkbox grid — 2 per row inside the Include filter. */\n#undiscord .has-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 12px; }\n#undiscord .has-grid label { display: flex; align-items: center; margin-bottom: 0; text-transform: none; cursor: pointer; }\n#undiscord .has-grid input[type=\"checkbox\"] { margin-right: 6px; }\n/* Select dropdown styling — match the dark panel. */\n#undiscord select { background-color: var(--_u-bg-input); color: var(--_u-text); border: 1px solid var(--_u-input-border); border-radius: 4px; padding: 4px 6px; font-family: var(--_u-font-display); font-size: 14px; cursor: pointer; }\n/* Pill-style on/off toggle. Replaces every native checkbox visual inside the\n   panel: red when off, green when on. The .has-grid override below tightens\n   margin in the dense 2-column grids. */\n#undiscord input[type=\"checkbox\"] { appearance: none; -webkit-appearance: none; position: relative; width: 36px; height: 18px; margin: 0 8px 0 0; padding: 0; border: none; border-radius: 9px; background-color: #722f37; cursor: pointer; transition: background-color 0.2s ease; vertical-align: middle; flex-shrink: 0; }\n#undiscord input[type=\"checkbox\"]::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background-color: #ffffff; transition: transform 0.2s ease; }\n#undiscord input[type=\"checkbox\"]:checked { background-color: #3a7d4d; }\n#undiscord input[type=\"checkbox\"]:checked::after { transform: translateX(18px); }\n#undiscord .input { font-size: 16px; width: 100%; transition: border-color 0.2s ease-in-out 0s; padding: 10px; height: 44px; background-color: var(--_u-bg-input); border: 1px solid var(--_u-input-border); border-radius: 8px; box-sizing: border-box; color: var(--_u-text); }\n#undiscord fieldset { margin-top: 16px; }\n#undiscord .input-wrapper { display: flex; align-items: center; font-size: 16px; box-sizing: border-box; width: 100%; border-radius: 3px; color: var(--_u-text); background-color: var(--_u-bg-input); border: none; transition: border-color 0.2s ease-in-out 0s; }\n#undiscord input[type=\"text\"],\n#undiscord input[type=\"search\"],\n#undiscord input[type=\"password\"],\n#undiscord input[type=\"datetime-local\"],\n#undiscord input[type=\"number\"],\n#undiscord input[type=\"range\"] { background-color: var(--_u-bg-input); border: 1px solid var(--_u-input-border); border-radius: 8px; box-sizing: border-box; color: var(--_u-text); font-size: 16px; height: 44px; padding: 12px 10px; transition: border-color .2s ease-in-out; width: 100%; }\n#undiscord input[type=\"file\"] { color: var(--_u-text); }\n#undiscord hr { border: none; margin-bottom: 24px; padding-bottom: 4px; border-bottom: 1px solid var(--_u-bg-accent); }\n#undiscord .sectionDescription { margin-bottom: 16px; color: var(--_u-text-label); font-size: 14px; line-height: 20px; font-weight: 400; }\n#undiscord a { color: var(--_u-text-link); text-decoration: none; }\n#undiscord a:hover { text-decoration: underline; }\n#undiscord .btn,\n#undiscord button { position: relative; display: flex; -webkit-box-pack: center; justify-content: center; -webkit-box-align: center; align-items: center; box-sizing: border-box; background: none; border: none; border-radius: 3px; font-size: 14px; font-weight: 500; line-height: 16px; padding: 2px 16px; user-select: none; cursor: pointer; /* sizeSmall */     width: 60px; height: 32px; min-width: 60px; min-height: 32px; /* lookFilled colorPrimary */     color: #ffffff; background-color: var(--_u-btn-secondary); transition: background-color 0.15s ease, filter 0.15s ease; }\n#undiscord .btn:hover,\n#undiscord button:hover { filter: brightness(1.15); }\n#undiscord button:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }\n#undiscord .sizeMedium { width: 96px; height: 38px; min-width: 96px; min-height: 38px; }\n#undiscord .sizeMedium.icon { width: 38px; min-width: 38px; }\n#undiscord sup { vertical-align: top; }\n#undiscord .danger { background-color: var(--_u-btn-danger); }\n/* Verify-button accent — a darker navy than the existing #2c5d8e Select-button\n   blue so it reads as a distinct, secondary action and doesn't get mistaken\n   for a Select-mode trigger. */\n#undiscord .verify-mode { background-color: #1e4470; }\n/* Scrollbar */\n#undiscord .scroll::-webkit-scrollbar { width: 8px; height: 8px; }\n#undiscord .scroll::-webkit-scrollbar-corner { background-color: transparent; }\n#undiscord .scroll::-webkit-scrollbar-thumb { background-clip: padding-box; border: 2px solid transparent; border-radius: 4px; background-color: var(--_u-scrollbar-thumb); min-height: 40px; }\n#undiscord .scroll::-webkit-scrollbar-track { border-color: var(--_u-scrollbar-track); background-color: var(--_u-scrollbar-track); border: 2px solid var(--_u-scrollbar-track); }\n/* fade scrollbar */\n#undiscord .scroll::-webkit-scrollbar-thumb,\n#undiscord .scroll::-webkit-scrollbar-track { visibility: hidden; }\n#undiscord .scroll:hover::-webkit-scrollbar-thumb,\n#undiscord .scroll:hover::-webkit-scrollbar-track { visibility: visible; }\n#undiscord :disabled { display: none; }\n/**** layout and utility classes ****/\n#undiscord,\n#undiscord * { box-sizing: border-box; }\n#undiscord .col { display: flex; flex-direction: column; }\n#undiscord .row { display: flex; flex-direction: row; align-items: center; }\n#undiscord .mb1 { margin-bottom: 8px; }\n#undiscord .log { margin-bottom: 0.25em; }\n#undiscord .log-debug { color: var(--_u-text); }\n#undiscord .log-info { color: #00b0f4; }\n#undiscord .log-verb { color: var(--_u-text-muted); }\n#undiscord .log-warn { color: #faa61a; }\n#undiscord .log-error { color: #f04747; }\n#undiscord .log-success { color: #43b581; }\n/**** Undiscord Button (FAB) ****/\n#undiscord-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #18191c; color: #b5bac1; border-radius: 50%; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); cursor: pointer; transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease; }\n#undiscord-btn:hover { color: #ffffff; background: #2e3035; transform: scale(1.05); }\n#undiscord-btn:focus-visible { outline: 2px solid #5865f2; outline-offset: 2px; }\n#undiscord-btn progress { position: absolute; bottom: 4px; left: 8px; width: 32px; height: 4px; display: none; }\n#undiscord-btn.running { color: #da373c !important; }\n#undiscord-btn.running progress { display: block; }\n/**** Undiscord Interface ****/\n#undiscord { position: fixed; z-index: 100; top: 58px; right: 10px; display: flex; flex-direction: column; width: 800px; height: 80vh; min-width: 610px; max-width: 100vw; min-height: 448px; max-height: 100vh; color: var(--_u-text); border-radius: 4px; background-color: var(--_u-bg-panel); box-shadow: var(--_u-shadow-stroke), var(--_u-shadow); will-change: top, left, width, height; }\n#undiscord .header .icon { cursor: pointer; }\n#undiscord .window-body { height: calc(100% - 48px); }\n#undiscord .sidebar { /* Always reserve scrollbar space — overflow-y: scroll keeps the gutter\n       even when content fits, so right-aligned elements don't shift when the\n       sidebar starts overflowing. Fade-on-hover .scroll rules still hide the\n       bar visually until mouseover. */\n    overflow-x: hidden; overflow-y: scroll; /* flex-shrink: 0 locks the sidebar at its target width regardless of what\n       .main wants — without it, log content growing inside .main pulls space\n       from the sidebar via the flex layout, shifting everything in here. */\n    width: 270px; flex-shrink: 0; height: 100%; max-height: 100%; padding: 8px; background: var(--_u-bg-sidebar); }\n#undiscord .sidebar legend,\n#undiscord .sidebar label { display: block; width: 100%; }\n#undiscord .main { display: flex; max-width: calc(100% - 250px); background-color: var(--_u-bg-main); flex-grow: 1; }\n#undiscord #logArea { font-family: Consolas, Liberation Mono, Menlo, Courier, monospace; font-size: 0.75rem; overflow: auto; padding: 10px; user-select: text; flex-grow: 1; cursor: auto; /* Wrap long lines at the panel's right edge instead of overflowing horizontally.\n       pre-wrap preserves intentional whitespace; overflow-wrap breaks unbroken\n       strings (URLs, snowflakes) when no whitespace is available to wrap on. */\n    white-space: pre-wrap; overflow-wrap: break-word; }\n#undiscord .tbar { padding: 8px; background-color: var(--_u-bg-toolbar); }\n#undiscord .tbar button { margin-right: 4px; margin-bottom: 4px; }\n/* Top-bar status line. Idle state: a queue/import summary or empty-queue hint.\n   Running state: live progress text (percent / value / elapsed / remaining).\n   Lives inside #topBarSlot which is the first row of the top toolbar above the\n   log area; the second row holds the visual <progress> element. */\n#undiscord #topBarSlot { flex-grow: 1; min-height: 20px; }\n#undiscord .status-line { padding: 2px 6px; font-size: 13px; color: var(--_u-text-muted); line-height: 20px; }\n#undiscord .status-line.status-empty { font-style: italic; }\n#undiscord .status-line.status-running { color: var(--_u-text); font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 12px; letter-spacing: 0.2px; }\n/**** Elements ****/\n#undiscord summary { font-size: 16px; font-weight: 500; line-height: 20px; position: relative; overflow: hidden; margin-bottom: 2px; padding: 6px 10px; cursor: pointer; white-space: nowrap; text-overflow: ellipsis; color: var(--_u-int); border-radius: 4px; flex-shrink: 0; }\n#undiscord summary:hover { color: var(--_u-int-hover); background-color: var(--_u-bg-hover); }\n#undiscord fieldset { padding-left: 8px; }\n#undiscord legend a { float: right; text-transform: initial; }\n#undiscord progress { height: 8px; margin-top: 4px; flex-grow: 1; }\n#undiscord .importJson { display: flex; flex-direction: row; }\n#undiscord .importJson button { margin-left: 5px; width: fit-content; }\n/**** Drag/resize handles ****/\n[name^=\"grab-\"] { position: absolute; --size: 6px; --corner-size: 16px; --offset: -1px; z-index: 9; }\n[name^=\"grab-\"]:hover { background: rgba(128, 128, 128, 0.1); }\n[name=\"grab-t\"] { top: 0; left: var(--corner-size); right: var(--corner-size); height: var(--size); margin-top: var(--offset); cursor: ns-resize; }\n[name=\"grab-r\"] { top: var(--corner-size); bottom: var(--corner-size); right: 0; width: var(--size); margin-right: var(--offset); cursor: ew-resize; }\n[name=\"grab-b\"] { bottom: 0; left: var(--corner-size); right: var(--corner-size); height: var(--size); margin-bottom: var(--offset); cursor: ns-resize; }\n[name=\"grab-l\"] { top: var(--corner-size); bottom: var(--corner-size); left: 0; width: var(--size); margin-left: var(--offset); cursor: ew-resize; }\n[name=\"grab-tl\"] { top: 0; left: 0; width: var(--corner-size); height: var(--corner-size); margin-top: var(--offset); margin-left: var(--offset); cursor: nwse-resize; }\n[name=\"grab-tr\"] { top: 0; right: 0; width: var(--corner-size); height: var(--corner-size); margin-top: var(--offset); margin-right: var(--offset); cursor: nesw-resize; }\n[name=\"grab-br\"] { bottom: 0; right: 0; width: var(--corner-size); height: var(--corner-size); margin-bottom: var(--offset); margin-right: var(--offset); cursor: nwse-resize; }\n[name=\"grab-bl\"] { bottom: 0; left: 0; width: var(--corner-size); height: var(--corner-size); margin-bottom: var(--offset); margin-left: var(--offset); cursor: nesw-resize; }\n/**** Decorative resize indicator + cursor hints ****/\n#undiscord .header { cursor: grab; }\n#undiscord .footer { cursor: se-resize; padding-right: 30px; }\n.resize-handle { position: absolute; bottom: -15px; right: -15px; width: 30px; height: 30px; transform: rotate(-45deg); background: repeating-linear-gradient(0, var(--_u-bg-accent), var(--_u-bg-accent) 1px, transparent 2px, transparent 4px); cursor: nwse-resize; }\n/* ============================================================================\n * SERVER-BAR TRASH ICON\n * ----------------------------------------------------------------------------\n * Injected into Discord's left rail between the DM/Home separator and the\n * first server. Mimics Discord's server-icon shape-morph: circle at rest,\n * rounded square on hover/active. Lives outside #undiscord, so selectors\n * are global.\n * ============================================================================ */\n#undiscord-server-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; cursor: pointer; position: relative; user-select: none; }\n#undiscord-server-btn .udl-blob { width: 40px; height: 40px; border-radius: 50%; background-color: #1e1f22; color: #b5bac1; display: flex; align-items: center; justify-content: center; position: relative; transition: border-radius 0.15s ease, background-color 0.15s ease, color 0.15s ease; }\n#undiscord-server-btn:hover .udl-blob { border-radius: 16px; background-color: #da373c; color: #ffffff; }\n#undiscord-server-btn.running .udl-blob { border-radius: 16px; background-color: #da373c; color: #ffffff; }\n#undiscord-server-btn .udl-progress { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 28px; height: 4px; display: none; }\n#undiscord-server-btn.running .udl-progress { display: block; }\n/* Stoplight-amber progress on white track — grows as deletes complete, contrasts\n   cleanly against the red running-state blob. */\n#undiscord-server-btn .udl-progress::-webkit-progress-bar { background-color: #ffffff; border-radius: 2px; }\n#undiscord-server-btn .udl-progress::-webkit-progress-value { background-color: #b8860b; border-radius: 2px; transition: width 0.2s ease; }\n#undiscord-server-btn .udl-progress::-moz-progress-bar { background-color: #b8860b; border-radius: 2px; }\n/* ============================================================================\n * STREAMER MODE\n * ----------------------------------------------------------------------------\n * When the Streamer mode toggle is on (panel root carries .streamer-on),\n * every input field that holds a Discord ID renders its value as dots so\n * screen recordings, streams, and shoulder-surfing don't leak user / server\n * / channel / message IDs. Placeholders stay readable. The text-content\n * filter inputs, date pickers, and delay steppers stay readable too — those\n * don't carry sensitive IDs.\n *\n * `text-security` is the unprefixed proposed standard; `-webkit-text-security`\n * is what Chromium / Discord's Electron client honours today.\n * ============================================================================ */\n#undiscord.streamer-on input#authorId,\n#undiscord.streamer-on input#guildId,\n#undiscord.streamer-on input#channelId,\n#undiscord.streamer-on input#mentionsId,\n#undiscord.streamer-on input#excludeMentionsId,\n#undiscord.streamer-on input#minId,\n#undiscord.streamer-on input#maxId,\n#undiscord.streamer-on input#importExcludeServers,\n#undiscord.streamer-on input#importExcludeChannels,\n#undiscord.streamer-on input#importExcludeUsers { -webkit-text-security: disc; text-security: disc; }\n/* Dual-span redaction for log lines. Every log redaction emits both a `.sm-real`\n   span (the actual value) and a `.sm-redacted` span (the dotted placeholder); CSS shows exactly one of them based on whether `.streamer-on` is set on the\n   panel root. Toggling streamer mode mid-run instantly re-renders every\n   already-printed log line — no log replay needed. */\n#undiscord .sm-redacted { display: none; }\n#undiscord.streamer-on .sm-real { display: none; }\n#undiscord.streamer-on .sm-redacted { display: inline; }\n/* ============================================================================\n * SIDEBAR ACTION GROUP\n * ----------------------------------------------------------------------------\n * Pinned at the top of the sidebar above all <details> sections. Two stacked\n * full-width buttons: the primary action (#start) on row 1, Clear Log on\n * row 2. The primary's text / class / handler toggles between \"▶︎ Delete\"\n * (idle, red) and \"🛑 Stop\" (running, red) — same physical button, two\n * roles, no layout reflow when a run starts.\n * ============================================================================ */\n#undiscord #sidebarActions { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }\n#undiscord #sidebarActions > button { width: 100%; min-width: 0; height: 38px; min-height: 38px; padding: 2px 6px; }\n/* Reset / Batch selection row — two equally-wide buttons under the Delete /\n   Verify / Clear log group. Reset Selection wipes the form back to defaults; Batch Selection snapshots the form into the meta-batch queue and resets. */\n#undiscord #sidebarSelectionRow { display: flex; flex-direction: row; gap: 4px; margin-bottom: 6px; }\n#undiscord #sidebarSelectionRow > button { flex: 1; width: auto; min-width: 0; height: 32px; min-height: 32px; padding: 2px 6px; }\n#undiscord .reset-selection { background-color: #4e5058; }\n/* Same forest green as the per-section Add buttons — reads as \"additive\"\n   alongside Reset Selection's neutral grey. The queue count lives in the\n   amber badge below, not in the button label. */\n#undiscord .queue-selection { background-color: #3a7d4d; }\n/* Centred badge row directly below the action buttons. When every badge is\n   hidden the row still occupies a few px of vertical space above the <hr> —\n   visually negligible (~4px), and avoids the fragility of selecting on inline\n   display:none across HTML/JS serialization quirks. */\n#undiscord #sidebarBadgeRow { text-align: center; margin-bottom: 4px; display: flex; flex-direction: row; justify-content: center; gap: 6px; flex-wrap: wrap; }\n/* Queue counter badge — shown next to the import-mode chip when one or more\n   selection snapshots are queued. Same pill geometry, different colour so the\n   two states are visually distinct at a glance. */\n#undiscord #queueBadge.queue-badge { background: #b8860b; color: #ffffff; border-radius: 4px; padding: 3px 9px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin: 0; display: inline-flex; align-items: center; user-select: none; font-family: var(--_u-font-display); }\n/* Drop-batches chip — same pill geometry as the queue counter, but bordeaux\n   red (matching the global Delete button accents elsewhere) since it's\n   destructive. Shown to the left of the queue counter only when the queue\n   is non-empty. Overrides the global #undiscord button rules so it sizes as\n   a chip rather than a 60×32 button. */\n#undiscord #dropBatches.drop-batches { background: #722f37; color: #ffffff; border-radius: 4px; padding: 3px 9px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin: 0; width: auto; min-width: 0; height: auto; min-height: 0; display: inline-flex; align-items: center; user-select: none; font-family: var(--_u-font-display); cursor: pointer; }\n/* Mini-header for grouped pill toggles (\"Exclude all\" above the import-mode\n   wildcards). Mirrors the legend look — uppercase, label colour, modest size\n   — without the full fieldset border, since these pills are a sub-group of\n   their parent fieldset rather than a peer. */\n#undiscord .pill-group-label { margin-top: 12px; margin-bottom: 4px; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px; color: var(--_u-text-label); }\n/* Import-mode exclusion pills — three checkboxes styled as compact toggles\n   beneath the Exclude-all mini-header. Reuses the global pill checkbox visual\n   but arranges them in a horizontal grid that wraps on narrow widths. */\n#undiscord .import-type-pills { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px 12px; }\n#undiscord .import-type-pills label.pill { display: inline-flex; align-items: center; margin-bottom: 0; text-transform: none; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--_u-text-label); }\n#undiscord .import-type-pills label.pill input[type=\"checkbox\"] { margin-right: 6px; }\n/* ============================================================================\n * FOOTER TOGGLES\n * ----------------------------------------------------------------------------\n * Streamer mode + Auto scroll inline labels in the footer row, plus the live\n * elapsed/remaining readout pinned to the footer's left edge during a run.\n * ============================================================================ */\n/* Tighter spacing and no uppercase styling (overrides the global label rule). */\n#undiscord .footer .footer-toggle { margin-bottom: 0; margin-right: 12px; text-transform: none; font-size: 13px; font-weight: 400; cursor: pointer; }\n/* Live elapsed/remaining readout — populated by onProgress, cleared by onStop.\n   Tied to the LEFT edge of the footer (the spacer pushes the toggles right).\n   Empty when idle, monospace+muted when active so the digits don't shift. */\n#undiscord .footer #footerTime { font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 12px; color: var(--_u-text-muted); letter-spacing: 0.2px; padding-left: 4px; }\n/* ============================================================================\n * IMPORT MODE\n * ----------------------------------------------------------------------------\n * Status chip + section greying when an export is loaded. The General queue\n * and Search filter sections grey out (the import IS the queue); individual\n * Skip-filter toggles whose data isn't carried by the export grey out\n * separately via the .import-noop class.\n * ============================================================================ */\n/* The \"import mode\" status chip — shown in the sidebar's badge row when an\n   export is loaded. Discord-blurple, reads as a status indicator (no hover state). */\n#undiscord #importBadge.import-badge { background: #5865f2; color: #ffffff; border-radius: 4px; padding: 3px 9px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin: 0; display: inline-flex; align-items: center; user-select: none; font-family: var(--_u-font-display); }\n/* When an import is loaded, the General queue + Search filter sections are\n   not consulted at run time. Grey their fieldsets and disable interaction so\n   the user can see at a glance which inputs apply. The <summary> stays\n   clickable so sections can still be collapsed/expanded for inspection.\n   The Delete filter section stays interactive — its working toggles (text,\n   link, image/video/sound) apply during the import-mode pre-pass. Toggles\n   that need data the export doesn't carry (sticker, poll, embed, forward,\n   mentions) are individually marked .import-noop and grey out below. */\n#undiscord.import-mode #sectionGeneral > fieldset,\n#undiscord.import-mode #sectionSearchFilter > fieldset { opacity: 0.4; pointer-events: none; filter: grayscale(0.4); }\n#undiscord.import-mode .import-noop { opacity: 0.4; pointer-events: none; filter: grayscale(0.4); }\n/* The Import section's summary uses the same gray as every other <summary>\n   when idle. When an import is loaded, .import-mode bumps the weight to 600\n   so the active state is visually distinct. */\n#undiscord.import-mode #sectionImport > summary { font-weight: 600; }\n/* Summary line under the file picker — a one-liner that fills in once parsing\n   finishes. Wraps because long timestamp ranges otherwise overflow the sidebar. */\n#undiscord #importSummary { font-size: 11px; color: var(--_u-text-muted); word-break: break-word; line-height: 1.4; }\n#undiscord.import-mode #importSummary { color: var(--_u-text); }\n";
};

__modules["src/ui/undiscord.html"] = (__exports) => {
  __exports.default = "<div id=\"undiscord\" class=\"browser container\" style=\"display:none;\">\n    <div class=\"header\">\n        <svg class=\"icon\" aria-hidden=\"false\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n            <path fill=\"currentColor\" d=\"M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z\"></path>\n            <path fill=\"currentColor\"\n                d=\"M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z\">\n            </path>\n        </svg>\n        <h3>Undiscord Lite</h3>\n        <div class=\"vert-divider\"></div>\n        <span> Bulk delete messages</span>\n        <div class=\"spacer\"></div>\n        <div id=\"hide\" class=\"icon\" aria-label=\"Minimize\" role=\"button\" tabindex=\"0\" title=\"Minimize (run continues in background)\">\n            <svg aria-hidden=\"false\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n                <path fill=\"currentColor\" d=\"M5 18h14v3H5z\"></path>\n            </svg>\n        </div>\n    </div>\n    <div class=\"window-body\" style=\"display: flex; flex-direction: row;\">\n        <div class=\"sidebar scroll\">\n            <div id=\"sidebarActions\">\n                <button id=\"start\" class=\"danger\" title=\"Start the deletion process\">▶︎ Delete</button>\n                <button id=\"verify\" class=\"verify-mode\" title=\"Print the current run configuration to the log so you can sanity-check it before clicking Delete.\">📋 Verify</button>\n                <button id=\"clear\" title=\"Clear the log area\">🗑️ Clear Log</button>\n            </div>\n            <div id=\"sidebarSelectionRow\">\n                <button id=\"resetSelection\" class=\"reset-selection\" title=\"Reset every input field in the sidebar to its default value (does not clear the log or any queued batches).\">↺ Reset Selection</button>\n                <button id=\"queueSelection\" class=\"queue-selection\" title=\"Snapshot the current selection as a queued batch, then reset the form. Click ▶︎ Delete to run all queued batches sequentially. Pre-flight runs at queue time when non-self authors are present.\">Batch Selection +</button>\n            </div>\n            <div id=\"sidebarBadgeRow\">\n                <span id=\"importBadge\" class=\"import-badge\" style=\"display:none;\" title=\"An imported export is loaded. The General queue, Search filter, and Delete filter sections are ignored — only Date and Messages interval still apply.\">import mode</span>\n                <button id=\"dropBatches\" class=\"drop-batches\" style=\"display:none;\" title=\"Discard every queued batch. Does not affect the current form.\">drop batches</button>\n                <span id=\"queueBadge\" class=\"queue-badge\" style=\"display:none;\" title=\"Number of selection snapshots queued. Click ▶︎ Delete to run them sequentially.\">queued: 0</span>\n            </div>\n            <hr>\n            <details id=\"sectionGeneral\" open>\n                <summary>General<button class=\"help-btn\" data-help=\"tabGeneral\" title=\"Show help for the General tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Author ID</legend>\n                    <button class=\"help-btn\" data-help=\"authorId\" title=\"Show help for Author ID\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input clearable\" id=\"authorId\" type=\"text\" placeholder=\"Author ID(s)\">\n                        <button class=\"clear-btn\" id=\"clearAuthor\" title=\"Clear Author ID\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"getAuthor\">Me</button>\n                        <button id=\"selectAuthor\" title=\"Click, then click a user or message in Discord to capture their User ID. Hold Shift to capture multiple in a row.\">Select</button>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 6px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\" title=\"When checked, age-gated NSFW channels are excluded from Discord's search results. Default: off (NSFW channels are included).\">\n                            <input id=\"excludeNsfw\" type=\"checkbox\">\n                            Exclude NSFW channels\n                        </label>\n                    </div>\n                </fieldset>\n                <hr>\n                <fieldset>\n                    <legend>Server ID</legend>\n                    <button class=\"help-btn\" data-help=\"serverId\" title=\"Show help for Server ID\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input clearable\" id=\"guildId\" type=\"text\" placeholder=\"Server ID(s)\">\n                        <button class=\"clear-btn\" id=\"clearGuild\" title=\"Clear Server (also clears Channel)\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"addGuild\" title=\"Queue the server you're currently viewing for a server-wide wipe.\">Add</button>\n                        <button id=\"delGuild\" title=\"Remove the server you're currently viewing from the queue.\">Delete</button>\n                        <button id=\"selectGuild\" title=\"Click, then click a server icon in Discord to capture its ID\">Select</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Channel ID</legend>\n                    <button class=\"help-btn\" data-help=\"channelId\" title=\"Show help for Channel ID\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input clearable\" id=\"channelId\" type=\"text\" placeholder=\"Channel ID(s)\">\n                        <button class=\"clear-btn\" id=\"clearChannel\" title=\"Clear Channel only\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"addChannel\" title=\"Queue the channel you're currently viewing.\">Add</button>\n                        <button id=\"delChannel\" title=\"Remove the channel you're currently viewing from the queue.\">Delete</button>\n                        <button id=\"selectChannel\" title=\"Click, then click a channel or message in Discord to capture its ID\">Select</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend style=\"text-transform: none;\">DMs</legend>\n                    <button class=\"help-btn\" data-help=\"dms\" title=\"Show help for DMs\">Help</button>\n                    <div class=\"input-actions\">\n                        <button id=\"addAllDms\" title=\"Queue every DM channel currently open in your sidebar\">Add DMs</button>\n                        <button id=\"delAllDms\" title=\"Remove every queued DM channel from the queue\">Clear DMs</button>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 3px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\" title=\"When checked, group DMs are excluded from the bulk Add DMs action. Default: off (group DMs are included).\">\n                            <input id=\"excludeGroupDms\" type=\"checkbox\">\n                            Exclude group DMs\n                        </label>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details id=\"sectionImport\">\n                <summary>Import data export<button class=\"help-btn\" data-help=\"importExport\" title=\"Show help for Import data export\">Help</button></summary>\n                <fieldset>\n                    <legend>Import folder</legend>\n                    <button class=\"help-btn\" data-help=\"importFolder\" title=\"Show help for picking the import folder\">Help</button>\n                    <input id=\"importPicker\" type=\"file\" webkitdirectory directory multiple style=\"display:none;\">\n                    <div class=\"input-actions\">\n                        <button id=\"importPick\" title=\"Pick the unzipped 'messages/' folder of your Discord data export\">Select Folder...</button>\n                        <button id=\"importClear\" title=\"Clear the loaded import and return to live-search mode\">Clear Import</button>\n                    </div>\n                    <div id=\"importSummary\" class=\"sectionDescription\" style=\"margin-top: 6px;\">No import loaded.</div>\n                    <div class=\"pill-group-label\">Exclude all</div>\n                    <div class=\"import-type-pills\">\n                        <label class=\"pill\" title=\"Drop every guild (server) message during deletion-queue construction. Default: off.\">\n                            <input id=\"importExcludeAllServers\" type=\"checkbox\">\n                            Exclude servers\n                        </label>\n                        <label class=\"pill\" title=\"Drop every 1:1 DM during deletion-queue construction. Default: off.\">\n                            <input id=\"importExcludeAllDms\" type=\"checkbox\">\n                            Exclude DMs\n                        </label>\n                        <label class=\"pill\" title=\"Drop every group DM (multi-recipient channel under @me) during deletion-queue construction. Default: off.\">\n                            <input id=\"importExcludeAllChannels\" type=\"checkbox\">\n                            Exclude group DMs\n                        </label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Exclude Server</legend>\n                    <button class=\"help-btn\" data-help=\"importExcludeServer\" title=\"Show help for Exclude Server\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"importExcludeServers\" type=\"text\" placeholder=\"Server ID(s) to skip\">\n                        <button class=\"clear-btn\" id=\"clearImportExcludeServers\" title=\"Clear excluded servers\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"addImportExcludeServers\" title=\"Add the server you're currently viewing to the exclusion list. @me is allowed (skips every DM).\">Add</button>\n                        <button id=\"delImportExcludeServers\" title=\"Remove the server you're currently viewing from the exclusion list.\">Delete</button>\n                        <button id=\"selectImportExcludeServers\" title=\"Click, then click a server icon in Discord to capture its ID. Hold Shift to capture several in a row.\">Select</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Exclude Channel</legend>\n                    <button class=\"help-btn\" data-help=\"importExcludeChannel\" title=\"Show help for Exclude Channel\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"importExcludeChannels\" type=\"text\" placeholder=\"Channel ID(s) to skip\">\n                        <button class=\"clear-btn\" id=\"clearImportExcludeChannels\" title=\"Clear excluded channels\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"addImportExcludeChannels\" title=\"Add the channel you're currently viewing to the exclusion list.\">Add</button>\n                        <button id=\"delImportExcludeChannels\" title=\"Remove the channel you're currently viewing from the exclusion list.\">Delete</button>\n                        <button id=\"selectImportExcludeChannels\" title=\"Click, then click a channel or any message inside one to capture the channel ID. Hold Shift to capture several in a row.\">Select</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Exclude DM with User</legend>\n                    <button class=\"help-btn\" data-help=\"importExcludeUser\" title=\"Show help for Exclude DM with User\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"importExcludeUsers\" type=\"text\" placeholder=\"User ID(s) to skip\">\n                        <button class=\"clear-btn\" id=\"clearImportExcludeUsers\" title=\"Clear excluded users\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectImportExcludeUsers\" title=\"Click, then click an avatar/username in Discord to capture the user ID. Hold Shift to capture several in a row.\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details id=\"sectionSearchFilter\">\n                <summary>Search filter<button class=\"help-btn\" data-help=\"tabSearchFilter\" title=\"Show help for the Search filter tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Include text</legend>\n                    <button class=\"help-btn\" data-help=\"includeText\" title=\"Show help for Include text\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"search\" type=\"text\" placeholder=\"Containing text\">\n                        <button class=\"clear-btn\" id=\"clearSearch\" title=\"Clear Include text\">Clear</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Include attachment type</legend>\n                    <button class=\"help-btn\" data-help=\"includeAttachment\" title=\"Show help for Include attachment type\">Help</button>\n                    <div class=\"has-grid\">\n                        <label><input id=\"hasLink\"    type=\"checkbox\">Link</label>\n                        <label><input id=\"hasImage\"   type=\"checkbox\">Image</label>\n                        <label><input id=\"hasVideo\"   type=\"checkbox\">Video</label>\n                        <label><input id=\"hasSound\"   type=\"checkbox\">Sound</label>\n                        <label><input id=\"hasSticker\" type=\"checkbox\">Sticker</label>\n                        <label><input id=\"hasPoll\"    type=\"checkbox\">Poll</label>\n                        <label><input id=\"hasEmbed\"   type=\"checkbox\">Embed</label>\n                        <label><input id=\"hasForward\" type=\"checkbox\">Forward</label>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 8px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\">Pinned:&nbsp;\n                            <select id=\"pinnedMode\">\n                                <option value=\"exclude\" selected>exclude</option>\n                                <option value=\"include\">include</option>\n                                <option value=\"only\">only pinned</option>\n                            </select>\n                        </label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Include @user</legend>\n                    <button class=\"help-btn\" data-help=\"includeUser\" title=\"Show help for Include @user\">Help</button>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"mentionEveryone\" type=\"checkbox\">Include @everyone / @here</label>\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"mentionsId\" type=\"text\" placeholder=\"Mentions user ID\">\n                        <button class=\"clear-btn\" id=\"clearMentions\" title=\"Clear Mentions user IDs\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectMentions\" title=\"Click, then click a user or message in Discord to capture their User ID\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details id=\"sectionDeleteFilter\">\n                <summary>Delete filter<button class=\"help-btn\" data-help=\"tabDeleteFilter\" title=\"Show help for the Delete filter tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Skip text</legend>\n                    <button class=\"help-btn\" data-help=\"excludeText\" title=\"Show help for Skip text\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"excludeSearch\" type=\"text\" placeholder=\"Skip messages containing\">\n                        <button class=\"clear-btn\" id=\"clearExcludeSearch\" title=\"Clear Skip text\">Clear</button>\n                    </div>\n                    <div class=\"sectionDescription\" style=\"margin-top: 6px;\">\n                        <label class=\"row\" style=\"margin-bottom: 0;\" title=\"Substring: term appears anywhere in the message. Exact: term must appear as a standalone word.\">Match:&nbsp;\n                            <select id=\"excludeMatchMode\">\n                                <option value=\"substring\" selected>substring</option>\n                                <option value=\"exact\">exact</option>\n                            </select>\n                        </label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Skip attachment type</legend>\n                    <button class=\"help-btn\" data-help=\"excludeAttachment\" title=\"Show help for Skip attachment type\">Help</button>\n                    <div class=\"has-grid\">\n                        <label><input id=\"excludeLink\"    type=\"checkbox\">Link</label>\n                        <label><input id=\"excludeImage\"   type=\"checkbox\">Image</label>\n                        <label><input id=\"excludeVideo\"   type=\"checkbox\">Video</label>\n                        <label><input id=\"excludeSound\"   type=\"checkbox\">Sound</label>\n                        <label class=\"import-noop\" title=\"Stickers aren't carried in the Discord data export — this toggle has no effect in import mode.\"><input id=\"excludeSticker\" type=\"checkbox\">Sticker</label>\n                        <label class=\"import-noop\" title=\"Polls aren't carried in the Discord data export — this toggle has no effect in import mode.\"><input id=\"excludePoll\"    type=\"checkbox\">Poll</label>\n                        <label class=\"import-noop\" title=\"Embeds aren't carried in the Discord data export — this toggle has no effect in import mode.\"><input id=\"excludeEmbed\"   type=\"checkbox\">Embed</label>\n                        <label class=\"import-noop\" title=\"Forward metadata isn't carried in the Discord data export — this toggle has no effect in import mode.\"><input id=\"excludeForward\" type=\"checkbox\">Forward</label>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Skip extension</legend>\n                    <button class=\"help-btn\" data-help=\"excludeExtension\" title=\"Show help for Skip extension\">Help</button>\n                    <div class=\"has-grid\">\n                        <label><input type=\"checkbox\" data-ext=\"jpg\">.jpg</label>\n                        <label><input type=\"checkbox\" data-ext=\"png\">.png</label>\n                        <label><input type=\"checkbox\" data-ext=\"mp4\">.mp4</label>\n                        <label><input type=\"checkbox\" data-ext=\"webm\">.webm</label>\n                        <label><input type=\"checkbox\" data-ext=\"pdf\">.pdf</label>\n                        <label><input type=\"checkbox\" data-ext=\"docx\">.docx</label>\n                        <label><input type=\"checkbox\" data-ext=\"txt\">.txt</label>\n                        <label><input type=\"checkbox\" data-ext=\"zip\">.zip</label>\n                    </div>\n                    <div class=\"input-wrapper\" style=\"margin-top: 8px;\">\n                        <input class=\"clearable\" id=\"excludeExtensions\" type=\"text\" placeholder=\"Custom: .ext1;.ext2;.ext3\">\n                        <button class=\"clear-btn\" id=\"clearExcludeExtensions\" title=\"Clear custom extensions\">Clear</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Skip @user</legend>\n                    <button class=\"help-btn\" data-help=\"excludeUser\" title=\"Show help for Skip @user\">Help</button>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"excludeMentionEveryone\" type=\"checkbox\">skip @everyone / @here</label>\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"excludeMentionsId\" type=\"text\" placeholder=\"User ID(s) to skip\">\n                        <button class=\"clear-btn\" id=\"clearExcludeMentions\" title=\"Clear Skip mentions user IDs\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectExcludeMentions\" title=\"Click, then click a user or message in Discord to capture their User ID\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Messages interval<button class=\"help-btn\" data-help=\"tabMessagesInterval\" title=\"Show help for the Messages interval tab\">Help</button></summary>\n                <fieldset>\n                    <legend>Interval of messages</legend>\n                    <button class=\"help-btn\" data-help=\"messagesInterval\" title=\"Show help for Messages interval\">Help</button>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"minId\" type=\"text\" placeholder=\"After message ID\">\n                        <button class=\"clear-btn\" id=\"clearMinId\" title=\"Clear After message ID\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\" style=\"margin-bottom: 5px;\">\n                        <button id=\"selectMinId\" title=\"Click, then click a message in Discord to capture its ID as the After bound\">Select</button>\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input class=\"clearable\" id=\"maxId\" type=\"text\" placeholder=\"Before message ID\">\n                        <button class=\"clear-btn\" id=\"clearMaxId\" title=\"Clear Before message ID\">Clear</button>\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"selectMaxId\" title=\"Click, then click a message in Discord to capture its ID as the Before bound\">Select</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Date interval<button class=\"help-btn\" data-help=\"tabDateInterval\" title=\"Show help for the Date interval tab\">Help</button></summary>\n                <fieldset>\n                    <legend>After date</legend>\n                    <button class=\"help-btn\" data-help=\"dateInterval\" title=\"Show help for Date interval\">Help</button>\n                    <div class=\"input-wrapper mb1\">\n                        <input id=\"minDate\" type=\"datetime-local\" value=\"2015-01-01T00:00\" title=\"Messages posted AFTER this date (defaults to Discord's launch — clear or change as needed)\">\n                    </div>\n                    <legend>Before date</legend>\n                    <div class=\"input-wrapper\">\n                        <input id=\"maxDate\" type=\"datetime-local\" title=\"Messages posted BEFORE this date\">\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"datePresetDay\"  class=\"date-preset-day\"  title=\"Now − 24 hours\">1 Day</button>\n                        <button id=\"datePresetWeek\" class=\"date-preset-week\" title=\"Now − 7 days\">1 Week</button>\n                        <button id=\"datePresetAll\"  class=\"date-preset-all\"  title=\"Reset After to 2015 and clear Before\">All</button>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Delay settings<button class=\"help-btn\" data-help=\"tabAdvanced\" title=\"Show help for the Delay settings section\">Help</button></summary>\n                <fieldset>\n                    <legend>Search delay (ms)</legend>\n                    <button class=\"help-btn\" data-help=\"searchDelay\" title=\"Show help for Search delay\">Help</button>\n                    <div class=\"stepper\">\n                        <input id=\"searchDelay\" type=\"text\" title=\"Click to type a value (auto-clamps to 15000–60000 ms)\">\n                        <button id=\"searchDelayDown\" class=\"stepper-down\" title=\"−500 ms\">&lt;</button>\n                        <button id=\"searchDelayUp\" class=\"stepper-up\" title=\"+500 ms\">&gt;</button>\n                        <button id=\"searchDelayReset\" class=\"stepper-reset\" title=\"Reset to default\">↺</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Delete delay (ms)</legend>\n                    <button class=\"help-btn\" data-help=\"deleteDelay\" title=\"Show help for Delete delay\">Help</button>\n                    <div class=\"stepper\">\n                        <input id=\"deleteDelay\" type=\"text\" title=\"Click to type a value (auto-clamps to 100–3000 ms)\">\n                        <button id=\"deleteDelayDown\" class=\"stepper-down\" title=\"−50 ms\">&lt;</button>\n                        <button id=\"deleteDelayUp\" class=\"stepper-up\" title=\"+50 ms\">&gt;</button>\n                        <button id=\"deleteDelayReset\" class=\"stepper-reset\" title=\"Reset to default\">↺</button>\n                    </div>\n                </fieldset>\n            </details>\n        </div>\n        <div class=\"main col\">\n            <div class=\"tbar col\" id=\"topBar\">\n                <div class=\"row\" id=\"topBarSlot\">\n                    <!-- Run-status text — populated by renderTopBar() (idle) or onProgress (running). -->\n                </div>\n                <div class=\"row\">\n                    <progress id=\"progressBar\" style=\"display:none;\"></progress>\n                </div>\n            </div>\n            <pre id=\"logArea\" class=\"logarea scroll\"></pre>\n            <div class=\"tbar footer row\">\n                <div id=\"footerTime\"></div>\n                <span class=\"spacer\"></span>\n                <label class=\"row footer-toggle\" title=\"Redact message content AND usernames in the log + confirmation preview\">\n                    <input id=\"streamerMode\" type=\"checkbox\" checked> Streamer mode\n                </label>\n                <label class=\"row footer-toggle\">\n                    <input id=\"autoScroll\" type=\"checkbox\" checked> Auto scroll\n                </label>\n                <div class=\"resize-handle\"></div>\n            </div>\n        </div>\n    </div>\n</div>\n";
};

__modules["src/helpers.js"] = (__exports) => {
  // ============================================================================
  // GENERAL UTILITIES
  // ----------------------------------------------------------------------------
  // Pure functions for parsing user input, building filter predicates, and
  // formatting display strings. No DOM access; no module state.
  // ============================================================================
  
  /** Splits a comma-separated string into a trimmed array with empty fragments dropped. Returns [] for null/undefined/empty input. */
  function parseCsvList(str) {
    if (str == null) return [];
    const s = String(str).trim();
    if (!s) return [];
    return s.split(/\s*,\s*/).filter(Boolean);
  }
  
  /** Returns a `(content) => boolean` predicate matching `term` either as a case-insensitive substring (default) or as a standalone word ('exact' mode). Returns null when `term` is empty. */
  function buildContentMatcher(term, mode) {
    if (!term) return null;
    if (mode === 'exact') {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      return (s) => re.test(s || '');
    }
    const lower = term.toLowerCase();
    return (s) => (s || '').toLowerCase().includes(lower);
  }
  
  /** Returns an `(attachments) => boolean` predicate that's true when any attachment's filename or URL ends with one of the listed extensions. Returns null when the list is empty. */
  function buildExtensionMatcher(extensions) {
    if (!extensions?.length) return null;
    const set = new Set(extensions);
    return (attachments) => !!attachments?.some(a => {
      const name = a.filename || a.url || '';
      const m = name.toLowerCase().match(/\.([a-z0-9]+)(?:[?#]|$)/);
      return m && set.has(m[1]);
    });
  }
  
  /** Formats a millisecond duration as a "Xh Ym Zs" string. */
  const msToHMS = s => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;
  
  /** HTML-escapes a value (& < " ') for safe injection into innerHTML. */
  const escapeHTML = html => String(html).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\'': '&#039;' })[m]);
  
  /** Emits the `.sm-real / .sm-redacted` dual-span used by streamer-mode log redaction. CSS at panel scope shows exactly one of the two spans depending on whether `.streamer-on` is set, so toggling streamer mode instantly re-renders every already-printed log line. The real value is HTML-escaped; the placeholder defaults to '••••' (callers pass e.g. '[ATTACHMENTS]' for non-ID redactions). */
  function redactHtml(real, placeholder = '••••') {
    return `<span class="sm-real">${escapeHTML(String(real))}</span><span class="sm-redacted">${escapeHTML(placeholder)}</span>`;
  }
  
  /** Joins a `[[key, value], ...]` array into a URL query string, skipping pairs whose value is undefined. Values are URL-encoded. */
  const queryString = params => params.filter(p => p[1] !== undefined).map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&');
  
  /** Async window.confirm() — yields one event-loop tick so queued log writes can paint before the modal blocks the thread. */
  const askYesNo = async msg => new Promise(resolve => setTimeout(() => resolve(window.confirm(msg)), 10));
  
  /** Converts a datetime-local string ("YYYY-MM-DDTHH:MM") to a Discord snowflake ID. Plain numeric strings pass through unchanged. Pre-epoch values clamp to 0. */
  const toSnowflake = (date) => {
    if (!/:/.test(date)) return date;
    const offset = new Date(date).getTime() - 1420070400000;
    return Math.max(0, offset) * Math.pow(2, 22);
  };
  
  /** Inverse of toSnowflake — returns the millisecond Unix timestamp embedded in a Discord snowflake. BigInt avoids precision loss on the 64-bit ID. */
  const snowflakeToMs = (sn) => Number((BigInt(sn) >> 22n) + 1420070400000n);
  
  
  // ============================================================================
  // DOM HELPERS
  // ----------------------------------------------------------------------------
  // Thin wrappers around DOM construction primitives.
  // ============================================================================
  
  /** Parses an HTML fragment string into a single root element and returns it. */
  function createElm(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.removeChild(temp.firstElementChild);
  }
  
  /** Appends a `<style>` element with the given CSS to `<head>` and returns the element. */
  function insertCss(css) {
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
    return style;
  }
  
  
  // ============================================================================
  // LOG FACADE
  // ----------------------------------------------------------------------------
  // Six log levels routed through a single setLogFn() target. Until a target is
  // registered, each level falls through to the matching console.* method so
  // errors during early initialisation still reach the devtools console.
  // ============================================================================
  
  let logFn;
  
  /** Registers the function that receives every subsequent log call. */
  const setLogFn = (fn) => logFn = fn;
  
  const log = {
    debug(...args)   { return logFn ? logFn('debug',   args) : console.debug(...args); },
    info(...args)    { return logFn ? logFn('info',    args) : console.info(...args); },
    verb(...args)    { return logFn ? logFn('verb',    args) : console.log(...args); },
    warn(...args)    { return logFn ? logFn('warn',    args) : console.warn(...args); },
    error(...args)   { return logFn ? logFn('error',   args) : console.error(...args); },
    success(...args) { return logFn ? logFn('success', args) : console.info(...args); },
  };
  
  
  // ============================================================================
  // DISCORD ID / TOKEN EXTRACTORS
  // ----------------------------------------------------------------------------
  // Reads the auth token, current user ID, and current guild/channel IDs from
  // Discord's own runtime state — localStorage for credentials, URL parsing for
  // channel context.
  //
  // Discord URL shapes recognised:
  //   /channels/<guildId>/<channelId>  — inside a guild text/voice channel
  //   /channels/@me/<channelId>        — inside an open DM or group DM
  //   /channels/@me                    — friends tab (DM list, no channel selected)
  // ============================================================================
  
  /** Runs `read(localStorage)` inside a temporary iframe and returns the result. The iframe inherits the parent origin's storage; Discord blocks direct page-script access to its own localStorage. */
  function withIframeLocalStorage(read) {
    const f = document.body.appendChild(document.createElement('iframe'));
    try { return read(f.contentWindow.localStorage); }
    finally { f.remove(); }
  }
  
  const CHANNEL_URL_RE = /channels\/([\w@]+)(?:\/(\d+))?/;
  
  /** Returns the Discord auth token from localStorage. The beforeunload event nudges Discord to flush its in-memory token cache to localStorage first. */
  function getToken() {
    window.dispatchEvent(new Event('beforeunload'));
    return withIframeLocalStorage(ls => JSON.parse(ls.token));
  }
  
  /** Returns the current user's snowflake ID from Discord's localStorage cache. */
  function getAuthorId() {
    return withIframeLocalStorage(ls => JSON.parse(ls.user_id_cache));
  }
  
  /** Returns the current guild ID from the URL, or '@me' on the friends tab. Alerts and returns null when no channel/server context can be parsed. */
  function getGuildId() {
    const m = location.href.match(CHANNEL_URL_RE);
    if (m) return m[1];
    alert('Could not find the Guild ID!\nPlease make sure you are on a Server or DM.');
    return null;
  }
  
  /** Returns the current channel ID from the URL. Alerts and returns null when no channel is open. */
  function getChannelId() {
    const m = location.href.match(CHANNEL_URL_RE);
    if (m && m[2]) return m[2];
    alert('Could not find the Channel ID!\nPlease make sure you are on a Channel or DM.');
    return null;
  }
  
  /** Returns the Discord auth token, or '' on failure (with an error logged). */
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
  __exports.snowflakeToMs = snowflakeToMs;
  __exports.setLogFn = setLogFn;
  __exports.log = log;
  __exports.parseCsvList = parseCsvList;
  __exports.buildContentMatcher = buildContentMatcher;
  __exports.buildExtensionMatcher = buildExtensionMatcher;
  __exports.redactHtml = redactHtml;
  __exports.createElm = createElm;
  __exports.insertCss = insertCss;
  __exports.getToken = getToken;
  __exports.getAuthorId = getAuthorId;
  __exports.getGuildId = getGuildId;
  __exports.getChannelId = getChannelId;
  __exports.fillToken = fillToken;
};

__modules["src/undiscord-core.js"] = (__exports) => {
  // ============================================================================
  // UNDISCORD CORE — DELETE LOOP
  // ----------------------------------------------------------------------------
  // Owns the message-search-and-delete pipeline and the in-flight statistics it
  // produces. The UI layer feeds in `options`, listens on `onStart` /
  // `onProgress` / `onStop` / `onJob`, and calls `run()` (single target) or
  // `runBatch(queue)` (multiple). Pulls pages from Discord's search API, or
  // from an in-memory ImportSource when one is supplied.
  // ============================================================================
  const { log, msToHMS, escapeHTML, redactHtml, queryString, askYesNo, toSnowflake, parseCsvList, buildContentMatcher, buildExtensionMatcher } = __require("src/helpers.js");
  const API_BASE = 'https://discord.com/api/v9';
  const MAX_DELETE_ATTEMPTS = 2;     // Per-message retry on transient failures.
  const MAX_TRANSIENT_RETRIES = 3;   // Search-side retries for 5xx and network errors.
  
  
  // ============================================================================
  // DEFAULT OPTIONS
  // ----------------------------------------------------------------------------
  // Canonical schema for `core.options`. The constructor and `resetOptions()`
  // both seed from this; the UI orchestrators hand in a partial overlay. Add
  // new options here so both seed paths pick them up.
  // ============================================================================
  
  const DEFAULT_OPTIONS = {
    authToken: null,
    authorId: null,
    guildId: null,
    channelId: null,
    minId: null,
    maxId: null,
    // Server-side search filters — passed through to Discord's search API.
    content: null,
    hasLink: null,    // has an auto-embedded link preview
    hasImage: null,   // has image attachment
    hasVideo: null,   // has video attachment
    hasSound: null,   // has audio attachment
    hasSticker: null, // has sticker
    hasPoll: null,    // has a poll
    hasEmbed: null,   // has any embed (broader than link — includes manual embeds)
    hasForward: null, // has a forwarded message snapshot
    mentions: null,         // @mentioning this user ID
    mentionEveryone: null,  // has @everyone / @here
    pinnedMode: 'exclude',  // 'exclude' | 'include' | 'only'
    excludeNsfw: false,     // when true, age-gated NSFW channels are excluded; when false, Discord's include_nsfw=true is sent
    // Post-search (client-side) filters — applied in filterResponse against
    // each search-API page (or each import page when importSource is set).
    excludeContent: null,
    excludeMatchMode: 'substring', // 'substring' | 'exact' (word-boundary)
    excludeLink: null,
    excludeImage: null,
    excludeVideo: null,
    excludeSound: null,
    excludeSticker: null,
    excludePoll: null,
    excludeEmbed: null,
    excludeForward: null,
    excludeMentions: null,        // CSV of user IDs (parsed via parseCsvList at filter time)
    excludeMentionEveryone: null,
    excludeExtensions: null,      // array of lowercase extensions, no leading dots
    // Pacing / runtime knobs.
    searchDelay: null,
    deleteDelay: null,
    maxEmptyPageRetries: 5, // re-fetch this many times when grandTotal says more remain but the page is empty
    askForConfirmation: true,
    streamerMode: false,    // redact message content + author usernames in confirmation preview and per-delete log
    // When set, run() pulls pages from this source's fetchPage() instead of
    // calling Discord's search API. Used by the data-export import flow to
    // skip the search phase entirely. See src/export-import.js#ImportSource.
    importSource: null,
  };
  
  
  // ============================================================================
  // END-REASON LABELS
  // ----------------------------------------------------------------------------
  // Human-readable labels for state.endReason — surfaced in the failure-summary
  // branch of run(). 'completed' and 'no-matches' have their own dedicated
  // summary branches and are not in this map.
  // ============================================================================
  
  const END_REASON_LABELS = {
    'empty-page-exhausted': 'Empty-page retry budget exhausted',
    'user-stopped': 'User cancelled',
    'user-declined': 'User declined the confirmation prompt',
    'auth-expired': 'Auth token expired',
    'fetch-error': 'Network or server error',
    'api-error': 'API rejected the request',
  };
  
  
  // ============================================================================
  // UNDISCORD CORE CLASS
  // ============================================================================
  
  class UndiscordCore {
  
    // -------------------- Private state --------------------
    // run() bumps #runId on entry; each loop captures the value at start and
    // exits if it ever differs — a fresh run() has superseded this loop.
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
  
    // -------------------- Public configuration / state --------------------
  
    options = { ...DEFAULT_OPTIONS };
  
    state = {
      running: false,
      delCount: 0,
      failCount: 0,
      grandTotal: 0,
      offset: 0,
      emptyPageRetry: 0,
      endReason: null, // 'completed' | 'no-matches' | 'empty-page-exhausted' | 'user-stopped' | 'user-declined' | 'auth-expired' | 'fetch-error' | 'api-error'
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
  
    // -------------------- Event hooks --------------------
  
    onStart = undefined;
    onProgress = undefined;
    onStop = undefined;
    // Fires once per batch iteration BEFORE the per-job run() begins, with the
    // 1-based job index and the batch total. Single-job runs never fire this —
    // the UI defaults to displaying "Job 1/1" instead.
    onJob = undefined;
  
  
    // ========================================================================
    // LIFECYCLE
    // ========================================================================
  
    /** Resets every counter / cursor on `state` to its initial value, ready for a fresh run. The confirmation prompt re-arms (the user is asked again on the next run). */
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
  
    /** Resets `options` to DEFAULT_OPTIONS and overlays the caller's partial. Every option lands at a known value on each new run. */
    resetOptions(overrides = {}) {
      this.options = { ...DEFAULT_OPTIONS, ...overrides };
    }
  
    /** Runs `run()` once per queued (server, channel) target, sequentially. The confirmation prompt only fires on the first job; subsequent jobs proceed silently. */
    async runBatch(queue) {
      if (this.state.running) return log.error('Already running!');
  
      log.info(`Running batch with queue of ${queue.length} jobs`);
      for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        log.info('Starting job...', `(${i + 1}/${queue.length})`);
  
        this.options = { ...this.options, ...job };
        if (this.onJob) this.onJob(i + 1, queue.length);
  
        await this.run(true);
        if (!this.state.running) break;
  
        log.info('Job ended.', `(${i + 1}/${queue.length})`);
        this.resetState();
        this.options.askForConfirmation = false;
      }
  
      log.info('Batch finished.');
      this.state.running = false;
    }
  
    /** Main delete loop for a single (server, channel) target. Repeats search → filter → confirm (first page only) → delete page → wait, until the search returns empty or stop() fires. */
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
        if (this.options.importSource) {
          // Import mode: pull the next page from the in-memory imported list
          // instead of calling Discord's search API. fetchPage() is synchronous
          // and never throws — no rate-limit / network handling needed here.
          this.options.importSource.fetchPage(this);
        } else {
          await this.search();
        }
  
        // search() can short-circuit on stop during a 202/429 cooldown, returning
        // before _searchResponse is populated. Bail out cleanly in that case.
        if (!this.state.running || this.#runId !== myRunId) return;
  
        await this.filterResponse();
  
        log.verb(`Grand total: ${this.state.grandTotal}`);
        log.verb(`Messages in current page: ${this.state._searchResponse.messages.length}`);
        log.verb(`To be deleted: ${this.state._messagesToDelete.length}`);
        log.verb(`Skipped: ${this.state._skippedMessages.length}`);
        log.verb(`Offset: ${this.state.offset}`);
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
          // Stop pressed during the delete loop → exit before the trailing wait.
          if (!this.state.running) break;
  
          // Last-page short-circuit: when the running totals match grandTotal,
          // skip the trailing wait and the redundant empty-page confirmation
          // search. Page size isn't a reliable signal — Discord pages are
          // content-bounded, so a sub-25 response can happen mid-run on long
          // messages.
          if (this.state.delCount + this.state.failCount >= this.state.grandTotal) {
            this.state.endReason = 'completed';
            break;
          }
        }
        else if (this.state._skippedMessages.length > 0) {
          this.state.emptyPageRetry = 0; // got a non-empty page, reset retry counter
          // Page has results but no deletable ones (e.g. all system messages).
          // Advance the offset and try the next page; the loop ends when a
          // fully empty page returns.
          const oldOffset = this.state.offset;
          this.state.offset += this.state._skippedMessages.length;
          log.verb('Nothing deletable on this page, checking next page...');
          log.verb(`Skipped ${this.state._skippedMessages.length} out of ${this.state._searchResponse.messages.length} in this page.`, `(Offset was ${oldOffset}, adjusted to ${this.state.offset})`);
        }
        else {
          // Empty page. Decide whether to retry (search index lag is common) or stop (truly done).
  
          // Import-mode short-circuit: an exhausted ImportSource has emitted
          // every record. There's no search index to wait on, so the empty-page
          // retry budget doesn't apply — finalise immediately.
          if (this.options.importSource && this.options.importSource.exhausted) {
            if (this.state.delCount + this.state.failCount === 0 && this.state.grandTotal === 0) {
              this.state.endReason = 'no-matches';
            } else {
              this.state.endReason = 'completed';
            }
            if (inBatch) break;
            this.state.running = false;
            break;
          }
  
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
              // First search returned zero — the filters didn't match anything
              // in this target. Distinct from a successful run; surfaced as its
              // own end state.
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
  
        // Wait before next page — gives Discord's search index time to catch up.
        // Skipped in import mode (no API call to pace).
        if (!this.options.importSource) {
          log.verb(`Waiting ${(this.options.searchDelay / 1000).toFixed(2)}s before next page...`);
          await this.#wait(this.options.searchDelay);
        }
  
      } while (this.state.running);
  
      // If a fresh run() bumped #runId while this loop was waiting, the
      // end-summary and onStop belong to that new run — skip them here.
      // Manual stop() does not bump #runId, so a user-triggered stop falls
      // through to the summary below.
      if (this.#runId !== myRunId) return;
  
      const endTime = new Date();
      const elapsed = msToHMS(endTime.getTime() - this.stats.startTime.getTime());
  
      // Pick the end-summary log level/format from how the run ended. Each line
      // gets its own log call so they stack vertically and inherit the level's
      // colour.
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
  
    /** Aborts the run. Sets state.running=false and wakes any in-flight sleep so the main loop exits at its next checkpoint and prints the end-summary. */
    stop() {
      if (this.state.running) this.state.endReason = 'user-stopped';
      this.state.running = false;
      if (this.#waitAbort) this.#waitAbort();
      if (this.onStop) this.onStop(this.state, this.stats);
    }
  
  
    // ========================================================================
    // ETR + CONFIRMATION
    // ========================================================================
  
    /**
     * Estimated time remaining = perPostCost × remaining, where perPostCost is
     * derived from observed page sizes:
     *   perPageCost = searchDelay + (avgPostsInPage * deleteDelay)
     *   perPostCost = perPageCost / avgPostsInPage
     * Uses an avgN of 25 as a starting estimate before any productive page has
     * been observed (Discord's pages are content-bounded so real values often
     * fall lower); the running mean converges within a handful of pages.
     *
     * Ping is intentionally out of this formula — its variance dwarfs
     * deleteDelay on stable connections, and rate-limit bumps are reflected via
     * options.deleteDelay already, so adding ping double-counts during throttle.
     *
     * Import mode: only deleteDelay applies — no per-page search cost — so the
     * formula collapses to (deletes left × delay between deletes).
     */
    calcEtr() {
      const remaining = this.state.grandTotal - this.state.delCount - this.state.failCount;
      if (remaining <= 0) { this.stats.etr = 0; return; }
      if (this.options.importSource) {
        this.stats.etr = remaining * this.options.deleteDelay;
        return;
      }
      const avgN = this.stats.avgPostsInPage > 0 ? this.stats.avgPostsInPage : 25;
      const perPageCost = this.options.searchDelay + (avgN * this.options.deleteDelay);
      this.stats.etr = (perPageCost / avgN) * remaining;
    }
  
    /** Shows a browser confirm() dialog with the estimated count, ETA, and a content preview. Fires once per run (or once per batch); subsequent pages skip the prompt. Returns true on confirm, false on decline. */
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
  
  
    // ========================================================================
    // SEARCH
    // ========================================================================
  
    /** Fetches the next page of matching messages from Discord's search API into `state._searchResponse`. Handles 202 (channel not yet indexed), 429 (rate limit, with delay bump), 401 (auth expired), 5xx (transient retry), and network errors. */
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
          // include_nsfw is permissive — when true, age-gated channels return
          // results alongside SFW ones (SFW channels are unaffected). Omitting
          // it (or sending false) silently zero-results NSFW channels in the
          // queue. The "Exclude NSFW channels" checkbox inverts: excludeNsfw=
          // false (default) sends include_nsfw=true; excludeNsfw=true omits
          // the param so NSFW channels return nothing.
          ['include_nsfw', this.options.excludeNsfw ? undefined : true],
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
  
      // 202: channel not indexed yet — wait the requested cooldown and retry.
      if (resp.status === 202) {
        let w = (await resp.json()).retry_after * 1000;
        w = w || this.options.searchDelay; // retry_after 0 → use the configured search delay
        this.stats.throttledCount++;
        this.stats.throttledTotalTime += w;
        log.warn(`This channel isn't indexed yet. Waiting ${w}ms for discord to index it...`);
        await this.#wait(w);
        if (!this.state.running) return;
        return await this.search();
      }
  
      if (!resp.ok) {
        // 429: rate limited.
        if (resp.status === 429) {
          let w = (await resp.json()).retry_after * 1000;
          w = w || this.options.searchDelay;
  
          this.stats.throttledCount++;
          this.stats.throttledTotalTime += w;
          // Bump effective delay (monotonic — never lower it). Successful searches decay it back toward the user's baseline.
          this.options.searchDelay = Math.max(this.options.searchDelay, w);
          log.warn(`Being rate limited by the API for ${w}ms! Bumped search delay to ${this.options.searchDelay}ms (will decay back to ${this.state._userSearchDelay}ms on success).`);
          this.printStats();
          log.verb(`Cooling down for ${w}ms before retrying...`);
  
          await this.#wait(w);
          if (!this.state.running) return;
          return await this.search();
        }
  
        // 401: token expired or invalid — no retry.
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
  
    /** Narrows the latest search response down to messages that will actually be deleted: drops system messages, applies the pinned-mode filter, then runs every excludeX post-filter. The remainder lands in `state._messagesToDelete`; everything dropped lands in `state._skippedMessages` so the caller can advance the search offset past them. */
    async filterResponse() {
      const data = this.state._searchResponse;
  
      // grandTotal locks in the highest total_results ever seen and only ever
      // grows. The per-search total_results shrinks as deletes succeed; the
      // peak value is what the post-loop "deleted N/M" denominator reflects.
      const total = data.total_results;
      if (total > this.state.grandTotal) this.state.grandTotal = total;
  
      // Search returns conversation context (messages near the matched one);
      // only the message marked hit:true is the actual match. .filter(Boolean)
      // drops any conversation missing a hit.
      const discoveredMessages = data.messages.map(convo => convo.find(message => message.hit === true)).filter(Boolean);
  
      // Type 0 = regular user message; types 6-21 cover pins, joins, replies, etc.
      // System messages outside that range cannot be deleted via this endpoint.
      let messagesToDelete = discoveredMessages;
      messagesToDelete = messagesToDelete.filter(msg => msg.type === 0 || (msg.type >= 6 && msg.type <= 21));
  
      // Pinned mode is enforced server-side via the `pinned` query param.
      // Re-filter here as a safety net against stray non-matching responses.
      if (this.options.pinnedMode === 'exclude') {
        messagesToDelete = messagesToDelete.filter(msg => !msg.pinned);
      } else if (this.options.pinnedMode === 'only') {
        messagesToDelete = messagesToDelete.filter(msg => msg.pinned);
      }
  
      // Exclude filters — Discord's search API has no "doesn't have" parameter,
      // so these run client-side after the search response comes back. Each one
      // drops messages matching the corresponding has-type.
      const opt = this.options;
      const contentMatch = buildContentMatcher(opt.excludeContent, opt.excludeMatchMode);
      if (contentMatch) {
        messagesToDelete = messagesToDelete.filter(msg => !contentMatch(msg.content));
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
        // Skip @user is a multi-value list applied client-side, so any number of
        // mentioned users can be skipped per run. (Include @user is single-value
        // because Discord's search `mentions=` param accepts only one ID.)
        const skipIds = parseCsvList(opt.excludeMentions);
        if (skipIds.length) {
          messagesToDelete = messagesToDelete.filter(msg =>
            !(msg.mentions?.some(u => skipIds.includes(u.id))));
        }
      }
      if (opt.excludeMentionEveryone) {
        messagesToDelete = messagesToDelete.filter(msg => !msg.mention_everyone);
      }
      const extensionMatch = buildExtensionMatcher(opt.excludeExtensions);
      if (extensionMatch) {
        messagesToDelete = messagesToDelete.filter(msg => !extensionMatch(msg.attachments));
      }
  
      // Skipped messages still count toward the search offset for the next page.
      const skippedMessages = discoveredMessages.filter(msg => !messagesToDelete.find(m => m.id === msg.id));
  
      this.state._messagesToDelete = messagesToDelete;
      this.state._skippedMessages = skippedMessages;
  
      // Feed the running mean of deletable posts per page — productive pages
      // only, since skipped-only pages don't follow the (search → N deletes) cost model.
      if (messagesToDelete.length > 0) {
        this.stats.pagesProcessed++;
        this.stats.avgPostsInPage += (messagesToDelete.length - this.stats.avgPostsInPage) / this.stats.pagesProcessed;
      }
    }
  
  
    // ========================================================================
    // DELETE
    // ========================================================================
  
    /** Issues one DELETE per message in the current page, with per-message retry on transient failures and a deleteDelay sleep between each. */
    async deleteMessagesFromList() {
      const myRunId = this.#runId;
      for (let i = 0; i < this.state._messagesToDelete.length; i++) {
        // Stop pressed by user OR a newer run has superseded this one.
        if (this.#runId !== myRunId || !this.state.running) return log.error('Stopped by you!');
  
        const message = this.state._messagesToDelete[i];
  
        // Streamer-mode redaction lives in the DOM via redactHtml dual-spans;
        // CSS toggles which side is visible. Decoupling redaction from the run-
        // time `streamerMode` option means flipping the checkbox mid-run
        // immediately redacts every already-printed line.
        const author = `${message.author?.username ?? '[system]'}#${message.author?.discriminator ?? '0'}`;
        const content = (message.content ?? '').replace(/\n/g, '↵');
        const attachments = message.attachments?.length
          ? ' ' + redactHtml(JSON.stringify(message.attachments), '[ATTACHMENTS]')
          : '';
        log.debug(
          `[${this.state.delCount + 1}/${this.state.grandTotal}] ` +
          `<sup>${new Date(message.timestamp).toLocaleString()}</sup> ` +
          `<b>${redactHtml(author)}</b>` +
          `: <i>${redactHtml(content)}</i>` +
          attachments,
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
  
    /** Deletes a single message via DELETE /channels/<id>/messages/<id>. Returns 'OK' (deleted), 'RETRY' (transient — caller may try again), or 'FAILED' (permanent — counted toward failCount). */
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
          // Deleting messages too fast.
          const w = (await resp.json()).retry_after * 1000;
          this.stats.throttledCount++;
          this.stats.throttledTotalTime += w;
          // Bump effective delay (monotonic — never lower it). Successful deletes decay it back toward the user's baseline.
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
              // 400 with code 50083 = thread is archived. Bump the offset so
              // the same message doesn't reappear on the next search page.
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
  
  
    // ========================================================================
    // STATS HELPERS
    // ========================================================================
  
    /** Records the request-send timestamp so afterRequest() can compute the round-trip ping. */
    beforeRequest() {
      this.#beforeTs = Date.now();
    }
  
    /** Updates `stats.lastPing` (most recent round-trip) and `stats.avgPing` (EMA, 10% weight on the new sample). */
    afterRequest() {
      this.stats.lastPing = (Date.now() - this.#beforeTs);
      this.stats.avgPing = this.stats.avgPing > 0 ? (this.stats.avgPing * 0.9) + (this.stats.lastPing * 0.1) : this.stats.lastPing;
    }
  
    /** Logs the current pacing values, ping samples, and rate-limit counters at verbose level. */
    printStats() {
      log.verb(`Delete delay: ${this.options.deleteDelay}ms, Search delay: ${this.options.searchDelay}ms`);
      log.verb(`Last ping: ${this.stats.lastPing}ms, Average ping: ${this.stats.avgPing | 0}ms`);
      log.verb(`Rate limited: ${this.stats.throttledCount} times.`);
      log.verb(`Total time throttled: ${msToHMS(this.stats.throttledTotalTime)}.`);
    }
  }
  
  
  __exports.default = UndiscordCore;
};

__modules["src/ui/drag.js"] = (__exports) => {
  // ============================================================================
  // PANEL DRAG / RESIZE
  // ----------------------------------------------------------------------------
  // Mouse-driven move and 8-directional resize for a fixed-positioned element.
  // Move binds to a caller-supplied handle (typically the panel header); resize
  // uses 8 invisible div edges/corners auto-injected around the element when
  // createHandlers is true.
  // ============================================================================
  
  const MOVE = 0;
  const RESIZE_T = 1;
  const RESIZE_B = 2;
  const RESIZE_L = 4;
  const RESIZE_R = 8;
  const RESIZE_TL = RESIZE_T + RESIZE_L;
  const RESIZE_TR = RESIZE_T + RESIZE_R;
  const RESIZE_BL = RESIZE_B + RESIZE_L;
  const RESIZE_BR = RESIZE_B + RESIZE_R;
  
  /** Wires drag-to-move and 8-corner resize onto an element. `moveHandle` is the inner element that grabs for moving (header / title bar). */
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
  
  /** Binds mousedown / mousemove / mouseup on a handle to either move or resize the target element. Operation type is encoded in `op` (MOVE or a bitmask of RESIZE_T/B/L/R). */
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
        // Mouse button released off-window — end the drag here.
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
  
  /** Creates an element with the given attributes, appended to `parent` if supplied. */
  function createElement(tag, attrs, parent) {
    const elm = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) elm.setAttribute(k, v);
    if (parent) parent.appendChild(elm);
    return elm;
  }
  
  /** Shallow-merges defined keys from `options` into `defaults`, returning the mutated defaults. */
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

__modules["src/export-import.js"] = (__exports) => {
  // ============================================================================
  // DISCORD DATA-EXPORT IMPORT
  // ----------------------------------------------------------------------------
  // Parses the contents of an unzipped Discord data export's `messages/` folder
  // into a flat list of (channelId, messageId, ...) records, and exposes an
  // `ImportSource` that the run loop consumes in place of Discord's search API.
  // All parsing is local — no network access in this module.
  //
  // Folder shape (post-extraction):
  //   messages/
  //     index.json              — { "<channelId>": "<display string>", ... }   (optional)
  //                               Display string is "<channel> in <guild>" for guild
  //                               channels and "Direct Message with <user>#<discriminator>"
  //                               for DMs. The DM string is the only place the friend's
  //                               username appears — channel.json's recipients carries IDs only.
  //     c<channelId>/
  //       channel.json          — channel metadata (optional but preferred)
  //       messages.json         — array of { ID, Timestamp, Contents, Attachments }
  //
  // Both letter-cases are tolerated for message field names (`ID`/`id`,
  // `Contents`/`content`, etc.) since Discord's exporter has shipped both.
  // ============================================================================
  
  /** Walks a list of `File` objects (from `<input webkitdirectory>` or `multiple`) and returns `{ messages, channelCount, oldestTs, newestTs }`. Throws on hard parse failures (bad JSON, no c<id>/ folders found); per-channel issues that don't invalidate the rest are skipped silently. */
  async function parseExport(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) {
      throw new Error('No files selected.');
    }
  
    // Top-level index.json maps channel ID → human-readable name. Optional —
    // falls back to channel.json's `name`, then a "c<id>" stub.
    const indexFile = files.find(f => /(^|\/)index\.json$/i.test(relPath(f)));
    let nameIndex = {};
    if (indexFile) {
      try { nameIndex = JSON.parse(await indexFile.text()); }
      catch { /* malformed index — channel.json fallback still works */ }
    }
  
    // Group files by their c<channelId> parent folder.
    const folderRe = /(?:^|\/)c(\d+)\/[^/]+$/;
    const channelFiles = new Map(); // channelId -> { messages?: File, channel?: File }
    for (const f of files) {
      const m = relPath(f).match(folderRe);
      if (!m) continue;
      const channelId = m[1];
      if (!channelFiles.has(channelId)) channelFiles.set(channelId, {});
      const slot = channelFiles.get(channelId);
      if (/messages\.json$/i.test(f.name))     slot.messages = f;
      else if (/channel\.json$/i.test(f.name)) slot.channel  = f;
    }
  
    if (channelFiles.size === 0) {
      throw new Error('No c<channelId>/ folders found. Point at the unzipped "messages/" folder of your Discord data export.');
    }
  
    const allMessages = [];
    let parsedChannels = 0;
    let oldestTs = Infinity, newestTs = -Infinity;
  
    for (const [channelId, slot] of channelFiles) {
      if (!slot.messages) continue; // bare folder with no messages.json
  
      let channelMeta = {};
      if (slot.channel) {
        try { channelMeta = JSON.parse(await slot.channel.text()); }
        catch { /* missing/malformed channel.json — fall through to nameIndex */ }
      }
      // Discord export channel.json shapes (verified against late-2025 exports):
      //   GUILD_TEXT : { id, type:"GUILD_TEXT", name, guild:{ id, name } }
      //   DM         : { id, type:"DM", recipients:[<userId>, <userId>] }   — usernames live in index.json only
      //   GROUP_DM   : { id, type:"GROUP_DM", recipients:[...], name? }     — name only when user-set
      //   THREAD     : type "GUILD_PUBLIC_THREAD" / similar; treated as guild for grouping
      const type      = channelMeta.type || 'UNKNOWN';
      const channelName = channelMeta.name || nameIndex[channelId] || `c${channelId}`;
      const guildId   = channelMeta.guild?.id   || null;
      const guildName = channelMeta.guild?.name || null;
      // DMs carry no username inside channel.json — only user IDs. The friend's
      // display name comes from index.json's "Direct Message with NAME#0" string.
      // Group DMs may have a user-set `name` (or null when unnamed).
      const dmFriendName = (type === 'DM') ? extractDmFriendName(nameIndex[channelId]) : null;
      const recipientIds = Array.isArray(channelMeta.recipients) ? channelMeta.recipients.map(String) : [];
      const recipientCount = recipientIds.length;
  
      let raw;
      try { raw = JSON.parse(await slot.messages.text()); }
      catch (e) {
        throw new Error(`Failed to parse ${relPath(slot.messages)}: ${e.message}`);
      }
      if (!Array.isArray(raw)) {
        throw new Error(`${relPath(slot.messages)} did not contain a JSON array.`);
      }
  
      parsedChannels++;
      for (const m of raw) {
        const messageId = m.ID ?? m.id;
        const timestamp = normalizeExportTs(m.Timestamp ?? m.timestamp);
        const content   = m.Contents ?? m.content ?? '';
        const attachRaw = m.Attachments ?? m.attachments ?? '';
  
        if (!messageId) continue; // can't delete without an ID
  
        const ts = new Date(timestamp).getTime();
        if (Number.isFinite(ts)) {
          if (ts < oldestTs) oldestTs = ts;
          if (ts > newestTs) newestTs = ts;
        }
  
        allMessages.push({
          channelId,
          guildId,
          guildName,
          channelName,
          type,
          dmFriendName,
          recipientCount,
          recipientIds,
          messageId: String(messageId),
          timestamp,
          content,
          attachments: parseAttachments(attachRaw),
        });
      }
    }
  
    return {
      messages: allMessages,
      channelCount: parsedChannels,
      oldestTs: oldestTs === Infinity ? null : oldestTs,
      newestTs: newestTs === -Infinity ? null : newestTs,
    };
  }
  
  /** Returns a file's path relative to the picked folder root. Falls back to `name` when the picker doesn't expose `webkitRelativePath` (plain `multiple` selection). */
  function relPath(file) {
    return file.webkitRelativePath || file.name;
  }
  
  /** Normalises a Discord export timestamp to ISO-with-Z form. Discord exports timestamps as "YYYY-MM-DD HH:MM:SS" UTC; plain `new Date()` parses that as LOCAL time, shifting every imported timestamp by the user's TZ offset. Already-ISO inputs (with T separator, trailing Z, or numeric offset) pass through unchanged. */
  function normalizeExportTs(str) {
    if (!str || typeof str !== 'string') return str;
    if (/T/.test(str) || /Z$/.test(str) || /[+-]\d\d:?\d\d$/.test(str)) return str;
    return str.replace(' ', 'T') + 'Z';
  }
  
  /** Pulls the friend's username out of an index.json DM display string ("Direct Message with USER#0"). Returns null when the entry is missing or doesn't match the expected prefix. */
  function extractDmFriendName(indexValue) {
    if (typeof indexValue !== 'string') return null;
    const m = indexValue.match(/^Direct Message with (.+?)(?:#\d+)?$/);
    return m ? m[1] : null;
  }
  
  /**
   * Builds a per-guild / per-DM breakdown of an imported set, returned as an
   * array of pre-formatted log lines. Sorted by message count (desc) within
   * each group so the heaviest sources surface first.
   *
   * `redactName` is invoked on every server / DM / group display name before it
   * lands in a line — caller wires it to the streamer-mode toggle so sensitive
   * names get dotted out without summarizeImport itself depending on UI state.
   *
   * Output shape:
   *   "Server: <name> | Channels: <N> | Messages: <total>"
   *   "DM:     <friend>                | Messages: <total>"
   *   "Group DM: <name or count>       | Messages: <total>"
   *   "Unknown channel kind: <N>       | Messages: <total>"   (channel.json missing)
   */
  function summarizeImport(parsed, redactName = (v) => v) {
    const guilds = new Map();   // guildId -> { name, channels:Set<channelId>, count }
    const dms = new Map();      // channelId -> { friend, count }
    const groups = new Map();   // channelId -> { name, recipientCount, count }
    const unknown = new Map();  // channelId -> count
  
    for (const m of parsed.messages) {
      if (m.type === 'GUILD_TEXT' || (m.guildId && m.type !== 'DM' && m.type !== 'GROUP_DM')) {
        // Threads, voice text, announcements, etc. roll up under their parent guild.
        const key = m.guildId || `unknown-guild-for-${m.channelId}`;
        if (!guilds.has(key)) guilds.set(key, { name: m.guildName || 'Unknown Server', channels: new Set(), count: 0 });
        const g = guilds.get(key);
        g.channels.add(m.channelId);
        g.count++;
        if (!g.name && m.guildName) g.name = m.guildName;
      } else if (m.type === 'DM') {
        if (!dms.has(m.channelId)) dms.set(m.channelId, { friend: m.dmFriendName || `(unknown — ${m.channelId})`, count: 0 });
        dms.get(m.channelId).count++;
      } else if (m.type === 'GROUP_DM') {
        if (!groups.has(m.channelId)) groups.set(m.channelId, { name: m.channelName, recipientCount: m.recipientCount, count: 0 });
        groups.get(m.channelId).count++;
      } else {
        if (!unknown.has(m.channelId)) unknown.set(m.channelId, 0);
        unknown.set(m.channelId, unknown.get(m.channelId) + 1);
      }
    }
  
    const lines = [];
  
    const sortedGuilds = [...guilds.values()].sort((a, b) => b.count - a.count);
    for (const g of sortedGuilds) {
      lines.push(`Server: ${redactName(g.name)} | Channels: ${g.channels.size} | Messages: ${g.count.toLocaleString()}`);
    }
  
    const sortedDms = [...dms.values()].sort((a, b) => b.count - a.count);
    for (const d of sortedDms) {
      lines.push(`DM: ${redactName(d.friend)} | Messages: ${d.count.toLocaleString()}`);
    }
  
    const sortedGroups = [...groups.values()].sort((a, b) => b.count - a.count);
    for (const g of sortedGroups) {
      const label = g.name || `Group DM (${g.recipientCount} people)`;
      lines.push(`Group DM: ${redactName(label)} | Messages: ${g.count.toLocaleString()}`);
    }
  
    if (unknown.size) {
      const total = [...unknown.values()].reduce((s, n) => s + n, 0);
      lines.push(`Unknown channel kind: ${unknown.size} channel${unknown.size === 1 ? '' : 's'} | Messages: ${total.toLocaleString()}`);
    }
  
    return lines;
  }
  
  /** Parses Discord's whitespace/comma-separated Attachment URL list into the `[{url, content_type}, ...]` shape filterResponse expects. content_type is inferred from the URL extension. */
  function parseAttachments(raw) {
    if (!raw) return [];
    const urls = String(raw).split(/[\s,]+/).filter(Boolean);
    return urls.map(url => ({ url, content_type: inferContentType(url) }));
  }
  
  /** Returns the inferred MIME type for a URL based on its extension. Falls back to 'application/octet-stream' for unknown extensions. */
  function inferContentType(url) {
    const ext = (url.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/) || [])[1];
    if (!ext) return 'application/octet-stream';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(ext)) return `image/${ext}`;
    if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext))                 return `video/${ext}`;
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'opus'].includes(ext))         return `audio/${ext}`;
    return 'application/octet-stream';
  }
  
  
  // ============================================================================
  // IMPORT SOURCE
  // ----------------------------------------------------------------------------
  // Drop-in replacement for the search() side of the run loop. Holds the parsed
  // message list and a cursor; each fetchPage(core) call assigns the next slice
  // into core.state._searchResponse using the same shape Discord's search API
  // returns, so filterResponse() works unchanged.
  // ============================================================================
  
  /** Pages an in-memory message list into core.state._searchResponse, mimicking the shape of Discord's search API so the rest of the run loop is mode-agnostic. */
  class ImportSource {
    static PAGE_SIZE = 50;
  
    constructor(messages) {
      this.messages = messages;
      this.cursor = 0;
    }
  
    /** True once every imported record has been emitted. Lets the run loop short-circuit the empty-page-retry budget — no search index to wait on in import mode. */
    get exhausted() {
      return this.cursor >= this.messages.length;
    }
  
    /** Populates core.state._searchResponse with the next page of messages. Each message is wrapped in a single-element conversation array with hit:true to match Discord's `messages: [[{hit, ...}, ...]]` shape. */
    fetchPage(core) {
      const slice = this.messages.slice(this.cursor, this.cursor + ImportSource.PAGE_SIZE);
      this.cursor += slice.length;
      core.state._searchResponse = {
        total_results: this.messages.length,
        messages: slice.map(m => [toApiShape(m)]),
      };
    }
  }
  
  /** Builds a Discord-API-shaped message object from an export record. Fields the export doesn't carry (mentions, embeds, author info) are stubbed with safe defaults that filterResponse's exclude-* paths gracefully ignore. */
  function toApiShape(m) {
    return {
      hit: true,
      id: m.messageId,
      channel_id: m.channelId,
      type: 0,                    // regular user message — passes filterResponse's type filter
      pinned: false,
      content: m.content || '',
      timestamp: m.timestamp,
      attachments: m.attachments || [],
      mentions: [],
      mention_everyone: false,
      embeds: [],
      author: { username: 'imported', discriminator: '0' },
    };
  }
  
  __exports.parseExport = parseExport;
  __exports.summarizeImport = summarizeImport;
  __exports.ImportSource = ImportSource;
};

__modules["src/undiscord-ui.js"] = (__exports) => {
  // ============================================================================
  // UNDISCORD-LITE — UI LAYER
  // ----------------------------------------------------------------------------
  // Owns the panel HTML, CSS, every event binding, and the run orchestrators —
  // the meta-orchestrator startAction(), per-snapshot dispatchers
  // runSearchModeFromForm / runImportModeFromForm, and the Batch Selection
  // queue flow. All Discord page I/O — token, URL parsing, server-bar injection,
  // point-and-click ID capture — happens here. The delete pipeline itself
  // lives in undiscord-core.js.
  // ============================================================================
  
  const LOG_PREFIX = '[UNDISCORD-LITE]';
  const styles = __require("src/ui/styles.css").default;
  const undiscordTemplate = __require("src/ui/undiscord.html").default;const UndiscordCore = __require("src/undiscord-core.js").default;
  const Drag = __require("src/ui/drag.js").default;
  const { parseExport, summarizeImport, ImportSource } = __require("src/export-import.js");
  const { createElm, insertCss, log, setLogFn, msToHMS, redactHtml, getAuthorId, getGuildId, getChannelId, fillToken, snowflakeToMs, parseCsvList, buildContentMatcher, buildExtensionMatcher } = __require("src/helpers.js");
  // ============================================================================
  // MODULE STATE
  // ----------------------------------------------------------------------------
  // Singleton core instance + DOM element cache + cross-call mutable state.
  // `$` is the panel-scoped selector helper used everywhere below.
  // ============================================================================
  
  const buttonHtml = `<div id="undiscord-btn" tabindex="0" role="button" aria-label="Delete Messages" title="Delete Messages with Undiscord Lite">
    <svg aria-hidden="false" width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
      <path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
    </svg>
    <progress></progress>
  </div>`;
  
  const undiscordCore = new UndiscordCore();
  
  const ui = {
    undiscordWindow: null,
    undiscordBtn: null,
    logArea: null,
    autoScroll: null,
    // progress handler
    progressMain: null,
    progressIcon: null,
    topBarSlot: null, // unified status line above the log — idle hint or running progress
    footerTime: null, // elapsed / remaining readout in the footer's left edge during a run
  };
  const $ = s => ui.undiscordWindow.querySelector(s);
  
  // Loaded Discord data export (post-parse). Null when no import is active.
  // Shape: { messages, channelCount, oldestTs, newestTs } as returned by parseExport().
  // When set, startAction() routes the per-snapshot dispatch through
  // runImportModeFromForm() and the General / Search filter / Delete filter UI
  // sections grey out (CSS via .import-mode).
  let importedSet = null;
  
  // One-shot log message printed right after the "Started at..." line. Used by
  // startAction to surface notices that would otherwise be wiped by the log-clear
  // it does just before kicking off the run. Consumed (and cleared) by onStart.
  let pendingStartNotice = null;
  
  // Current batch position, surfaced by core.onJob during a runBatch loop. Reset
  // to {1, 1} at the start of each run so single-job runs (which never call
  // onJob) display "Job 1/1" in the top bar instead of leftover values.
  let currentJobInfo = { i: 1, n: 1 };
  
  /** Streamer-mode redaction. Emits a `redactHtml` dual-span so log lines render either the real value or '••••' depending on the panel's `.streamer-on` class — CSS-toggled, so already-printed log lines re-render the moment the streamer-mode checkbox flips. '@me' passes through verbatim (literal Discord URL token, not a sensitive ID). Empty / null inputs pass through so callers don't have to null-guard. */
  function dot(v) {
    if (v == null || v === '') return v;
    if (v === '@me') return '@me';
    return redactHtml(v);
  }
  
  
  // ============================================================================
  // QUEUE PARSING & MUTATION
  // ----------------------------------------------------------------------------
  // The server / channel inputs encode the queued targets:
  //   server  : "S1,S2,S3"
  //   channel : "C1,C2;;C3"   — semicolons separate per-server groups
  // An empty group (";", or "C1;") means server-wide wipe of that server.
  // When the channel input has no ';' and the server input has more than one ID,
  // the legacy parallel-CSV interpretation is used; Add buttons rewrite the
  // inputs to grouped format on the next click.
  // ============================================================================
  
  /** Parses the Server / Channel inputs into a flat `[{guildId, channelId}, ...]` target list. Channel entries with no parent server (orphans) are counted but not included in the list. Defaults to reading the live form fields; callers can pass raw strings instead (used by the redundancy check to parse snapshot targets without touching the DOM). */
  function parseTargets(guildRaw, channelRaw) {
    if (guildRaw   === undefined) guildRaw   = $('input#guildId').value;
    if (channelRaw === undefined) channelRaw = $('input#channelId').value;
    guildRaw   = guildRaw.trim();
    channelRaw = channelRaw.trim();
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
      // Channels in groups beyond the server list = orphans.
      for (let i = servers.length; i < groups.length; i++) orphans += groups[i].length;
    } else {
      // Legacy parallel-CSV (multiple servers, no ';' delimiter): each comma in
      // the channel list pairs with the same-index server, last-server clamps.
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
  
  /**
   * Appends a (server, channel) pair to the queue.
   *   - Adding (S, '') over (S, channels) absorbs the channels — server-wide wins.
   *   - Adding (S, C) over (S, '') narrows the server-wide entry to just C.
   *   - Plain duplicates surface as a "<id> is already in the queue." log line.
   */
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
        return log.info(`${dot(server)} is already queued as server-wide.`);
      }
      if (!wasNew && groups[idx].length > 0) {
        log.warn(`Server-wide wipe of ${dot(server)} absorbed ${groups[idx].length} channel-specific entr${groups[idx].length === 1 ? 'y' : 'ies'}.`);
      }
      groups[idx] = [];
    } else {
      // Channel-specific. If the server is currently server-wide, NARROW it to
      // this channel. (Add Channel after Add Server means "actually, just this one".)
      if (!wasNew && groups[idx].length === 0) {
        log.info(`Server-wide wipe of ${dot(server)} narrowed to ${dot(server)}:${dot(channel)}.`);
        groups[idx] = [channel];
      } else {
        if (groups[idx].includes(channel)) {
          return log.info(`${dot(server)}:${dot(channel)} is already in the queue.`);
        }
        groups[idx].push(channel);
      }
    }
  
    writeQueue(servers, groups);
  }
  
  /** Reads the Server / Channel input values into `{ servers: [], groups: [[], []...] }`. Migrates legacy parallel-CSV (servers duplicated to align with channels) into grouped form. */
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
  
  /** Writes a `{ servers, groups }` queue back into the Server / Channel input fields and refreshes the top-bar synopsis. */
  function writeQueue(servers, groups) {
    $('input#guildId').value   = servers.join(',');
    $('input#channelId').value = groups.map(g => g.join(',')).join(';');
    renderQueue();
  }
  
  /** Removes every entry for `server` from the queue (server-wide and per-channel). */
  function removeServer(server) {
    const { servers, groups } = readQueue($('input#guildId').value, $('input#channelId').value);
    const idx = servers.indexOf(server);
    if (idx === -1) {
      log.info(`${dot(server)} is not in the batch — nothing to remove.`);
      return;
    }
    servers.splice(idx, 1);
    groups.splice(idx, 1);
    log.info(`Removed ${dot(server)} from the batch.`);
    writeQueue(servers, groups);
  }
  
  /** Drops `@me` from the queue when it has no DM channels attached. A bare `@me` (no DM channels) is unrunnable — server-wide @me has no valid Discord search endpoint. */
  function cleanupOrphanedMe() {
    const { servers, groups } = readQueue($('input#guildId').value, $('input#channelId').value);
    const idx = servers.indexOf('@me');
    if (idx === -1) return;            // no @me — nothing to do
    if (groups[idx].length > 0) return; // @me still has DM channels — keep it
    servers.splice(idx, 1);
    groups.splice(idx, 1);
    log.warn('Dropped @me from the queue — server-wide @me isn\'t a valid wipe target. Use "Add DMs" or capture specific DMs with Select on Channel instead.');
    writeQueue(servers, groups);
  }
  
  /** Removes one (server, channel) pair from the queue. When the last channel under a server is removed, the server widens back to a server-wide wipe — except for `@me`, which is dropped entirely (a server-wide @me is unrunnable). */
  function removeChannel(server, channel) {
    const { servers, groups } = readQueue($('input#guildId').value, $('input#channelId').value);
    const idx = servers.indexOf(server);
    if (idx === -1) {
      log.info(`${dot(server)}:${dot(channel)} is not in the batch — nothing to remove.`);
      return;
    }
    if (groups[idx].length === 0) {
      log.info(`${dot(server)} is queued as server-wide — use 'Delete' on the server to remove it.`);
      return;
    }
    const cIdx = groups[idx].indexOf(channel);
    if (cIdx === -1) {
      log.info(`${dot(server)}:${dot(channel)} is not in the batch — nothing to remove.`);
      return;
    }
    groups[idx].splice(cIdx, 1);
    if (groups[idx].length === 0) {
      if (server === '@me') {
        // Drop @me entirely — a bare @me with no DM channels has no valid
        // search endpoint and would error at run time.
        servers.splice(idx, 1);
        groups.splice(idx, 1);
        log.info(`Removed ${dot(server)}:${dot(channel)} — last DM in the queue, dropping @me entirely (server-wide @me isn't a valid wipe target).`);
      } else {
        log.info(`Removed ${dot(server)}:${dot(channel)} — last channel, server converted to server-wide wipe.`);
      }
    } else {
      log.info(`Removed ${dot(server)}:${dot(channel)} from the batch.`);
    }
    writeQueue(servers, groups);
  }
  
  
  // ============================================================================
  // TOP-BAR / RENDER
  // ----------------------------------------------------------------------------
  // Idle-state synopsis printed above the log: queue summary, import summary,
  // or empty-queue hint. Running-state text is owned by bindCoreEvents().
  // ============================================================================
  
  /** Triggered after every queue mutation to refresh the top-bar synopsis. */
  function renderQueue() {
    renderTopBar();
  }
  
  /** Repaints the top-bar idle status line — one of: import summary, queue synopsis, or empty-queue hint. Bails out during an active run so it can't overwrite onProgress output. */
  function renderTopBar() {
    if (!ui.topBarSlot) return; // not yet cached (called pre-init)
    if (undiscordCore.state.running) return; // onProgress owns the slot during a run
  
    if (importedSet) {
      const { messages, channelCount, oldestTs, newestTs } = importedSet;
      const fmt = (ts) => ts ? new Date(ts).toISOString().slice(0, 10) : '—';
      ui.topBarSlot.innerHTML =
        `<span class="status-line">Imported ${messages.length.toLocaleString()} message${messages.length === 1 ? '' : 's'} from ` +
        `${channelCount} channel${channelCount === 1 ? '' : 's'}. ` +
        `| Date start: ${fmt(oldestTs)} | Date end: ${fmt(newestTs)} |</span>`;
      return;
    }
  
    const { targets } = parseTargets();
    if (targets.length === 0) {
      ui.topBarSlot.innerHTML =
        `<span class="status-line status-empty">Empty queue — add a target or import a data export.</span>`;
      return;
    }
  
    // Per-category counts. Servers = distinct guildIds (incl @me). Channels =
    // entries with a specific channel ID. Server-wipes / Channel-wipes split the
    // entries by kind. Authors = comma-separated count from the Author ID field;
    // an empty field is read as 1 (defaults to self at run time).
    const servers = new Set(targets.map(t => t.guildId));
    const channelWipes = targets.filter(t => t.channelId).length;
    const serverWipes = targets.length - channelWipes;
    const authorCount = parseCsvList($('input#authorId').value).length || 1;
  
    ui.topBarSlot.innerHTML =
      `<span class="status-line">Ready: ` +
      `Servers: ${servers.size} | ` +
      `Channels: ${channelWipes} | ` +
      `Server-wipes: ${serverWipes} | ` +
      `Channel-wipes: ${channelWipes} | ` +
      `Authors: ${authorCount} |</span>`;
  }
  
  
  // ============================================================================
  // VERIFY ACTION
  // ----------------------------------------------------------------------------
  // Click handler for the 📋 Verify button. Walks every form input and prints a
  // structured snapshot of the current run configuration to the log so the user
  // can sanity-check it before clicking Delete. Read-only — never clears the
  // log. Streamer mode redacts sensitive IDs (author, mentions, server /
  // channel, snowflake bounds) the same way the message-preview log does.
  // ============================================================================
  
  /** Prints the active run configuration to the log without starting a run. Wired to the Verify button. */
  function verifyAction() {
    const sm = $('input#streamerMode').checked;
  
    log.info('── CONFIG VERIFY ──');
  
    if (importedSet) {
      const { messages, channelCount, oldestTs, newestTs } = importedSet;
      const fmt = (ts) => ts ? new Date(ts).toISOString().slice(0, 10) : '—';
      log.info(`Mode: import (live-search filters bypassed)`);
      log.info(`Imported set: ${messages.length.toLocaleString()} messages · ${channelCount} channel${channelCount === 1 ? '' : 's'} · ${fmt(oldestTs)} → ${fmt(newestTs)}`);
    } else {
      log.info(`Mode: live search`);
      const authorVal = $('input#authorId').value.trim();
      log.info(`Author ID: ${authorVal ? dot(authorVal) : '(empty — defaults to your own ID at run time)'}`);
  
      const { targets, orphans } = parseTargets();
      if (!targets.length) {
        log.info('Queue: empty');
      } else {
        const grouped = new Map();
        for (const t of targets) {
          if (!grouped.has(t.guildId)) grouped.set(t.guildId, []);
          if (t.channelId) grouped.get(t.guildId).push(t.channelId);
        }
        log.info(`Queue: ${grouped.size} server${grouped.size === 1 ? '' : 's'} / ${targets.length} target${targets.length === 1 ? '' : 's'}`);
        for (const [server, channels] of grouped) {
          const sLabel = server === '@me' ? '@me (DMs)' : `Server ${dot(server)}`;
          if (channels.length === 0) {
            log.info(`  · ${sLabel}: server-wide wipe`);
          } else {
            const chList = sm ? '' : ` — ${channels.join(', ')}`;
            log.info(`  · ${sLabel}: ${channels.length} channel${channels.length === 1 ? '' : 's'}${chList}`);
          }
        }
        if (orphans) log.warn(`  · ${orphans} orphan channel${orphans === 1 ? '' : 's'} without a parent server (will be skipped at run start).`);
      }
    }
  
    // Search filter is meaningless in import mode (no API call to filter).
    if (!importedSet) {
      const search = $('input#search').value.trim();
      const hasFlags = ['hasLink','hasImage','hasVideo','hasSound','hasSticker','hasPoll','hasEmbed','hasForward']
        .filter(id => $(`input#${id}`).checked)
        .map(id => id.slice(3).toLowerCase());
      const mentionsVal = $('input#mentionsId').value.trim();
      const mentionEv = $('input#mentionEveryone').checked;
      const pinned = $('select#pinnedMode').value;
      const excludeNsfw = $('input#excludeNsfw').checked;
      const parts = [];
      if (search) parts.push(`text "${search}"`);
      if (hasFlags.length) parts.push(`has ${hasFlags.join(', ')}`);
      if (mentionsVal) parts.push(`@user ${dot(mentionsVal)}`);
      if (mentionEv) parts.push(`has @everyone / @here`);
      if (pinned !== 'exclude') parts.push(`pinned: ${pinned}`);
      if (excludeNsfw) parts.push(`exclude NSFW`);
      log.info(`Search filter: ${parts.length ? parts.join(' · ') : '(none)'}`);
    }
  
    // Delete filter (some toggles still apply in import mode — content text and
    // attachment-MIME inferences both work since the export carries that data).
    const exSearch = $('input#excludeSearch').value.trim();
    const exMatch = $('select#excludeMatchMode').value;
    const exFlags = ['excludeLink','excludeImage','excludeVideo','excludeSound','excludeSticker','excludePoll','excludeEmbed','excludeForward']
      .filter(id => $(`input#${id}`).checked)
      .map(id => id.slice(7).toLowerCase());
    const exMentionsVal = $('input#excludeMentionsId').value.trim();
    const exMentionEv = $('input#excludeMentionEveryone').checked;
    const delParts = [];
    if (exSearch) delParts.push(`skip text "${exSearch}" (${exMatch})`);
    if (exFlags.length) delParts.push(`skip ${exFlags.join(', ')}`);
    if (exMentionsVal) delParts.push(`skip @users ${dot(exMentionsVal)}`);
    if (exMentionEv) delParts.push(`skip @everyone / @here`);
    log.info(`Delete filter: ${delParts.length ? delParts.join(' · ') : '(none)'}`);
  
    // Intervals — Messages-interval (snowflakes) wins over Date-interval.
    const minId = $('input#minId').value.trim();
    const maxId = $('input#maxId').value.trim();
    const minDate = $('input#minDate').value.trim();
    const maxDate = $('input#maxDate').value.trim();
    if (minId || maxId) {
      log.info(`Messages interval: ${minId ? dot(minId) : '(channel start)'} → ${maxId ? dot(maxId) : '(now)'}`);
      if (minDate || maxDate) log.info(`  · Date interval also set — Messages interval takes precedence at run time.`);
    } else if ((minDate && minDate !== '2015-01-01T00:00') || maxDate) {
      log.info(`Date interval: ${minDate || '2015-01-01T00:00'} → ${maxDate || '(now)'}`);
    }
  
    log.info(`Delay: search ${$('input#searchDelay').dataset.ms}ms · delete ${$('input#deleteDelay').dataset.ms}ms`);
    log.info('── END VERIFY ──');
  }
  
  
  // ============================================================================
  // INIT — ENTRY POINT
  // ----------------------------------------------------------------------------
  // Called once on script load: injects the panel HTML/CSS, mounts the trash
  // icon (server-bar by default, with a bottom-right floating-action-button as
  // fallback), registers Ctrl+Shift+D, and binds every panel button to its
  // handler. After this returns, the script is idle until the user clicks Delete.
  // ============================================================================
  
  /** Mounts the panel, the trash icons, the keyboard shortcut, and binds every input/button to its handler. Called once at script load. */
  function initUI() {
  
    insertCss(styles);
  
    ui.undiscordWindow = createElm(undiscordTemplate);
    document.body.appendChild(ui.undiscordWindow);
  
    // Draggable by the header, resizable from 8 edge/corner handles.
    new Drag({ elm: ui.undiscordWindow, moveHandle: $('.header') });
  
    // Floating action button — fallback trash icon in the bottom-right. Stays
    // hidden whenever the server-bar injection succeeds (see syncServerBarBtn).
    ui.undiscordBtn = createElm(buttonHtml);
    ui.undiscordBtn.onclick = toggleWindow;
    document.body.appendChild(ui.undiscordBtn);
  
    // Server-bar injection — try to mount the trash icon inside Discord's left
    // rail (between the DM/Home separator and the first server). Polls every
    // 1 s to re-inject if React drops it. Falls back to the FAB if Discord's
    // DOM doesn't expose the expected anchors.
    syncServerBarBtn();
    setInterval(syncServerBarBtn, 1000);
  
    // Keyboard shortcut: Ctrl+Shift+D toggles the panel.
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === 'KeyD') {
        e.preventDefault();
        e.stopPropagation();
        toggleWindow();
      }
    }, true);
  
    /** Toggles the panel open/closed and dims/brightens the FAB icon to match. */
    function toggleWindow() {
      if (ui.undiscordWindow.style.display !== 'none') {
        ui.undiscordWindow.style.display = 'none';
        ui.undiscordBtn.style.color = '#b5bac1'; // muted (matches --_u-int)
      }
      else {
        ui.undiscordWindow.style.display = '';
        ui.undiscordBtn.style.color = '#ffffff'; // bright (matches --_u-int-active)
      }
    }
  
    /** Builds the trash-icon DOM element to inject into Discord's server bar. Style and shape come from the unscoped `#undiscord-server-btn` rules in styles.css. */
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
  
    /** Ensures the server-bar trash icon exists; injects if missing, hides the FAB when present, shows the FAB as fallback when Discord's DOM doesn't have the expected anchors. */
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
  
    // Cached elements.
    ui.logArea = $('#logArea');
    ui.autoScroll = $('#autoScroll');
    ui.progressMain = $('#progressBar');
    ui.progressIcon = ui.undiscordBtn.querySelector('progress');
    ui.topBarSlot = $('#topBarSlot');
    ui.footerTime = $('#footerTime');
  
    $('#hide').onclick = toggleWindow;
    // The primary button is dual-purpose: Delete when idle, Stop when a run is
    // in flight. State is keyed off core's running flag so a single click handler
    // dispatches to the right path; bindCoreEvents flips the label/title in sync.
    $('button#start').onclick = () => {
      if (undiscordCore.state.running) stopAction();
      else startAction();
    };
    $('button#verify').onclick = verifyAction;
    $('button#clear').onclick = () => ui.logArea.innerHTML = '';
    $('button#resetSelection').onclick = () => {
      resetAllSelection();
      log.info('Selection reset to defaults.');
    };
    $('button#queueSelection').onclick = queueSelectionAction;
    $('button#dropBatches').onclick = () => {
      if (selectionQueue.length === 0) return;
      const n = selectionQueue.length;
      selectionQueue = [];
      renderQueueBadge();
      log.info(`Dropped ${n} queued batch${n === 1 ? '' : 'es'}.`);
    };
    $('button#getAuthor').onclick = () => {
      const id = getAuthorId();
      if (id) $('input#authorId').value = id;
    };
    // Add Server queues (currentServer, '') as a server-wide wipe; the current
    // server is read from Discord's URL. @me is rejected here: server-wide @me
    // has no valid Discord search endpoint. Use "Add DMs" instead.
    $('button#addGuild').onclick = () => {
      const server = getGuildId();
      if (server === '@me') {
        return log.warn('"Add" on Server doesn\'t apply to the DM list — use "Add DMs" in the DMs section to queue all currently-open DMs.');
      }
      if (server) addPair(server, '');
    };
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
    // Add all DMs: fetch every open DM channel via GET /users/@me/channels and
    // queue each as (@me, <channelId>). Group DMs (type 3) are included unless
    // the "Exclude group DMs" checkbox is ticked. DMs X'd out of the sidebar
    // aren't returned by this endpoint, so they're skipped.
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
  
      const excludeGroups = $('input#excludeGroupDms').checked;
      const dms = channels.filter(c => c.type === 1 || (!excludeGroups && c.type === 3));
      if (!dms.length) return log.info('No open DM channels found.');
  
      for (const c of dms) addPair('@me', c.id);
  
      const direct = dms.filter(c => c.type === 1).length;
      const group = dms.filter(c => c.type === 3).length;
      const summary = excludeGroups
        ? `Queued ${direct} direct DM${direct === 1 ? '' : 's'} (group DMs excluded).`
        : `Queued ${dms.length} DM${dms.length === 1 ? '' : 's'} (${direct} direct, ${group} group).`;
      log.info(summary);
    };
    // Clear DMs: strip the @me server entry (and all its DM channels) from the queue.
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
  
    // Live-update the queue counter as the user types, then sanitise on commit
    // (blur after edit). The sanitise step strips orphaned @me so neither manual
    // edits nor channel-field deletions can leave it as an unrunnable phantom.
    $('input#guildId').addEventListener('input', renderQueue);
    $('input#channelId').addEventListener('input', renderQueue);
    $('input#guildId').addEventListener('change', cleanupOrphanedMe);
    $('input#channelId').addEventListener('change', cleanupOrphanedMe);
    renderQueue();
    renderQueueBadge();
  
    // Import data export — folder picker, summary, clear button.
    bindImportControls();
  
    // Stepper controls for search/delete delays. User-driven changes go straight
    // to core options + decay baseline. Rate-limit bumps inside core can still
    // push the effective delay above the user's max temporarily; it decays back
    // to the baseline.
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
    // Import-mode exclusion inputs — same paste behaviour (snowflake-shaped IDs
    // append with dedup; non-ID clipboards fall through to native paste).
    bindMultiUserPaste($('input#importExcludeServers'),  'Import: Exclude Server');
    bindMultiUserPaste($('input#importExcludeChannels'), 'Import: Exclude Channel');
    bindMultiUserPaste($('input#importExcludeUsers'),    'Import: Exclude DM User');
  
    // Point-and-click ID capture: each Select button arms a global click
    // listener; the next click on a Discord user/avatar/message/server-icon/
    // channel extracts the relevant ID. Hold Shift to capture multiple in a row.
    bindSelector('selectAuthor',         'authorId',         'user',    'Author ID');
    bindSelector('selectGuild',          'guildId',          'server',  'Server ID');
    bindSelector('selectChannel',        'channelId',        'channel', 'Channel ID');
    bindSelector('selectMentions',       'mentionsId',       'user-single', 'Mentions');
    bindSelector('selectExcludeMentions','excludeMentionsId','user',    'Skip mentions');
    bindSelector('selectMinId',          'minId',            'message', 'After message ID');
    bindSelector('selectMaxId',          'maxId',            'message', 'Before message ID');
    // Import-mode exclusion Select buttons — *-multi types append to their
    // bound input instead of going through addPair (which is the queue path).
    bindSelector('selectImportExcludeServers',  'importExcludeServers',  'server-multi',  'Import: Exclude Server');
    bindSelector('selectImportExcludeChannels', 'importExcludeChannels', 'channel-multi', 'Import: Exclude Channel');
    bindSelector('selectImportExcludeUsers',    'importExcludeUsers',    'user',          'Import: Exclude DM User');
  
    // Import-mode exclusion Add / Delete buttons — append/remove the currently-
    // viewed server / channel from the exclusion CSV. Mirror the General queue's
    // addGuild / delGuild / addChannel / delChannel pattern. @me is allowed for
    // Server here (unlike the General queue) — excluding it skips every DM.
    $('button#addImportExcludeServers').onclick = () => {
      const server = getGuildId();
      if (server) addToCsvField($('input#importExcludeServers'), 'Import: Exclude Server', server);
    };
    $('button#delImportExcludeServers').onclick = () => {
      const server = getGuildId();
      if (server) removeFromCsvField($('input#importExcludeServers'), 'Import: Exclude Server', server);
    };
    $('button#addImportExcludeChannels').onclick = () => {
      const channel = getChannelId();
      if (channel) addToCsvField($('input#importExcludeChannels'), 'Import: Exclude Channel', channel);
    };
    $('button#delImportExcludeChannels').onclick = () => {
      const channel = getChannelId();
      if (channel) removeFromCsvField($('input#importExcludeChannels'), 'Import: Exclude Channel', channel);
    };
  
    // Clear buttons inside each text input. Server clear cascades to Channel
    // (channels are scoped to a parent server). Channel clear leaves Server alone.
    bindClearButton('clearAuthor',          'authorId',          'Author ID');
    bindClearButton('clearSearch',          'search',            'Include text');
    bindClearButton('clearExcludeSearch',   'excludeSearch',     'Skip text');
    bindClearButton('clearMentions',        'mentionsId',        'Mentions');
    bindClearButton('clearExcludeMentions', 'excludeMentionsId', 'Skip mentions');
    bindClearButton('clearExcludeExtensions', 'excludeExtensions', 'Skip extensions (custom)');
    bindClearButton('clearMinId',           'minId',             'After message ID');
    bindClearButton('clearMaxId',           'maxId',             'Before message ID');
    bindClearButton('clearImportExcludeServers',  'importExcludeServers',  'Import: Exclude Server');
    bindClearButton('clearImportExcludeChannels', 'importExcludeChannels', 'Import: Exclude Channel');
    bindClearButton('clearImportExcludeUsers',    'importExcludeUsers',    'Import: Exclude DM User');
    // Server clear also clears Channel — Channel can't exist without its parent.
    $('button#clearGuild').onclick = () => {
      const g = $('input#guildId'), c = $('input#channelId');
      if (!g.value.trim() && !c.value.trim()) return log.info('Server and Channel are already empty.');
      g.value = '';
      c.value = '';
      log.info('Cleared Server and Channel fields.');
      renderQueue();
    };
    // Channel clear leaves Server intact — except for @me, which gets dropped
    // (an @me entry with no DM channels is unrunnable).
    $('button#clearChannel').onclick = () => {
      const c = $('input#channelId');
      if (!c.value.trim()) return log.info('Channel field is already empty.');
      c.value = '';
      log.info('Cleared Channel field.');
      renderQueue();
      cleanupOrphanedMe();
    };
  
    // Date interval shortcuts. 1 day / 1 week set min=now−Δ, max=now. "All"
    // resets After to Discord's epoch (visible lower bound) and clears Before.
    $('button#datePresetDay').onclick  = () => setDateRange(1);
    $('button#datePresetWeek').onclick = () => setDateRange(7);
    $('button#datePresetAll').onclick  = () => setDateRange(null);
  
    // Live pre-2015 clamp on each date field — fires the moment the user commits a value.
    bindDateClamp('minDate', 'After date');
    bindDateClamp('maxDate', 'Before date');
  
    // Streamer mode: drives two separate effects.
    //   1. CSS — toggling .streamer-on on the panel root dots out every ID-bearing
    //      input field (see the .streamer-on rules in styles.css). Text-content
    //      filter inputs stay readable.
    //   2. Run-time — the streamerMode option is read by core in promptConfirmation
    //      and the per-delete log line; both redact the message body and author.
    const syncStreamerClass = () => {
      ui.undiscordWindow.classList.toggle('streamer-on', $('input#streamerMode').checked);
    };
    $('input#streamerMode').addEventListener('change', syncStreamerClass);
    syncStreamerClass();
  
    // Help-button delegation: every <button class="help-btn" data-help="<key>">
    // routes to the matching HELP_TEXT entry. preventDefault stops the click
    // from triggering the parent <details> when the button is embedded in a <summary>.
    ui.undiscordWindow.addEventListener('click', (e) => {
      const btn = e.target.closest('button.help-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        showHelp(btn.dataset.help);
      }
    });
  
    // Mutually-exclusive checkbox pairs between Search filter and Delete filter
    // — checking one auto-unchecks its counterpart. Both checked at once would
    // always match nothing.
    for (const t of ['Link', 'Image', 'Video', 'Sound', 'Sticker', 'Poll', 'Embed', 'Forward']) {
      bindMutex(`has${t}`, `exclude${t}`);
    }
    bindMutex('mentionEveryone', 'excludeMentionEveryone');
  
    // Skip Image / Skip Video category toggles cascade onto their preset
    // extension pills (and unchecking any child clears the parent).
    bindCascade('excludeImage', ['jpg', 'png']);
    bindCascade('excludeVideo', ['mp4', 'webm']);
  
    // Redirect log calls to the in-panel log area now that the DOM is ready.
    setLogFn(printLog);
  
    bindCoreEvents();
  }
  
  
  // ============================================================================
  // DATE INTERVAL HELPERS
  // ----------------------------------------------------------------------------
  // Discord's snowflake epoch (2015-01-01) is the lower bound on any valid
  // message timestamp. Date inputs auto-clamp to [epoch, now] on commit.
  // ============================================================================
  
  const DISCORD_EPOCH_LOCAL = '2015-01-01T00:00';
  const DISCORD_EPOCH_MS = new Date(DISCORD_EPOCH_LOCAL).getTime();
  
  /** Formats a Date as the YYYY-MM-DDTHH:MM string that `<input type="datetime-local">` requires. */
  function fmtLocal(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  
  /** On every committed change to a date input, snaps out-of-range values back into [Discord epoch, now] and emits a warning. Empty values and currently-invalid drafts are left alone. */
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
  
  /** Sets the After/Before date inputs to "now − N days" through "now". Pass null for "all time" — After resets to Discord's epoch, Before clears (no upper bound). */
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
  
  
  // ============================================================================
  // HELP-BUTTON REGISTRY
  // ----------------------------------------------------------------------------
  // Each key maps to a { name, lines } entry printed into the log when a [Help]
  // button with the matching `data-help=<key>` attribute is clicked. HTML is
  // preserved in lines (so <i>/<b>/<code> work); use &lt;/&gt; for literal angle
  // brackets and &nbsp; for indentation.
  //
  // To add help for a new section:
  //   1. Add a key + { name, lines: [...] } entry below.
  //   2. Add a <button class="help-btn" data-help="<key>">Help</button> as a
  //      sibling of the relevant <legend> in undiscord.html.
  // ============================================================================
  
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
        "Anything Discord returns can still be excluded post-search via the <b>Delete filter</b> section.",
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
        "Right-click any message → <b>Copy Message Link</b>, paste into either field. The script <b>auto-strips the URL</b> down to just the trailing message ID — no manual cleanup needed. Pasting a bare snowflake also works directly.",
        "<b>Messages interval overrides Date interval</b> if both are set.",
      ],
    },
    tabDateInterval: {
      name: 'Date interval',
      lines: [
        "Bound the wipe by date. Use the date pickers, or click <b>1 Day</b> / <b>1 Week</b> / <b>All</b> for convenience presets.",
        "Pre-2015 and future dates auto-clamp on input with a warning. After defaults to Discord's launch (2015-01-01).",
        "Ignored if <b>Messages interval</b> is also set.",
      ],
    },
    tabAdvanced: {
      name: 'Delay settings',
      lines: [
        "Tune the per-page wait (<b>Search delay</b>) and per-delete pause (<b>Delete delay</b>).",
        "Both auto-bump on Discord's 429 rate-limit responses, then decay back toward your stepper value as subsequent requests succeed.",
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
        "<b>Auto-format on paste:</b> pasting one snowflake-shaped ID, or a comma-separated list of them, appends to the current value with deduplication — no need to manually edit the existing text. Pastes that aren't snowflake-shaped fall through to native paste so you can correct typos.",
        "Click <b>Select</b> to enter point-and-click capture mode, then click any user / avatar / message author in Discord to capture their User ID — hold Shift to capture several in a row.",
        "Non-self authors require <i>Manage Messages</i> permission on their target server. A pre-flight check runs once at the top of the batch and aborts early if any pair lacks it.",
        "DMs are excluded from multi-author batching — Discord only lets you delete your own DM messages, so each DM target spawns one self-author job regardless of how many IDs are in the list.",
        "<b>Exclude NSFW channels</b> checkbox (default off): when checked, age-gated channels return zero results from Discord's search API. Default behavior is to include them.",
      ],
    },
    serverId: {
      name: 'Server ID',
      lines: [
        "The Discord Server (Guild) where messages should be deleted.",
        "Click <b>Add</b> while viewing a server to queue it (server-wide wipe — current Server ID is read from Discord's URL).",
        "Click <b>Select</b> to enter point-and-click capture mode, then click any server icon in Discord to queue it. Hold Shift to capture several in a row.",
        "Click <b>Delete</b> to remove the current server from the queue.",
        "Multiple servers can be queued — the run processes them sequentially as one batch.",
        "An empty <b>Channel ID</b> with this set means <i>wipe the entire server</i> (every channel you have access to).",
        "Right-click a server icon &rarr; <b>Copy Server ID</b> (Developer Mode required).",
      ],
    },
    channelId: {
      name: 'Channel ID',
      lines: [
        "Restrict the wipe to a specific channel inside the queued server.",
        "Click <b>Add</b> while inside a channel to queue (currentServer, currentChannel) — both are read from Discord's URL.",
        "Click <b>Select</b> to enter point-and-click capture mode, then click any channel (or any message inside one) in Discord. Hold Shift to capture several in a row.",
        "Click <b>Delete</b> to remove the current channel from the queue. Removing the last channel under a server widens it back to a server-wide wipe.",
        "Leave empty (with a Server ID set) to target the whole server.",
        "Right-click a channel name &rarr; <b>Copy Channel ID</b> (Developer Mode required).",
      ],
    },
    dms: {
      name: 'DMs',
      lines: [
        "Click <b>Add DMs</b> to queue every DM channel currently open in your sidebar — both 1:1 and group DMs by default. Check <b>Exclude group DMs</b> to leave group DMs out of the bulk add.",
        "Click <b>Clear DMs</b> to remove every queued DM at once.",
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
        "<b>Auto-format on paste:</b> pasting a snowflake-shaped ID overwrites the field directly. Non-snowflake clipboards fall through to native paste so you can edit freely.",
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
    excludeExtension: {
      name: 'Skip extension',
      lines: [
        "Skip messages whose attachments include any file with one of the listed extensions.",
        "<b>Quick toggles</b> — the 8 preset pills cover the most-shared file types on Discord: .jpg, .png, .mp4, .webm, .pdf, .docx, .txt, .zip. Toggle any green to skip messages with attachments of that type.",
        "<b>Custom extensions</b> — for anything not in the presets, enter a semicolon-separated list (with or without leading dots), e.g. <code>.psd;.dmg;.iso</code>. Whitespace is trimmed; case is normalized; dots are optional.",
        "<b>How matching works</b> — for each attachment on a message, the file extension is taken from its filename (live search) or its URL (import mode), lowercased, and checked against the merged set of presets + custom. Any single attachment match drops the whole message.",
        "Applied client-side after the search response (or as part of the import-mode pre-pass) — works alongside the other Skip toggles.",
        "Asymmetric on purpose — there is no Include-extension counterpart on the Search filter side, since Discord's search API only filters by attachment <i>category</i> (image / video / sound / etc.) and not specific extensions.",
      ],
    },
    excludeUser: {
      name: 'Skip @user',
      lines: [
        "Skip messages where any of these users are @mentioned — they survive the run.",
        "<b>Multi-value</b> — comma-separate any number of user IDs, or paste/capture them one at a time and they'll append (with dedup). Every listed ID is checked against each message's mentions at filter time, so all of them work in a single pass — unlike <b>Include @user</b>, this side has no API limit because it's a client-side check after the search response.",
        "<b>Auto-format on paste:</b> pasting a single snowflake-shaped ID, or a comma-separated list, appends to the current value with deduplication. Non-snowflake clipboards fall through to native paste.",
        "Toggle <b>skip @everyone / @here</b> to also skip messages that pinged everyone or online users.",
        "Right-click a user &rarr; <b>Copy User ID</b> (Developer Mode required), or use <b>Select</b> and click avatars/usernames; hold Shift to capture several in a row.",
        "An ID listed here cannot also be in <b>Include @user</b> — that combination would always match nothing.",
      ],
    },
    messagesInterval: {
      name: 'Messages interval',
      lines: [
        "Bound the search to messages between two specific message IDs (Discord snowflakes).",
        "<b>Auto-format on paste:</b> right-click a message &rarr; <b>Copy Message Link</b>, then paste into either field — the script auto-strips the URL down to just the trailing message ID. Pasting a bare snowflake also works directly. Non-link clipboards fall through to native paste.",
        "Click <b>Select</b> next to either field to enter point-and-click capture mode, then click any message in Discord to capture its ID.",
        "<b>After ID</b> must be older (smaller snowflake) than <b>Before ID</b>.",
        "If only one bound is set, the other is unbounded (channel start or current time).",
        "<b>Messages interval overrides Date interval</b> if both are set.",
      ],
    },
    dateInterval: {
      name: 'Date interval',
      lines: [
        "Bound the search to messages posted between two dates.",
        "Use the datetime pickers, or click <b>1 Day</b> / <b>1 Week</b> / <b>All</b> for convenience presets.",
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
        "On a 429, the effective delay auto-bumps to whatever Discord asks for, then decays back toward your stepper value as subsequent requests succeed (half-life decay).",
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
    importFolder: {
      name: 'Import folder',
      lines: [
        "<b>What to pick:</b> the <code>messages/</code> folder inside your unzipped Discord data export — the folder that contains the per-channel <code>c&lt;ID&gt;/</code> subfolders and the top-level <code>index.json</code>. Pick the parent folder, NOT a single channel folder.",
        "<b>Click <b>Select Folder...</b></b> to open the OS folder picker. Your browser will warn that the site is about to read every file in the folder — that's the standard <code>webkitdirectory</code> consent prompt; nothing is uploaded, files are read locally via the browser's File API.",
        "<b>After selection</b>: the parser walks every <code>c&lt;ID&gt;/messages.json</code> in the tree, reads the per-channel <code>channel.json</code> for guild / DM metadata, then prints a summary line plus a per-source breakdown into the log. The status line above the log flips to <i>import mode</i>.",
        "<b>Click <b>Clear Import</b></b> to drop the loaded set from memory and return to live-search mode. Picking a different folder afterwards loads it fresh — there's no need to clear first if you just want to swap exports.",
        "<b>If your browser doesn't support folder picking</b> (rare on desktop): the picker has <code>multiple</code> too, so Ctrl+A inside the unzipped <code>messages/</code> folder and pick all files as a flat batch. The parser groups them by parent folder name, so the result is identical.",
        "<b>Picking the wrong folder</b> (e.g. the top-level export folder instead of <code>messages/</code>) errors out with \"No c&lt;channelId&gt;/ folders found.\" — the parser refuses to half-import.",
      ],
    },
    importExport: {
      name: 'Import data export',
      lines: [
        "Pre-load message IDs from your Discord data export and skip the search phase entirely. Roughly <b>3-5x faster</b> than search-mode on large wipes, with no risk of \"search index lag\" empty-page failures.",
        "<b>How to get an export:</b> Discord settings &rarr; Privacy &amp; Safety &rarr; <b>Request All My Data</b>. Discord emails you a ZIP after a few minutes (sometimes a few days). Unzip it locally — inside is a <code>messages/</code> folder.",
        "<b>How to use it:</b> Click <b>Select Folder...</b> and pick that <code>messages/</code> folder. The summary line fills in (total messages, channel count, oldest/newest date). Set Date or Messages interval if you want to bound the wipe. Click <b>▶︎ Delete</b>.",
        "<b>What still applies:</b> Date interval, Messages interval, Delete delay, Streamer mode, plus the Skip filters that have data to operate on — Skip text, Skip Link, Skip Image, Skip Video, Skip Sound, Skip extension (presets + custom), Skip @user, Skip @everyone/@here. All applied as a client-side pre-pass before the delete loop starts. Mention skips work because Discord's export stores user mentions inline in the content as <code>&lt;@USERID&gt;</code> and the literal <code>@everyone</code>/<code>@here</code> text. Extension matching uses the URL since the export doesn't carry filenames.",
        "<b>What doesn't apply:</b> Author / Server / Channel / DMs queue, Search filter, and the Skip filters that need metadata the export doesn't carry — Skip Sticker, Skip Poll, Skip Embed, Skip Forward. Those individual toggles grey out when an import is loaded; if any are checked from before, a warning lists them at run start.",
        "<b>Edge cases:</b> Already-deleted messages return 404 (counted as failed but harmless). Channels you've lost access to (banned, deleted, etc) return 403 (same).",
        "<b>Privacy:</b> the export is parsed in-browser. Nothing is uploaded — there is no code path that sends imported data anywhere. The export contains every DM you've ever had; don't commit <code>messages/</code> to a git repo (the bundled <code>.gitignore</code> covers this).",
        "Click <b>Clear Import</b> to drop the loaded set and return to live-search mode.",
      ],
    },
    importExcludeServer: {
      name: 'Import — Exclude Server',
      lines: [
        "Drop entire <b>servers</b> from the import before the delete loop runs. Comma-separate any number of Server IDs.",
        "Click <b>Select</b> and then click a server icon in Discord to capture its ID — hold Shift to capture several in a row.",
        "<b>Auto-format on paste:</b> pasting one snowflake-shaped ID, or a comma-separated list, appends to the current value with deduplication. Non-snowflake clipboards fall through to native paste.",
        "Matches against each message's <code>guildId</code> as recorded in <code>channel.json</code>. <b>Use <code>@me</code></b> to drop every DM and group DM in one go (they all carry <code>guildId=@me</code>).",
        "For a wildcard \"drop every server\" pass, see the <b>Exclude servers</b> pill above the selector fields — the convenience equivalent of listing every server ID here.",
        "Servers in the export but not currently joined still match — the filter is purely client-side against the export data.",
      ],
    },
    importExcludeChannel: {
      name: 'Import — Exclude Channel',
      lines: [
        "Drop specific <b>channels</b> from the import. Comma-separate any number of channel IDs (works for guild channels, DMs, and group DMs alike — they all use the same snowflake format).",
        "Click <b>Select</b> and then click a channel in the sidebar (or any message inside one) to capture its ID — hold Shift to capture several in a row.",
        "<b>Auto-format on paste:</b> pasting one snowflake-shaped ID, or a comma-separated list, appends with deduplication. Non-snowflake clipboards fall through to native paste.",
        "Matches against each message's <code>channelId</code>. Independent of <b>Exclude Server</b> — a channel listed here is dropped even if its parent server isn't excluded.",
        "For a wildcard \"drop every group DM\" pass, see the <b>Exclude group DMs</b> pill above the selector fields.",
      ],
    },
    importExcludeUser: {
      name: 'Import — Exclude DM with User',
      lines: [
        "Drop <b>DMs</b> and <b>group DMs</b> that include the listed user(s) as participants. Comma-separate any number of User IDs.",
        "Click <b>Select</b> and then click an avatar / username / message author in Discord to capture the User ID — hold Shift to capture several in a row.",
        "<b>Auto-format on paste:</b> pasting one snowflake-shaped ID, or a comma-separated list, appends with deduplication. Non-snowflake clipboards fall through to native paste.",
        "Matches against the channel's <code>recipients</code> list (from <code>channel.json</code>). For group DMs, any single matched recipient drops the whole group.",
        "For a wildcard \"drop every 1:1 DM\" pass, see the <b>Exclude DMs</b> pill above the selector fields.",
        "<b>Guild messages are unaffected by design</b> — every message in your own data export was sent <i>by</i> you, so there's no other-author dimension to filter on. Use <b>Exclude Channel</b> if you want to spare specific guild channels.",
      ],
    },
  };
  
  /** Looks up a HELP_TEXT entry by key and prints its lines into the log. No-op when the key is unknown. */
  function showHelp(key) {
    const entry = HELP_TEXT[key];
    if (!entry) return;
    log.info(`── ${entry.name.toUpperCase()} ──`);
    for (const line of entry.lines) log.info(`› ${line}`);
  }
  
  
  // ============================================================================
  // CHECKBOX BINDERS
  // ----------------------------------------------------------------------------
  // Bidirectional couplings between checkboxes — mutex (one-or-the-other) and
  // cascade (parent-with-children).
  // ============================================================================
  
  /** Mutex pair — checking one checkbox silently unchecks the other. Used between Search-filter and Delete-filter pairs where both checked at once would always match nothing. */
  function bindMutex(idA, idB) {
    const a = $(`input#${idA}`);
    const b = $(`input#${idB}`);
    a.addEventListener('change', () => { if (a.checked && b.checked) b.checked = false; });
    b.addEventListener('change', () => { if (a.checked && b.checked) a.checked = false; });
  }
  
  /**
   * Couples a category-level Skip toggle (e.g. excludeImage) with its preset
   * extension pills (e.g. .jpg, .png). Two-way:
   *   - Parent toggled ON  → all children forced ON (cascade down).
   *   - Parent toggled OFF → all children forced OFF (cleanup).
   *   - Any child unchecked → parent unchecked (the "skip ALL of this category"
   *     claim is no longer true once a child is excluded).
   *   - Child checked alone → parent left untouched.
   */
  function bindCascade(parentId, childExts) {
    const parent = $(`input#${parentId}`);
    const children = childExts.map(ext => ui.undiscordWindow.querySelector(`input[data-ext="${ext}"]`));
    parent.addEventListener('change', () => {
      for (const c of children) c.checked = parent.checked;
    });
    for (const c of children) {
      c.addEventListener('change', () => {
        if (!c.checked && parent.checked) parent.checked = false;
      });
    }
  }
  
  
  // ============================================================================
  // DELAY STEPPERS
  // ----------------------------------------------------------------------------
  // Spinner-style controls for the search/delete delays. Display value is the
  // raw integer ms; the unit suffix lives in the legend "(ms)" instead.
  // ============================================================================
  
  const SEARCH_MIN = 15000, SEARCH_MAX = 60000, SEARCH_STEP = 500, SEARCH_DEFAULT = 45000;
  const DELETE_MIN = 100,   DELETE_MAX = 3000,  DELETE_STEP = 50,  DELETE_DEFAULT = 1000;
  
  /** Writes `ms` into the stepper input's display and `dataset.ms` mirror. */
  function setDelayDisplay(inputId, ms) {
    const input = $(`input#${inputId}`);
    input.dataset.ms = ms;
    input.value = String(ms);
  }
  
  /** Returns the stepper input's current ms value as an integer. */
  function getDelayMs(inputId) {
    return parseInt($(`input#${inputId}`).dataset.ms);
  }
  
  /** Reads every "Skip extension" toggle (preset pills carry data-ext) plus any custom extensions typed into #excludeExtensions (semicolon-separated, dots optional). Returns a deduplicated lowercase array of bare extensions; empty array means "no extension filter active". */
  function readSkipExtensions() {
    const presets = Array.from(ui.undiscordWindow.querySelectorAll('input[data-ext]:checked'))
      .map(el => el.dataset.ext.toLowerCase());
    const customRaw = $('input#excludeExtensions').value.trim();
    const custom = customRaw
      ? customRaw.split(/\s*;\s*/).map(s => s.replace(/^\./, '').toLowerCase()).filter(Boolean)
      : [];
    return [...new Set([...presets, ...custom])];
  }
  
  /** Wires up the down/up/reset buttons and direct-typing handler for one stepper input. Apply clamps to [min, max]; out-of-range typed values revert to the previous good value with a warning. */
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
  
    // Direct typing — parse the digits, clamp to [min, max], apply. Strips any
    // non-numeric characters so the user can edit the displayed string in place.
    // Fires on blur or Enter.
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
  
  
  // ============================================================================
  // MESSAGE LINK AUTO-STRIP
  // ----------------------------------------------------------------------------
  // Pasting a Discord message link into a message-ID input replaces the pasted
  // content with just the trailing message ID. Other clipboards paste normally.
  // ============================================================================
  
  /** Binds a paste handler that turns a pasted Discord message link into just the trailing message ID. Falls through to native paste when the clipboard isn't a message link. */
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
  
  
  // ============================================================================
  // POINT-AND-CLICK ID CAPTURE (SELECTION MODE)
  // ----------------------------------------------------------------------------
  // A Select button arms a global capture-phase click listener; the next click
  // on a Discord user / avatar / message / server icon / channel extracts the
  // matching ID and inserts it into the bound input. Hold Shift to capture
  // several in a row. Esc cancels. Auto-cancels after 60 s of inactivity.
  //
  // Type system:
  //   user            — multi-value user IDs (comma-append, dedup)
  //   user-single     — single user ID (overwrite)
  //   server          — server ID, routed through addPair() into the queue
  //   server-multi    — server ID appended to a multi-value text input
  //   channel         — channel ID + parent server, routed through addPair()
  //   channel-multi   — channel ID appended to a multi-value text input
  //   message         — single message ID (overwrite)
  // ============================================================================
  
  let selection = null;
  let selectionTimeout = null;
  const SELECTION_TIMEOUT_MS = 60000;
  
  /** Walks up from the click target to find a Discord message wrapper, then extracts the message ID from its `id="chat-messages-CHANNEL-MESSAGE"` attribute. */
  function extractMessageId(elem) {
    const wrapper = elem.closest && elem.closest('[id^="chat-messages-"]');
    const m = wrapper && wrapper.id.match(/chat-messages-\d+-(\d+)/);
    return m ? m[1] : null;
  }
  
  /** Extracts a server (guild) ID. Tries the server-list `data-list-item-id="guildsnav___<ID>"` attribute first, then falls back to the URL of the currently-viewed server (resolves to "@me" on the friends tab). */
  function extractServerId(elem) {
    const item = elem.closest && elem.closest('[data-list-item-id^="guildsnav___"]');
    if (item) {
      const m = item.getAttribute('data-list-item-id').match(/guildsnav___(\d+)/);
      if (m) return m[1];
    }
    // [\w@] so DM URLs like /channels/@me/<id> resolve to "@me", and the channel
    // segment is optional so the friends-tab URL /channels/@me matches too.
    const urlMatch = location.href.match(/channels\/([\w@]+)(?:\/\d+)?/);
    return urlMatch ? urlMatch[1] : null;
  }
  
  /**
   * Extracts a channel ID. Tries (in order):
   *   1. a server-channel sidebar item's data-list-item-id attribute
   *   2. a wrapping anchor whose href points at /channels/@me/<id> — DM list items
   *   3. the chat-messages wrapper of an open message in the active channel
   *   4. the URL of the currently-viewed channel
   */
  function extractChannelId(elem) {
    const item = elem.closest && elem.closest('[data-list-item-id^="channels___"]');
    if (item) {
      const m = item.getAttribute('data-list-item-id').match(/channels___(\d+)/);
      if (m) return m[1];
    }
    // DM sidebar item: anchor href is the most stable identifier across Discord
    // versions (data-list-item-id naming for DMs has churned more than href has).
    const dmLink = elem.closest && elem.closest('[href*="/channels/@me/"]');
    if (dmLink) {
      const m = (dmLink.getAttribute('href') || '').match(/\/channels\/@me\/(\d+)/);
      if (m) return m[1];
    }
    const msg = elem.closest && elem.closest('[id^="chat-messages-"]');
    if (msg) {
      const m = msg.id.match(/chat-messages-(\d+)-\d+/);
      if (m) return m[1];
    }
    // [\w@] (not just \w) so DM URLs like /channels/@me/<id> still match here.
    const urlMatch = location.href.match(/channels\/[\w@]+\/(\d+)/);
    return urlMatch ? urlMatch[1] : null;
  }
  
  /**
   * Pulls the user ID out of any Discord CDN URL form:
   *   - Global avatar : cdn.discordapp.com/avatars/<UID>/<HASH>.<ext>
   *   - Per-server    : cdn.discordapp.com/guilds/<GID>/users/<UID>/avatars/<HASH>.<ext>
   *   - Banner        : cdn.discordapp.com/banners/<UID>/<HASH>.<ext>
   * The /users/ form is checked BEFORE /avatars/ since per-server URLs contain
   * both segments, but only /users/<UID>/ holds the user's ID.
   */
  function userIdFromCdnUrl(url) {
    if (!url) return null;
    const m = url.match(/\/users\/(\d+)\//) || url.match(/\/avatars\/(\d+)\//) || url.match(/\/banners\/(\d+)\//);
    return m ? m[1] : null;
  }
  
  /** Scans every Discord-CDN image inside a message wrapper for a user ID. Returns the first one found, or null. */
  function scanMessageForUid(msg) {
    const candidates = msg.querySelectorAll('img[src*="cdn.discordapp.com"], img[src*="discordapp.net"]');
    for (const c of candidates) {
      const id = userIdFromCdnUrl(c.src);
      if (id) return id;
    }
    return null;
  }
  
  /**
   * Extracts a user ID from any clickable element in Discord. Tries (in order):
   *   1. avatar/banner img at or near the click target
   *   2. any CDN-served image inside the enclosing message
   *   3. for grouped follow-up messages (no avatar header), walk back through
   *      previous siblings until a sibling yields a user ID — that's the group
   *      head, which by Discord's grouping rules is the same author
   *   4. an explicit data-user-id attribute (mentions, popout elements)
   */
  function extractUserId(elem) {
    const img = (elem.closest && elem.closest('img')) || (elem.querySelector && elem.querySelector('img'));
    const fromImg = img && userIdFromCdnUrl(img.src);
    if (fromImg) return fromImg;
  
    const msg = elem.closest && elem.closest('[id^="chat-messages-"]');
    if (msg) {
      const direct = scanMessageForUid(msg);
      if (direct) return direct;
  
      // Grouped follow-up: walk back through previous siblings to the group head.
      let cursor = msg.previousElementSibling;
      while (cursor) {
        const id = scanMessageForUid(cursor);
        if (id) return id;
        cursor = cursor.previousElementSibling;
      }
    }
  
    const withData = elem.closest && elem.closest('[data-user-id]');
    return (withData && withData.getAttribute('data-user-id')) || null;
  }
  
  /** Arms selection mode. Re-clicking the same Select button cancels. Logs a hint about which kind of element to click. */
  function startSelection(input, type, label, button) {
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
      (type === 'user' || type === 'user-single')        ? 'a user, avatar, or message author' :
      (type === 'server'  || type === 'server-multi')    ? 'a server icon in the left rail' :
      (type === 'channel' || type === 'channel-multi')   ? 'a channel in the sidebar (or any message in it)' :
                                                           'a message';
    log.info(`Select mode active for ${label}: click ${target} in Discord to capture its ID. Hold Shift to capture multiple in a row. Esc to cancel.`);
  }
  
  /** Tears down selection mode — removes listeners, clears the timeout, removes the active styling on the Select button. */
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
  
  /** Restarts the 60-second auto-cancel timer. Called on selection start and after each Shift-held capture. */
  function resetSelectionTimeout() {
    if (selectionTimeout) clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      log.warn('Selection mode timed out after 60s — cancelled.');
      cancelSelection();
    }, SELECTION_TIMEOUT_MS);
  }
  
  /** Capture-phase click handler — fires before Discord's own listeners so popouts / message-jumps are suppressed when extracting. Clicks inside the panel bubble through normally. */
  function handleSelectionClick(e) {
    if (e.target.closest('#undiscord') || e.target.closest('#undiscord-server-btn')) return;
  
    e.preventDefault();
    e.stopPropagation();
  
    const t = selection.type;
    const id =
      (t === 'user' || t === 'user-single')          ? extractUserId(e.target)    :
      t === 'message'                                ? extractMessageId(e.target) :
      (t === 'server'  || t === 'server-multi')      ? extractServerId(e.target)  :
      (t === 'channel' || t === 'channel-multi')     ? extractChannelId(e.target) : null;
    if (!id) {
      const typeLabel = selection.type === 'user-single' ? 'user' : selection.type;
      log.warn(`Couldn't extract a ${typeLabel} ID from the clicked element. Selection cancelled.`);
      cancelSelection();
      return;
    }
    insertCapturedId(selection.input, selection.label, id, selection.type);
  
    // Shift-held → stay in selection mode for another capture; refresh the
    // timeout so a long batch run doesn't auto-cancel mid-stream.
    if (e.shiftKey) {
      resetSelectionTimeout();
    } else {
      cancelSelection();
    }
  }
  
  /** Unified keydown/keyup handler. Esc cancels selection. Shift down/up toggles the shift-lock visual on the active button (light purple while held, amber otherwise). */
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
  
  /**
   * Inserts a captured ID according to its type:
   *   - user / server-multi / channel-multi → append to bound input (CSV, dedup)
   *   - user-single / message → overwrite bound input
   *   - server / channel → route through addPair() into the queue
   */
  function insertCapturedId(input, label, id, type) {
    if (type === 'user' || type === 'server-multi' || type === 'channel-multi') {
      const kindLabel = type === 'user' ? 'user' : type === 'server-multi' ? 'server' : 'channel';
      const list = parseCsvList(input.value);
      if (list.includes(id)) {
        log.info(`${dot(id)} is already in ${label} — skipped.`);
        return;
      }
      list.push(id);
      input.value = list.join(',');
      log.success(`Captured ${kindLabel} ID ${dot(id)} → ${label}.`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (type === 'user-single') {
      const previous = input.value.trim();
      if (previous === id) {
        log.info(`${dot(id)} is already set in ${label} — no change.`);
        return;
      }
      input.value = id;
      if (previous) log.success(`Captured user ID ${dot(id)} → ${label} (overwrote ${dot(previous)}).`);
      else          log.success(`Captured user ID ${dot(id)} → ${label}.`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (type === 'server') {
      // @me isn't a runnable server-wide target (the search endpoint requires a
      // specific channel ID for DMs). Same guard as the Add Server button uses.
      if (id === '@me') {
        return log.warn('"Select" on Server captured @me, but server-wide @me isn\'t a valid wipe target — use "Add DMs" in the DMs section, or "Select" on Channel for a specific DM.');
      }
      log.success(`Captured server ID ${dot(id)} → adding to queue (server-wide).`);
      addPair(id, '');
    } else if (type === 'channel') {
      // Resolve the parent server from the URL. Three URL shapes:
      //   /channels/<guildId>/<channelId>  — inside a guild channel
      //   /channels/@me/<channelId>        — inside an open DM
      //   /channels/@me                    — friends tab (DM list, no open convo)
      let parentServer = null;
      const urlMatch = location.href.match(/channels\/([\w@]+)\/\d+/);
      if (urlMatch) {
        parentServer = urlMatch[1];
      } else if (/\/channels\/@me\b/.test(location.href)) {
        parentServer = '@me';
      } else {
        return log.warn(`Captured channel ID ${dot(id)} but couldn't determine its parent server from the URL — open the channel (or its parent server) in Discord first, then try again.`);
      }
      if (parentServer === '@me') {
        log.success(`Captured DM channel ID ${dot(id)} → adding to queue.`);
      } else {
        log.success(`Captured channel ID ${dot(id)} → adding to queue under server ${dot(parentServer)}.`);
      }
      addPair(parentServer, id);
    } else {
      input.value = id;
      log.success(`Captured message ID ${dot(id)} → ${label}.`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  
  /** Appends one ID to a comma-separated multi-input field with dedup. Used by the import-mode Exclude Server / Exclude Channel Add buttons; mirrors the General queue's addPair pattern but for a flat CSV list. Distinct from insertCapturedId (which logs "Captured ..." for Select-mode flow) so the Add button's log line reads naturally. */
  function addToCsvField(input, label, id) {
    const list = parseCsvList(input.value);
    if (list.includes(id)) {
      log.info(`${dot(id)} is already in ${label} — skipped.`);
      return;
    }
    list.push(id);
    input.value = list.join(',');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    log.success(`Added ${dot(id)} to ${label}.`);
  }
  
  /** Removes one ID from a comma-separated multi-input field. No-op (with a log line) when the ID isn't present. Used by the import-mode Exclude Server / Exclude Channel Delete buttons; mirrors the General queue's removeChannel/removeServer pattern but for a flat CSV list. */
  function removeFromCsvField(input, label, id) {
    const list = parseCsvList(input.value);
    const idx = list.indexOf(id);
    if (idx === -1) {
      log.info(`${dot(id)} is not in ${label} — nothing to remove.`);
      return;
    }
    list.splice(idx, 1);
    input.value = list.join(',');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    log.success(`Removed ${dot(id)} from ${label}.`);
  }
  
  /** Wires a Select button to startSelection() with the matching input, type, and label. */
  function bindSelector(buttonId, inputId, type, label) {
    const button = $(`button#${buttonId}`);
    const input = $(`input#${inputId}`);
    button.onclick = () => startSelection(input, type, label, button);
  }
  
  /** Wires a Clear button to wipe a text input and log the action. No-op (with an "already empty" log) when the input is already empty. */
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
  
  
  // ============================================================================
  // MULTI-USER PASTE HANDLING
  // ----------------------------------------------------------------------------
  // Special paste handlers for ID-bearing inputs. Snowflake-shaped clipboards
  // get processed; other clipboards fall through to native paste.
  // ============================================================================
  
  /** Paste handler for multi-value ID inputs. Snowflake-shaped clipboards (single ID or comma-separated list) append to the existing value with deduplication. Other clipboards fall through to native paste. */
  function bindMultiUserPaste(input, label) {
    input.addEventListener('paste', (e) => {
      const text = ((e.clipboardData || window.clipboardData).getData('text') || '').trim();
      if (!/^\d{15,25}(\s*,\s*\d{15,25})*$/.test(text)) return; // not an ID list — let native paste run
  
      e.preventDefault();
      const incoming = parseCsvList(text);
      const list = parseCsvList(input.value);
  
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
  
  /** Paste handler for single-value ID inputs (Include @user — Discord's `mentions=` query param accepts only one ID per request). New paste overwrites the field. Non-snowflake clipboards fall through to native paste. */
  function bindSingleUserPaste(input, label) {
    input.addEventListener('paste', (e) => {
      const text = ((e.clipboardData || window.clipboardData).getData('text') || '').trim();
      if (!/^\d{15,25}$/.test(text)) return;
  
      e.preventDefault();
      const previous = input.value.trim();
      if (previous === text) {
        log.info(`${label}: ${dot(text)} is already set — no change.`);
        return;
      }
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (previous) log.info(`${label}: replaced ${dot(previous)} with ${dot(text)}.`);
      else          log.info(`${label}: set to ${dot(text)}.`);
    });
  }
  
  
  // ============================================================================
  // LOG SINK
  // ----------------------------------------------------------------------------
  // Renders log entries into the in-panel log area. Wired in as the global log
  // sink (setLogFn) once initUI() has the DOM ready, so anything called via
  // `log.info()` / `log.error()` / etc shows up in the panel.
  // ============================================================================
  
  const LOG_MAX_ENTRIES = 1000; // trim oldest beyond this — prevents unbounded DOM growth on long wipes
  
  /** Renders a single log entry into the in-panel log area. Auto-trims oldest entries above LOG_MAX_ENTRIES; mirrors errors to the devtools console. */
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
  
  
  // ============================================================================
  // CORE EVENT BINDINGS
  // ----------------------------------------------------------------------------
  // Wires the core's lifecycle callbacks (onStart / onProgress / onJob /
  // onStop) into UI updates: morphs the primary action button between Delete
  // (idle) and Stop (running), flips the trash icon (FAB and server-bar
  // variant) into its red/active running state, updates the visual progress
  // bar, and writes the live progress text into the top-bar slot.
  // ============================================================================
  
  // Per-second elapsed-time ticker. onProgress only fires after each delete
  // completes, so elapsed time would freeze during the long search-delay waits
  // between pages without it. lastRemainingMs caches the most recent ETR sample
  // from onProgress so the ticker can rerender both halves of the footer.
  let elapsedTicker = null;
  let lastRemainingMs = 0;
  
  /** Refreshes the footer's elapsed/remaining readout. Called from the per-second ticker AND from onProgress (where lastRemainingMs is also refreshed from stats.etr). */
  function renderFooterTime() {
    if (!undiscordCore.stats.startTime) return;
    const elapsed = msToHMS(Date.now() - undiscordCore.stats.startTime.getTime());
    const remaining = msToHMS(lastRemainingMs);
    ui.footerTime.textContent = `Elapsed ${elapsed} · Remaining ${remaining}`;
  }
  
  /** Registers core lifecycle hooks. Called once at the end of initUI(). */
  function bindCoreEvents() {
    undiscordCore.onStart = () => {
      const btn = $('button#start');
      btn.textContent = '🛑 Stop';
      btn.title = 'Stop the deletion process';
      ui.undiscordBtn.classList.add('running');
      if (ui.serverBarBtn) ui.serverBarBtn.classList.add('running');
      ui.progressMain.style.display = 'block';
      ui.topBarSlot.innerHTML = `<span class="status-line status-running">Starting…</span>`;
  
      // 1 s cadence — keeps the digits moving even while the loop is sleeping
      // through a search-delay wait. Remaining stays at its last onProgress
      // sample (an estimate that only changes meaningfully on each delete).
      lastRemainingMs = 0;
      if (elapsedTicker) clearInterval(elapsedTicker);
      elapsedTicker = setInterval(renderFooterTime, 1000);
      renderFooterTime();
  
      // Drain any one-shot notice startAction stashed (logged here so it lands
      // right after the "Started at..." line instead of getting wiped by the
      // log-clear that runs between startAction and run()).
      if (pendingStartNotice) {
        log.info(pendingStartNotice);
        pendingStartNotice = null;
      }
    };
  
    undiscordCore.onProgress = (state, stats) => {
      const value = state.delCount + state.failCount;
      const max = Math.max(state.grandTotal, value);
  
      if (max) {
        const percent = Math.round(value / max * 100) + '%';
        ui.topBarSlot.innerHTML =
          `<span class="status-line status-running">Deleting... ` +
          `| (${value}/${max}) ${percent} ` +
          `| Failures: ${state.failCount} ` +
          `| Job ${currentJobInfo.i}/${currentJobInfo.n} |</span>`;
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
        ui.topBarSlot.innerHTML = `<span class="status-line status-running">Working…</span>`;
        ui.progressIcon.removeAttribute('value');
        ui.progressMain.removeAttribute('value');
      }
  
      // Cache the new ETR sample, then rerender the footer immediately so the
      // user sees it without waiting for the next ticker beat.
      lastRemainingMs = stats.etr;
      renderFooterTime();
  
      // Sync the stepper display to reflect any rate-limit bump/decay applied by core.
      setDelayDisplay('searchDelay', undiscordCore.options.searchDelay);
      setDelayDisplay('deleteDelay', undiscordCore.options.deleteDelay);
    };
  
    // Per-job batch position — fired by core.runBatch before each per-job run().
    undiscordCore.onJob = (i, n) => { currentJobInfo = { i, n }; };
  
    undiscordCore.onStop = () => {
      const btn = $('button#start');
      btn.textContent = '▶︎ Delete';
      btn.title = 'Start the deletion process';
      ui.undiscordBtn.classList.remove('running');
      if (ui.serverBarBtn) ui.serverBarBtn.classList.remove('running');
      ui.progressMain.style.display = 'none';
      if (elapsedTicker) { clearInterval(elapsedTicker); elapsedTicker = null; }
      ui.footerTime.textContent = ''; // clear elapsed/remaining when idle
      renderTopBar();
    };
  }
  
  
  // ============================================================================
  // SELECTION SNAPSHOT / RESET / BATCH QUEUE
  // ----------------------------------------------------------------------------
  // The Reset Selection and Batch Selection sidebar buttons let the user build
  // a meta-batch — multiple independent selections, each with its own filters,
  // target queue, and intervals, run sequentially when Delete is finally
  // clicked. captureSnapshot reads every form input into a plain object;
  // applySnapshot writes one back; resetAllSelection clears the form.
  // selectionQueue holds queued snapshots; the current form is appended last
  // in startAction so queue-then-delete runs queued batches first and the
  // "live" form last.
  //
  // Two safeguards run at queue time:
  //   - Pre-flight permission check (search-mode snapshots with non-self
  //     authors) — failures reject the snapshot, not just the run later.
  //   - Dedup + redundancy detection — exact-match snapshots are blocked
  //     (snapshotKey); strictly-subsumed snapshots log a warning but queue
  //     anyway (snapshotASubsumesB). Anything finer is the user's call.
  // ============================================================================
  
  let selectionQueue = []; // array of snapshots; runs sequentially on next Delete
  
  // Identity tags for imported sets so dedup compares by reference, not by
  // re-stringifying the (potentially huge) parsed export every time.
  const importIdMap = new WeakMap();
  let nextImportId = 1;
  function importIdOf(set) {
    if (!set) return null;
    if (!importIdMap.has(set)) importIdMap.set(set, nextImportId++);
    return importIdMap.get(set);
  }
  
  /** Stable-stringifies a snapshot for dedup comparison. importedSet is replaced with an identity tag (so two snapshots referencing the same parsed export hash to the same key, regardless of its contents); every other field is captured by value via JSON.stringify (insertion-order-stable in V8/SpiderMonkey/JSC, and captureSnapshot always builds the object in the same field order). */
  function snapshotKey(snap) {
    return JSON.stringify({ ...snap, importedSet: importIdOf(snap.importedSet) });
  }
  
  /** Returns true when every "narrowing" filter knob in `snap` is at its default state. Pinned-mode and NSFW are deliberately not checked — those interact with B's matching values in non-monotonic ways, so the caller compares them between A and B instead. */
  function isFilterless(snap) {
    // Search filter
    if (snap.content) return false;
    if (snap.hasLink || snap.hasImage || snap.hasVideo || snap.hasSound) return false;
    if (snap.hasSticker || snap.hasPoll || snap.hasEmbed || snap.hasForward) return false;
    if (snap.mentionsId) return false;
    if (snap.mentionEveryone) return false;
    // Skip (Delete) filter
    if (snap.excludeSearch) return false;
    if (snap.excludeLink || snap.excludeImage || snap.excludeVideo || snap.excludeSound) return false;
    if (snap.excludeSticker || snap.excludePoll || snap.excludeEmbed || snap.excludeForward) return false;
    if (snap.excludeMentionsId) return false;
    if (snap.excludeMentionEveryone) return false;
    if (snap.excludeExtensions) return false;
    if (snap.excludeExtensionPills?.length) return false;
    // Import-only exclusions
    if (snap.importExcludeServers || snap.importExcludeChannels || snap.importExcludeUsers) return false;
    if (snap.importExcludeAllServers || snap.importExcludeAllChannels || snap.importExcludeAllDms) return false;
    return true;
  }
  
  /** Returns the snapshot's effective {minMs, maxMs} interval. minId/maxId override minDate/maxDate (matching run-time precedence). The Discord-epoch default for minDate is treated as "no lower bound" so factory-default snapshots compare cleanly. */
  function intervalOf(snap) {
    let minMs = -Infinity, maxMs = Infinity;
    if (snap.minId) minMs = snowflakeToMs(snap.minId);
    else if (snap.minDate && snap.minDate !== DISCORD_EPOCH_LOCAL) minMs = new Date(snap.minDate).getTime();
    if (snap.maxId) maxMs = snowflakeToMs(snap.maxId);
    else if (snap.maxDate) maxMs = new Date(snap.maxDate).getTime();
    return { minMs, maxMs };
  }
  
  /** Returns the snapshot's author list as a Set. Empty Author ID resolves to a `__self__` sentinel — across snapshots the user is always the same identity, so two empty-author snapshots compare as authoring the same set without needing to actually look up the self ID. */
  function authorSetOf(snap) {
    const list = parseCsvList(snap.authorId);
    return list.length ? new Set(list) : new Set(['__self__']);
  }
  
  /** Returns true when every (server, channel) target in `bTargets` is covered by some target in `aTargets`. A server-wide entry in A (channelId === '') covers any (S, *) in B with the same server; a channel-specific entry only covers an exact match. */
  function targetsCoverAll(aTargets, bTargets) {
    for (const b of bTargets) {
      let covered = false;
      for (const a of aTargets) {
        if (a.guildId !== b.guildId) continue;
        if (a.channelId === '' || a.channelId === b.channelId) { covered = true; break; }
      }
      if (!covered) return false;
    }
    return true;
  }
  
  /** Returns true when running snapshot `a` would delete every message snapshot `b` would, leaving `b` to do mostly-redundant work (404s on already-deleted messages). Both must share a mode (live-search vs same imported set), `a` must be filterless, and `a`'s scope/author/interval must be a superset of `b`'s. Pinned-mode and NSFW exclusion must align in live-search mode (import bypasses both). */
  function snapshotASubsumesB(a, b) {
    if (Boolean(a.importedSet) !== Boolean(b.importedSet)) return false;
    if (a.importedSet && a.importedSet !== b.importedSet) return false;
    if (!isFilterless(a)) return false;
  
    if (!a.importedSet) {
      // Live-search-mode-only: pinned-mode and NSFW affect the deletion set in
      // ways that aren't monotonic in the user's tunables — require an exact
      // match on both rather than try to model the lattice.
      if (a.pinnedMode  !== b.pinnedMode)  return false;
      if (a.excludeNsfw !== b.excludeNsfw) return false;
  
      const aAuth = authorSetOf(a), bAuth = authorSetOf(b);
      for (const id of bAuth) if (!aAuth.has(id)) return false;
  
      const { targets: aTargets } = parseTargets(a.guildId, a.channelId);
      const { targets: bTargets } = parseTargets(b.guildId, b.channelId);
      if (!targetsCoverAll(aTargets, bTargets)) return false;
    }
  
    const aInt = intervalOf(a), bInt = intervalOf(b);
    if (aInt.minMs > bInt.minMs) return false;
    if (aInt.maxMs < bInt.maxMs) return false;
  
    return true;
  }
  
  /** Refreshes the queue counter badge and the drop-batches button. Both hide entirely when the queue is empty so the badge row collapses to whatever else is there (just the import-mode chip, or nothing at all). */
  function renderQueueBadge() {
    const badge = $('#queueBadge');
    const drop  = $('button#dropBatches');
    if (!badge) return;
    const n = selectionQueue.length;
    if (n === 0) {
      badge.style.display = 'none';
      if (drop) drop.style.display = 'none';
      return;
    }
    badge.style.display = 'inline-flex';
    badge.textContent = `queued: ${n}`;
    if (drop) drop.style.display = 'inline-flex';
  }
  
  /** Snapshots every form input that affects a run into a plain object, ready to be replayed via applySnapshot. The `importedSet` reference is captured by identity (not deep copy) — only one import is loaded at a time, and the user clearing it shouldn't retroactively invalidate already-queued snapshots that were captured against it. */
  function captureSnapshot() {
    return {
      // General
      authorId:        $('input#authorId').value.trim(),
      excludeNsfw:     $('input#excludeNsfw').checked,
      guildId:         $('input#guildId').value,
      channelId:       $('input#channelId').value,
      excludeGroupDms: $('input#excludeGroupDms').checked,
      // Search filter
      content:          $('input#search').value.trim(),
      hasLink:          $('input#hasLink').checked,
      hasImage:         $('input#hasImage').checked,
      hasVideo:         $('input#hasVideo').checked,
      hasSound:         $('input#hasSound').checked,
      hasSticker:       $('input#hasSticker').checked,
      hasPoll:          $('input#hasPoll').checked,
      hasEmbed:         $('input#hasEmbed').checked,
      hasForward:       $('input#hasForward').checked,
      mentionsId:       $('input#mentionsId').value.trim(),
      mentionEveryone:  $('input#mentionEveryone').checked,
      pinnedMode:       $('select#pinnedMode').value,
      // Delete filter
      excludeSearch:           $('input#excludeSearch').value.trim(),
      excludeMatchMode:        $('select#excludeMatchMode').value,
      excludeLink:             $('input#excludeLink').checked,
      excludeImage:            $('input#excludeImage').checked,
      excludeVideo:            $('input#excludeVideo').checked,
      excludeSound:            $('input#excludeSound').checked,
      excludeSticker:          $('input#excludeSticker').checked,
      excludePoll:             $('input#excludePoll').checked,
      excludeEmbed:            $('input#excludeEmbed').checked,
      excludeForward:          $('input#excludeForward').checked,
      excludeMentionsId:       $('input#excludeMentionsId').value.trim(),
      excludeMentionEveryone:  $('input#excludeMentionEveryone').checked,
      excludeExtensions:       $('input#excludeExtensions').value.trim(),
      excludeExtensionPills:   Array.from(ui.undiscordWindow.querySelectorAll('input[data-ext]'))
                                    .filter(el => el.checked)
                                    .map(el => el.dataset.ext),
      // Intervals
      minId:    $('input#minId').value.trim(),
      maxId:    $('input#maxId').value.trim(),
      minDate:  $('input#minDate').value,
      maxDate:  $('input#maxDate').value,
      // Delays
      searchDelay: getDelayMs('searchDelay'),
      deleteDelay: getDelayMs('deleteDelay'),
      // Import-mode exclusions (only meaningful when an import is loaded)
      importedSet:                importedSet,
      importExcludeServers:       $('input#importExcludeServers').value.trim(),
      importExcludeChannels:      $('input#importExcludeChannels').value.trim(),
      importExcludeUsers:         $('input#importExcludeUsers').value.trim(),
      importExcludeAllServers:    $('input#importExcludeAllServers').checked,
      importExcludeAllChannels:   $('input#importExcludeAllChannels').checked,
      importExcludeAllDms:        $('input#importExcludeAllDms').checked,
    };
  }
  
  /** Writes a snapshot back into every form input — the inverse of captureSnapshot. Called once per snapshot during a meta-batch run, before the dispatch into core. The trailing renderQueue() refreshes the top-bar synopsis to match the freshly-applied target list. */
  function applySnapshot(snap) {
    $('input#authorId').value          = snap.authorId;
    $('input#excludeNsfw').checked     = snap.excludeNsfw;
    $('input#guildId').value           = snap.guildId;
    $('input#channelId').value         = snap.channelId;
    $('input#excludeGroupDms').checked = snap.excludeGroupDms;
  
    $('input#search').value           = snap.content;
    $('input#hasLink').checked        = snap.hasLink;
    $('input#hasImage').checked       = snap.hasImage;
    $('input#hasVideo').checked       = snap.hasVideo;
    $('input#hasSound').checked       = snap.hasSound;
    $('input#hasSticker').checked     = snap.hasSticker;
    $('input#hasPoll').checked        = snap.hasPoll;
    $('input#hasEmbed').checked       = snap.hasEmbed;
    $('input#hasForward').checked     = snap.hasForward;
    $('input#mentionsId').value       = snap.mentionsId;
    $('input#mentionEveryone').checked = snap.mentionEveryone;
    $('select#pinnedMode').value      = snap.pinnedMode;
  
    $('input#excludeSearch').value           = snap.excludeSearch;
    $('select#excludeMatchMode').value       = snap.excludeMatchMode;
    $('input#excludeLink').checked           = snap.excludeLink;
    $('input#excludeImage').checked          = snap.excludeImage;
    $('input#excludeVideo').checked          = snap.excludeVideo;
    $('input#excludeSound').checked          = snap.excludeSound;
    $('input#excludeSticker').checked        = snap.excludeSticker;
    $('input#excludePoll').checked           = snap.excludePoll;
    $('input#excludeEmbed').checked          = snap.excludeEmbed;
    $('input#excludeForward').checked        = snap.excludeForward;
    $('input#excludeMentionsId').value       = snap.excludeMentionsId;
    $('input#excludeMentionEveryone').checked = snap.excludeMentionEveryone;
    $('input#excludeExtensions').value       = snap.excludeExtensions;
    const pillSet = new Set(snap.excludeExtensionPills || []);
    for (const el of ui.undiscordWindow.querySelectorAll('input[data-ext]')) {
      el.checked = pillSet.has(el.dataset.ext);
    }
  
    $('input#minId').value   = snap.minId;
    $('input#maxId').value   = snap.maxId;
    $('input#minDate').value = snap.minDate;
    $('input#maxDate').value = snap.maxDate;
  
    setDelayDisplay('searchDelay', snap.searchDelay);
    setDelayDisplay('deleteDelay', snap.deleteDelay);
  
    $('input#importExcludeServers').value         = snap.importExcludeServers;
    $('input#importExcludeChannels').value        = snap.importExcludeChannels;
    $('input#importExcludeUsers').value           = snap.importExcludeUsers;
    $('input#importExcludeAllServers').checked    = snap.importExcludeAllServers;
    $('input#importExcludeAllChannels').checked   = snap.importExcludeAllChannels;
    $('input#importExcludeAllDms').checked        = snap.importExcludeAllDms;
  
    renderQueue();
  }
  
  /** Resets every form input to its default. Wired to the Reset Selection sidebar button, and called after a successful Batch Selection so the form is empty for the next snapshot. Streamer mode and Auto scroll (footer toggles) are NOT touched — those are global UI preferences, not per-batch. The log area is also untouched (use Clear Log for that). */
  function resetAllSelection() {
    $('input#authorId').value      = '';
    $('input#excludeNsfw').checked = false;
    $('input#guildId').value       = '';
    $('input#channelId').value     = '';
    $('input#excludeGroupDms').checked = false;
  
    $('input#search').value           = '';
    $('input#hasLink').checked        = false;
    $('input#hasImage').checked       = false;
    $('input#hasVideo').checked       = false;
    $('input#hasSound').checked       = false;
    $('input#hasSticker').checked     = false;
    $('input#hasPoll').checked        = false;
    $('input#hasEmbed').checked       = false;
    $('input#hasForward').checked     = false;
    $('input#mentionsId').value       = '';
    $('input#mentionEveryone').checked = false;
    $('select#pinnedMode').value      = 'exclude';
  
    $('input#excludeSearch').value           = '';
    $('select#excludeMatchMode').value       = 'substring';
    $('input#excludeLink').checked           = false;
    $('input#excludeImage').checked          = false;
    $('input#excludeVideo').checked          = false;
    $('input#excludeSound').checked          = false;
    $('input#excludeSticker').checked        = false;
    $('input#excludePoll').checked           = false;
    $('input#excludeEmbed').checked          = false;
    $('input#excludeForward').checked        = false;
    $('input#excludeMentionsId').value       = '';
    $('input#excludeMentionEveryone').checked = false;
    $('input#excludeExtensions').value       = '';
    for (const el of ui.undiscordWindow.querySelectorAll('input[data-ext]')) el.checked = false;
  
    $('input#minId').value   = '';
    $('input#maxId').value   = '';
    $('input#minDate').value = DISCORD_EPOCH_LOCAL;
    $('input#maxDate').value = '';
  
    setDelayDisplay('searchDelay', SEARCH_DEFAULT);
    setDelayDisplay('deleteDelay', DELETE_DEFAULT);
    undiscordCore.options.searchDelay = SEARCH_DEFAULT;
    undiscordCore.options.deleteDelay = DELETE_DEFAULT;
  
    $('input#importExcludeServers').value          = '';
    $('input#importExcludeChannels').value         = '';
    $('input#importExcludeUsers').value            = '';
    $('input#importExcludeAllServers').checked     = false;
    $('input#importExcludeAllChannels').checked    = false;
    $('input#importExcludeAllDms').checked         = false;
  
    renderQueue();
  }
  
  
  // ============================================================================
  // PERMISSION PRE-FLIGHT
  // ----------------------------------------------------------------------------
  // One-call check against /users/@me/guilds before a multi-author batch runs.
  // Indexes guilds where the user has Manage Messages or Administrator, then
  // rejects any (server, non-self-author) pair targeting a guild outside that
  // index. DMs are skipped entirely (you only have access to your own DM
  // messages anyway).
  // ============================================================================
  
  /** Returns true to proceed with the run, false to abort. Logs per-server failures and a final aborted-by-pre-flight line on rejection. */
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
      log.error(`You do not have permission on Server ID ${dot(f.serverId)} to delete messages from User ID(s): ${f.authors.map(dot).join(', ')}.`);
    }
    log.error('Run aborted by pre-flight permission check.');
    return false;
  }
  
  
  // ============================================================================
  // IMPORT CONTROLS
  // ----------------------------------------------------------------------------
  // Folder picker, summary line, Clear-import button. Idempotent: safe to call
  // once on init.
  // ============================================================================
  
  /** Wires the import folder picker, the Clear-import button, and renders the summary line. */
  function bindImportControls() {
    const picker = $('input#importPicker');
  
    $('button#importPick').onclick = () => picker.click();
  
    picker.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      log.info(`Parsing ${files.length} file${files.length === 1 ? '' : 's'} from import...`);
      let parsed;
      try {
        parsed = await parseExport(files);
      } catch (err) {
        log.error('Import failed:', err.message || String(err));
        // Reset the input so picking the same folder again still fires `change`.
        picker.value = '';
        return;
      }
      importedSet = parsed;
      renderImportSummary();
      ui.undiscordWindow.classList.add('import-mode');
      $('#importBadge').style.display = 'inline-flex';
      log.success(`Import loaded: ${parsed.messages.length.toLocaleString()} messages across ${parsed.channelCount} channel${parsed.channelCount === 1 ? '' : 's'}.`);
      // Per-source breakdown — pulled from channel.json (guild + name) and
      // index.json (DM friend usernames; recipients in channel.json are IDs only).
      log.info('── IMPORT BREAKDOWN ──');
      for (const line of summarizeImport(parsed, dot)) log.info(`› ${line}`);
      log.info('General queue, Search filter, and Delete filter are now bypassed. Date and Messages interval still apply.');
      // Reset so re-picking works.
      picker.value = '';
    });
  
    $('button#importClear').onclick = () => {
      if (!importedSet) return log.info('No import loaded.');
      importedSet = null;
      renderImportSummary();
      ui.undiscordWindow.classList.remove('import-mode');
      $('#importBadge').style.display = 'none';
      log.info('Import cleared. Returning to live-search mode.');
    };
  
    renderImportSummary();
  }
  
  /** Updates the import summary line and the top bar to reflect the current importedSet (or "No import loaded." when null). */
  function renderImportSummary() {
    const el = $('#importSummary');
    if (!importedSet) {
      el.textContent = 'No import loaded.';
    } else {
      const { messages, channelCount, oldestTs, newestTs } = importedSet;
      const fmt = (ts) => ts ? new Date(ts).toISOString().slice(0, 10) : '—';
      el.textContent = `Imported ${messages.length.toLocaleString()} messages across ${channelCount} channel${channelCount === 1 ? '' : 's'} · oldest ${fmt(oldestTs)} · newest ${fmt(newestTs)}`;
    }
    renderTopBar();
  }
  
  
  // ============================================================================
  // IMPORT FILTER LOOP
  // ----------------------------------------------------------------------------
  // Walks the imported message set and applies every filter in declared order,
  // attributing each drop to exactly one bucket (the first predicate that
  // matched). Returns the survivors plus per-bucket counts so the orchestrator
  // can both queue the survivors and log a categorised breakdown.
  // ============================================================================
  
  /** Returns `{ filtered, skipReasons }` after applying every import-mode filter passed in `f`. Each rejected message is attributed to exactly one bucket. */
  function applyImportFilters(messages, f) {
    const skipReasons = {
      allServers: 0, allChannels: 0, allDms: 0,
      servers: 0, channels: 0, dmUsers: 0,
      dateInterval: 0,
      text: 0, links: 0,
      mentions: 0, everyone: 0,
      attachments: 0, extensions: 0,
    };
    const filtered = [];
    for (const m of messages) {
      // Type-wide exclusions (the three "Exclude all" pills above the per-ID
      // selector lists). Checked first so whole categories short-circuit before
      // any per-record matching runs. excludeAllChannels backs the "Exclude
      // group DMs" pill — the option name predates the label.
      if (f.excludeAllServers && m.guildId && m.guildId !== '@me')           { skipReasons.allServers++;  continue; }
      if (f.excludeAllDms && m.type === 'DM')                                { skipReasons.allDms++;      continue; }
      if (f.excludeAllChannels && m.type === 'GROUP_DM')                     { skipReasons.allChannels++; continue; }
  
      // Per-ID exclusion lists — applied after the wildcards so each wildcard
      // claims its skipReasons bucket before the per-ID checks can.
      if (f.excludeServersSet.size  && f.excludeServersSet.has(m.guildId))    { skipReasons.servers++;  continue; }
      if (f.excludeChannelsSet.size && f.excludeChannelsSet.has(m.channelId)) { skipReasons.channels++; continue; }
      if (f.excludeUsersSet.size && (m.type === 'DM' || m.type === 'GROUP_DM')
          && m.recipientIds?.some(id => f.excludeUsersSet.has(id)))           { skipReasons.dmUsers++;  continue; }
  
      const ts = new Date(m.timestamp).getTime();
      if (!Number.isFinite(ts) || ts < f.minMs || ts > f.maxMs) { skipReasons.dateInterval++; continue; }
  
      const content = m.content || '';
      if (f.contentMatch && f.contentMatch(content)) { skipReasons.text++; continue; }
      // Export carries no embed metadata; the bare URL regex on content is the
      // only signal available for "has a link".
      if (f.excludeLink && /https?:\/\//i.test(content)) { skipReasons.links++; continue; }
  
      // Image / Video / Sound bundle into one bucket since the UI groups them
      // visually under a single "Attachments" label in the breakdown.
      if ((f.excludeImage && m.attachments?.some(a => a.content_type?.startsWith('image/')))
       || (f.excludeVideo && m.attachments?.some(a => a.content_type?.startsWith('video/')))
       || (f.excludeSound && m.attachments?.some(a => a.content_type?.startsWith('audio/')))) {
        skipReasons.attachments++; continue;
      }
  
      if (f.mentionMatch && f.mentionMatch(content)) { skipReasons.mentions++; continue; }
      if (f.excludeMentionEveryone && /@everyone|@here/.test(content)) { skipReasons.everyone++; continue; }
      if (f.extensionMatch && f.extensionMatch(m.attachments)) { skipReasons.extensions++; continue; }
  
      filtered.push(m);
    }
    return { filtered, skipReasons };
  }
  
  
  // ============================================================================
  // ORCHESTRATORS
  // ----------------------------------------------------------------------------
  // startAction (▶︎ Delete button) is a meta-orchestrator: it gathers every
  // queued selection snapshot (selectionQueue) plus the current form (when not
  // blank), then iterates them sequentially. Each iteration applies the snapshot
  // to the live form and dispatches to runSearchModeFromForm or
  // runImportModeFromForm based on the snapshot's mode.
  //
  // Per-snapshot dispatchers read every form input, validate, parse the queue,
  // expand jobs across (target × author), run a permission pre-flight (search
  // mode only), and call undiscordCore.run() (single target+author) or
  // undiscordCore.runBatch() (multiple jobs).
  // ============================================================================
  
  /** Import-mode dispatcher. Pre-filters `importedSet` with every applicable filter, then hands a single synthetic job carrying an ImportSource into core. The caller (startAction) is responsible for the log-clear and the importedSet null-check. `askForConfirmation` lets the meta-orchestrator suppress the yes/no prompt for snapshots after the first — re-prompting between selections in the same meta-batch trains the user to click Yes without reading. */
  async function runImportModeFromForm(authToken, askForConfirmation = true) {
    // Date / Messages interval: applied as a client-side pre-pass against each
    // record's ISO timestamp. Messages interval (snowflake range) wins when both
    // are set, mirroring search-mode precedence in runSearchModeFromForm below.
    const minId = $('input#minId').value.trim();
    const maxId = $('input#maxId').value.trim();
    const minDate = $('input#minDate').value.trim();
    const maxDate = $('input#maxDate').value.trim();
  
    if (minId && !/^\d+$/.test(minId)) return log.error(`"After message ID" must be a numeric Discord ID, got: "${minId}"`);
    if (maxId && !/^\d+$/.test(maxId)) return log.error(`"Before message ID" must be a numeric Discord ID, got: "${maxId}"`);
    if (minId && maxId && BigInt(minId) >= BigInt(maxId)) {
      return log.error('"After message ID" must be older (smaller snowflake) than "Before message ID".');
    }
  
    let minMs = -Infinity, maxMs = Infinity;
    if (minId) minMs = snowflakeToMs(minId);
    else if (minDate) {
      const t = new Date(minDate).getTime();
      if (Number.isNaN(t)) return log.error('Invalid "After date" — please re-enter using the date picker.');
      minMs = t;
    }
    if (maxId) maxMs = snowflakeToMs(maxId);
    else if (maxDate) {
      const t = new Date(maxDate).getTime();
      if (Number.isNaN(t)) return log.error('Invalid "Before date" — please re-enter using the date picker.');
      maxMs = t;
    }
    if (minMs >= maxMs) return log.error('Date / message-interval bounds invert — After is at or after Before. Adjust or click "All".');
  
    // Read every Skip filter; only the ones with data the export carries are
    // applied. Sticker / Poll / Embed / Forward toggles are marked .import-noop
    // in the UI (export has no metadata for those). Mention filters DO work
    // here — Discord stores user mentions inline in `Contents` as `<@id>` (or
    // `<@!id>`), and the literal "@everyone"/"@here" text is preserved too.
    const excludeContent = $('input#excludeSearch').value.trim();
    const excludeMatchMode = $('select#excludeMatchMode').value;
    const excludeLink = $('input#excludeLink').checked;
    const excludeImage = $('input#excludeImage').checked;
    const excludeVideo = $('input#excludeVideo').checked;
    const excludeSound = $('input#excludeSound').checked;
    const excludeMentionsList = parseCsvList($('input#excludeMentionsId').value);
    const excludeMentionEveryone = $('input#excludeMentionEveryone').checked;
    const excludeExtensions = readSkipExtensions();
  
    // Import-only exclusions: drop entire servers, channels, or DMs-with-users
    // before any other filter runs. Each is a comma-separated snowflake list
    // (server can also be `@me` for "all DMs"). Empty Set = filter is disabled.
    const readIdSet = (id) => new Set(parseCsvList($(`input#${id}`).value));
    const excludeServersSet  = readIdSet('importExcludeServers');
    const excludeChannelsSet = readIdSet('importExcludeChannels');
    const excludeUsersSet    = readIdSet('importExcludeUsers');
  
    // Type-wide pills — drop every guild message / 1:1 DM / group DM
    // respectively. excludeAllChannels backs the "Exclude group DMs" pill;
    // the option name predates the label.
    const excludeAllServers  = $('input#importExcludeAllServers').checked;
    const excludeAllDms      = $('input#importExcludeAllDms').checked;
    const excludeAllChannels = $('input#importExcludeAllChannels').checked;
  
    const noopToggles = [];
    if ($('input#excludeSticker').checked) noopToggles.push('sticker');
    if ($('input#excludePoll').checked)    noopToggles.push('poll');
    if ($('input#excludeEmbed').checked)   noopToggles.push('embed');
    if ($('input#excludeForward').checked) noopToggles.push('forward');
    if (noopToggles.length) {
      log.warn(`Import mode: ignoring filter${noopToggles.length === 1 ? '' : 's'} (${noopToggles.join(', ')}) — Discord's data export doesn't carry that data.`);
    }
  
    // Build matchers once (regex compilation per message would be wasteful).
    // contentMatch and extensionMatch share helpers with live-mode. Mention-
    // match stays inline because import mode pulls IDs out of raw message text
    // (`<@id>` / `<@!id>`), while live mode reads them from the structured
    // `msg.mentions` array — different shapes.
    const contentMatch = buildContentMatcher(excludeContent, excludeMatchMode);
    const extensionMatch = buildExtensionMatcher(excludeExtensions);
    let mentionMatch = null;
    if (excludeMentionsList.length) {
      const ids = excludeMentionsList.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const re = new RegExp(`<@!?(?:${ids})>`);
      mentionMatch = (s) => re.test(s);
    }
  
    const { filtered, skipReasons } = applyImportFilters(importedSet.messages, {
      excludeAllServers, excludeAllChannels, excludeAllDms,
      excludeServersSet, excludeChannelsSet, excludeUsersSet,
      minMs, maxMs,
      contentMatch, excludeLink,
      excludeImage, excludeVideo, excludeSound,
      mentionMatch, excludeMentionEveryone,
      extensionMatch,
    });
  
    if (filtered.length === 0) {
      return log.error(`Filters left zero messages from the import (had ${importedSet.messages.length}). Adjust Date or Messages interval, or click "All".`);
    }
  
    const deleteDelay = getDelayMs('deleteDelay');
    const streamerMode = $('input#streamerMode').checked;
  
    currentJobInfo = { i: 1, n: 1 }; // import mode is always single-job
    undiscordCore.resetState();
    // resetOptions() seeds every field from DEFAULT_OPTIONS first; only the
    // import-specific run state is overlaid. The pre-pass loop above already
    // trimmed by every applicable filter, so all post-search filters stay at
    // their default no-op values.
    undiscordCore.resetOptions({
      authToken,
      importSource: new ImportSource(filtered),
      pinnedMode: 'include', // export records have no pin metadata; "include" is the no-op
      deleteDelay,
      streamerMode,
      askForConfirmation,
    });
  
    const skipped = importedSet.messages.length - filtered.length;
    log.info(`Import-mode run: ${filtered.length.toLocaleString()} messages queued${skipped ? ` (${skipped.toLocaleString()} skipped)` : ''}.`);
  
    // Breakdown lines — show every category that either (a) caught at least one
    // record, or (b) the user explicitly configured (so a configured-but-zero
    // filter is visible too, confirming "yes, your filter ran and matched 0").
    // Categories that are neither configured nor matched stay hidden.
    const dateConfigured = (minMs > -Infinity) || (maxMs < Infinity);
    const breakdown = [
      ['All servers (wildcard)',    skipReasons.allServers,   excludeAllServers],
      ['All 1:1 DMs (wildcard)',    skipReasons.allDms,       excludeAllDms],
      ['All group DMs (wildcard)',  skipReasons.allChannels,  excludeAllChannels],
      ['Servers',                   skipReasons.servers,      excludeServersSet.size > 0],
      ['Channels',                  skipReasons.channels,     excludeChannelsSet.size > 0],
      ['DM users',                  skipReasons.dmUsers,      excludeUsersSet.size > 0],
      ['Date / Messages interval',  skipReasons.dateInterval, dateConfigured],
      ['Text',                      skipReasons.text,         !!contentMatch],
      ['Links',                     skipReasons.links,        excludeLink],
      ['Mentions',                  skipReasons.mentions,     !!mentionMatch],
      ['@everyone / @here',         skipReasons.everyone,     excludeMentionEveryone],
      ['Attachments',               skipReasons.attachments,  excludeImage || excludeVideo || excludeSound],
      ['Extensions',                skipReasons.extensions,   !!extensionMatch],
    ].filter(([, count, configured]) => count > 0 || configured);
    if (breakdown.length) {
      log.info('  Skipped breakdown:');
      for (const [label, count] of breakdown) log.info(`    ${label}: ${count.toLocaleString()}`);
    }
  
    try { await undiscordCore.run(); }
    catch (err) { log.error('CoreException', err); undiscordCore.stop(); }
    finally {
      // Drop the source reference so a subsequent search-mode run starts clean.
      undiscordCore.options.importSource = null;
    }
  }
  
  /**
   * Validates every search-mode input the user filled in. Returns one of:
   *   { error: string }                                        — caller logs and aborts
   *   { authorList, excludeMentionsList, minDateUsed, warning? } — all good
   * Bundles the parsed-but-still-needed downstream values into the success path
   * so the orchestrator doesn't re-derive them.
   */
  function validateRunInputs(input) {
    const { minId, maxId, authorId, mentions, excludeMentions, content, excludeContent, minDate, maxDate } = input;
  
    // Snowflake IDs must be numeric and form a valid range.
    if (minId && !/^\d+$/.test(minId)) return { error: `"After message ID" must be a numeric Discord ID, got: "${minId}"` };
    if (maxId && !/^\d+$/.test(maxId)) return { error: `"Before message ID" must be a numeric Discord ID, got: "${maxId}"` };
    if (minId && maxId && BigInt(minId) >= BigInt(maxId)) {
      return { error: '"After message ID" must be older (smaller snowflake) than "Before message ID".' };
    }
  
    // Author IDs may be comma-separated (each one expands the batch). Validate numeric.
    const authorList = parseCsvList(authorId);
    for (const a of authorList) {
      if (!/^\d+$/.test(a)) return { error: `Author ID list contains a non-numeric value: "${a}"` };
    }
    // Include @user is single-value — Discord's `mentions=` query param accepts
    // only one ID per request. Reject if the user typed multiple manually.
    if (mentions && !/^\d+$/.test(mentions)) {
      return { error: `"Include @user" must be a single numeric Discord ID. Multi-mention only works on the Skip side (Discord's search API can only filter to one mention at a time).` };
    }
    // Skip @user IS multi-value — applied client-side as a list check.
    const excludeMentionsList = parseCsvList(excludeMentions);
    for (const m of excludeMentionsList) {
      if (!/^\d+$/.test(m)) return { error: `Skip mentions user ID list contains a non-numeric value: "${m}"` };
    }
  
    // Search-filter / Delete-filter overlap checks.
    if (content && excludeContent && content.toLowerCase() === excludeContent.toLowerCase()) {
      return { error: 'Include text and Skip text are the same — nothing would match. Clear one.' };
    }
    if (mentions && excludeMentionsList.includes(mentions)) {
      return { error: `Include @user (${mentions}) is also in Skip @user — nothing would match. Remove from one.` };
    }
  
    // Datetime validation. Date inputs are live-clamped to Discord's epoch via
    // bindDateClamp() the moment the user commits a value, so by the time we
    // get here, the only remaining work is parse-check, default-empty-min,
    // range-check.
    if (minDate && Number.isNaN(new Date(minDate).getTime())) return { error: 'Invalid "After date" — please re-enter using the date picker.' };
    if (maxDate && Number.isNaN(new Date(maxDate).getTime())) return { error: 'Invalid "Before date" — please re-enter using the date picker.' };
    const minDateUsed = minDate || DISCORD_EPOCH_LOCAL;
    const minDateMs = new Date(minDateUsed).getTime();
    const maxDateMs = maxDate ? new Date(maxDate).getTime() : null;
    if (maxDateMs !== null && minDateMs >= maxDateMs) {
      return { error: '"After date" must be earlier than "Before date".' };
    }
  
    // Warn (don't error) if both intervals are set — the message-ID range
    // wins, the date range is ignored.
    const warning = ((minId || maxId) && (minDate || maxDate))
      ? 'Both Message interval and Date interval are set — Message interval takes precedence.'
      : null;
  
    return { authorList, excludeMentionsList, minDateUsed, warning };
  }
  
  /** Expands `targets × authorList` into per-job entries. DMs are excluded from multi-author batching — Discord won't let you delete other users' DM messages, so DMs only ever spawn one self-author job. Returns `{ jobs, warnings }`. */
  function expandJobs(targets, authorList) {
    const jobs = [];
    const warnings = [];
    for (const t of targets) {
      if (t.guildId === '@me') {
        if (authorList.length > 1) {
          warnings.push(`DM ${t.channelId}: multi-author batching skipped — DMs only support self-author. Using first author (${authorList[0]}).`);
        }
        jobs.push({ ...t, authorId: authorList[0] || '' });
      } else if (authorList.length > 1) {
        for (const a of authorList) jobs.push({ ...t, authorId: a });
      } else {
        jobs.push({ ...t, authorId: authorList[0] || '' });
      }
    }
    return { jobs, warnings };
  }
  
  /** Search-mode dispatcher. Reads every form input, validates, parses the queue, expands jobs across (target × author), runs a permission pre-flight, and dispatches into core. The caller (startAction) handles the log-clear and import-mode routing. `askForConfirmation` lets the meta-orchestrator suppress the yes/no prompt for snapshots after the first. */
  async function runSearchModeFromForm(authToken, askForConfirmation = true) {
    // Edge case: empty Author ID. Fill the UI field with your own ID so the
    // rest of the function sees a populated input. The notice itself is deferred
    // to onStart so it lands AFTER the "Started at..." line. Streamer mode
    // redacts the ID in the log line — the input itself is dotted out via CSS.
    const authorInput = $('input#authorId');
    if (!authorInput.value.trim()) {
      const selfId = getAuthorId();
      if (selfId) {
        authorInput.value = selfId;
        pendingStartNotice = `Author ID was empty — defaulting to your own user ID (${dot(selfId)}).`;
      }
    }
  
    // ---- Read every input ----
    const authorId = authorInput.value.trim();
    const excludeNsfw = $('input#excludeNsfw').checked;
    // Search filter — include
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
    // Delete filter — exclude (applied client-side after the search response)
    const excludeContent = $('input#excludeSearch').value.trim();
    const excludeMatchMode = $('select#excludeMatchMode').value;
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
    const excludeExtensions = readSkipExtensions();
    // Message-ID interval
    const minId = $('input#minId').value.trim();
    const maxId = $('input#maxId').value.trim();
    // Date interval
    const minDate = $('input#minDate').value.trim();
    const maxDate = $('input#maxDate').value.trim();
    // Pacing knobs (stepper-backed; raw ms lives in dataset)
    const searchDelay = getDelayMs('searchDelay');
    const deleteDelay = getDelayMs('deleteDelay');
    const streamerMode = $('input#streamerMode').checked;
  
    // ---- Validate ----
    const validation = validateRunInputs({
      minId, maxId, authorId, mentions, excludeMentions, content, excludeContent, minDate, maxDate,
    });
    if (validation.error) return log.error(validation.error);
    const { authorList, minDateUsed, warning } = validation;
    if (warning) log.warn(warning);
  
    // ---- Queue ----
    const { targets, orphans } = parseTargets();
    if (!targets.length) return log.error('You must fill the "Server ID" field!');
    if (orphans) log.warn(`${orphans} channel entr${orphans === 1 ? 'y has' : 'ies have'} no server and will be skipped. Channels need a parent server.`);
  
    const { jobs, warnings } = expandJobs(targets, authorList);
    for (const w of warnings) log.warn(w);
  
    // Pre-flight permission check: any non-DM job with a non-self author needs
    // Manage Messages or Administrator on its target server. One API call total.
    const ok = await checkBatchPermissions(jobs, authToken);
    if (!ok) return;
  
    // ---- Run ----
    // Reset to 1/N — runBatch will overwrite via onJob in batch mode; single-job
    // runs leave it alone so the top bar shows "Job 1/1" throughout.
    currentJobInfo = { i: 1, n: jobs.length };
    undiscordCore.resetState();
    undiscordCore.resetOptions({
      authToken,
      authorId,
      excludeNsfw,
      minId: minId || minDateUsed,
      maxId: maxId || maxDate,
      content,
      hasLink, hasImage, hasVideo, hasSound,
      hasSticker, hasPoll, hasEmbed, hasForward,
      mentions, // single ID (validated above)
      mentionEveryone,
      pinnedMode,
      excludeContent, excludeMatchMode,
      excludeLink, excludeImage, excludeVideo, excludeSound,
      excludeSticker, excludePoll, excludeEmbed, excludeForward,
      excludeMentions, // comma-separated string; core parses into a list at filter time
      excludeMentionEveryone,
      excludeExtensions, // dedup'd lowercase array (presets ∪ custom textbox)
      searchDelay,
      deleteDelay,
      streamerMode,
      askForConfirmation,
    });
  
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
  
  /** Returns true when a snapshot has no targets, no import, and no author. The meta-orchestrator uses this to decide whether to append the current form as a trailing snapshot — a blank form after queued batches just runs the queue without a phantom empty pass at the end. */
  function isSnapshotBlank(snap) {
    if (snap.importedSet) return false;
    if (snap.guildId.trim() || snap.channelId.trim()) return false;
    if (snap.authorId) return false;
    return true;
  }
  
  /** Click handler for the Batch Selection sidebar button. Snapshots the current form, validates it, runs the pre-flight permission check (when a non-self author is present), pushes the snapshot onto selectionQueue, and resets the form. Failures abort without queuing — the user gets an explicit log line instead of silently building a poisoned queue. */
  async function queueSelectionAction() {
    const snap = captureSnapshot();
    if (isSnapshotBlank(snap)) {
      return log.warn('Batch Selection: nothing to queue — set a target / author / import first.');
    }
  
    // Dedup — if an exact-match snapshot is already queued, refuse rather than
    // silently double-queue. Compares every captured field; importedSet by
    // identity so two snapshots over the same loaded import collide as expected.
    const newKey = snapshotKey(snap);
    const dupeIdx = selectionQueue.findIndex(s => snapshotKey(s) === newKey);
    if (dupeIdx !== -1) {
      return log.warn(`Batch Selection: this selection is identical to queued snapshot #${dupeIdx + 1} — not queueing a duplicate.`);
    }
  
    // Soft redundancy warning — fires when one snapshot fully subsumes the
    // other. Never blocks; the worst case is harmless 404s on already-deleted
    // messages, and finer-grained policing isn't ours to do.
    for (let i = 0; i < selectionQueue.length; i++) {
      const prior = selectionQueue[i];
      if (snapshotASubsumesB(prior, snap)) {
        log.warn(`Batch Selection: queued snapshot #${i + 1} already wipes everything this selection targets. Queueing anyway — this run will mostly produce 404s for already-deleted messages.`);
      } else if (snapshotASubsumesB(snap, prior)) {
        log.warn(`Batch Selection: this selection wipes everything in queued snapshot #${i + 1}. Queueing anyway — snapshot #${i + 1} runs first; this selection will then re-cover its scope and produce 404s on the duplicated portion.`);
      }
    }
  
    // Import mode: validate the date / message-ID bounds in the same shape
    // runImportModeFromForm does. No pre-flight — deletion runs against the
    // user's own export only.
    if (snap.importedSet) {
      const { minId, maxId, minDate, maxDate } = snap;
      if (minId && !/^\d+$/.test(minId)) return log.error(`Batch Selection: "After message ID" must be numeric, got "${minId}"`);
      if (maxId && !/^\d+$/.test(maxId)) return log.error(`Batch Selection: "Before message ID" must be numeric, got "${maxId}"`);
      if (minId && maxId && BigInt(minId) >= BigInt(maxId)) {
        return log.error('Batch Selection: "After message ID" must be older than "Before message ID".');
      }
      if (minDate && Number.isNaN(new Date(minDate).getTime())) return log.error('Batch Selection: invalid "After date".');
      if (maxDate && Number.isNaN(new Date(maxDate).getTime())) return log.error('Batch Selection: invalid "Before date".');
  
      selectionQueue.push(snap);
      renderQueueBadge();
      log.info(`Queued selection #${selectionQueue.length} (import mode).`);
      resetAllSelection();
      return;
    }
  
    // Search-mode snapshots: full validation + pre-flight.
    const validation = validateRunInputs({
      minId:           snap.minId,
      maxId:           snap.maxId,
      authorId:        snap.authorId,
      mentions:        snap.mentionsId,
      excludeMentions: snap.excludeMentionsId,
      content:         snap.content,
      excludeContent:  snap.excludeSearch,
      minDate:         snap.minDate,
      maxDate:         snap.maxDate,
    });
    if (validation.error) return log.error(`Batch Selection: ${validation.error}`);
  
    const authToken = fillToken();
    if (!authToken) return;
  
    // parseTargets reads the live form. captureSnapshot ran milliseconds ago
    // against the same fields, so the values match the snapshot we're queuing.
    const { targets } = parseTargets();
    if (!targets.length) return log.error('Batch Selection: queue is empty — add a server, channel, or DM first.');
  
    // Empty Author ID defaults to self at run time (matches startAction).
    const authorList = validation.authorList.length ? validation.authorList : [getAuthorId() || ''].filter(Boolean);
    const { jobs } = expandJobs(targets, authorList);
  
    const ok = await checkBatchPermissions(jobs, authToken);
    if (!ok) {
      log.error('Batch Selection: snapshot rejected — pre-flight permission check failed (see above). Selection NOT queued.');
      return;
    }
  
    selectionQueue.push(snap);
    renderQueueBadge();
    log.info(`Queued selection #${selectionQueue.length} — ${jobs.length} job${jobs.length === 1 ? '' : 's'} ready.`);
    resetAllSelection();
  }
  
  /** Meta-orchestrator wired to the ▶︎ Delete button. Builds the list of snapshots to run (queued first, current form last unless it's blank), then iterates and dispatches each via runSearchModeFromForm or runImportModeFromForm. Each dispatch is independent — core.resetState/resetOptions per call prevents state bleed. The selectionQueue drains when the meta-batch finishes (or stops mid-way) so subsequent runs start clean. */
  async function startAction() {
    if (undiscordCore.state.running) return log.warn('A run is already in progress.');
  
    const authToken = fillToken();
    if (!authToken) return;
  
    const snapshots = [...selectionQueue];
    const currentSnap = captureSnapshot();
    if (!isSnapshotBlank(currentSnap)) snapshots.push(currentSnap);
  
    if (snapshots.length === 0) {
      return log.error('Nothing to run — set up a selection (or queue one) first.');
    }
  
    ui.logArea.innerHTML = '';
  
    const total = snapshots.length;
    if (total > 1) log.info(`Meta-batch: running ${total} selection${total === 1 ? '' : 's'} sequentially.`);
  
    // Confirmation prompt fires only on the first selection. The user already
    // confirmed the intent of running the queued batches when they hit Delete;
    // re-prompting between snapshots would just train them to click "Yes" without
    // reading. Declining the first prompt aborts the entire meta-batch.
    let confirmationConsumed = false;
  
    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i];
      if (total > 1) log.info(`══════ Selection ${i + 1}/${total} ══════`);
  
      // Replay into the live form so the dispatchers (which read from form
      // elements) see the snapshot's values. Restore importedSet too, since
      // mode dispatch is keyed off it.
      applySnapshot(snap);
      importedSet = snap.importedSet;
      if (importedSet) {
        ui.undiscordWindow.classList.add('import-mode');
        $('#importBadge').style.display = 'inline-flex';
      } else {
        ui.undiscordWindow.classList.remove('import-mode');
        $('#importBadge').style.display = 'none';
      }
      renderImportSummary();
  
      const askForConfirmation = !confirmationConsumed;
      if (importedSet) await runImportModeFromForm(authToken, askForConfirmation);
      else             await runSearchModeFromForm(authToken, askForConfirmation);
  
      // user-declined (first prompt) and user-stopped (Stop mid-run) both
      // abort the remaining meta-batch — barging on after either would betray
      // the user's intent.
      if (undiscordCore.state.endReason === 'user-declined') {
        if (i < snapshots.length - 1) {
          log.warn(`Meta-batch aborted at selection ${i + 1}/${total} — ${total - i - 1} remaining selection${total - i - 1 === 1 ? '' : 's'} skipped (you declined the confirmation prompt).`);
        }
        break;
      }
      if (undiscordCore.state.endReason === 'user-stopped' && i < snapshots.length - 1) {
        log.warn(`Meta-batch stopped at selection ${i + 1}/${total} — ${total - i - 1} remaining selection${total - i - 1 === 1 ? '' : 's'} skipped.`);
        break;
      }
  
      confirmationConsumed = true;
    }
  
    selectionQueue = [];
    renderQueueBadge();
    if (total > 1) log.info('Meta-batch finished.');
  }
  
  /** Click handler for the 🛑 Stop button. Forwards to core.stop(). */
  function stopAction() {
    undiscordCore.stop();
  }
  
  
  __exports.default = initUI;
};

__modules["src/index.js"] = (__exports) => {
  /** Userscript entry point. The userscript manager runs this once on Discord page load; initUI() injects the panel and the floating action button. */
  const initUI = __require("src/undiscord-ui.js").default;
  initUI();
  
};

__require("src/index.js");
})();
