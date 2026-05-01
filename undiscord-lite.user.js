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
  __exports.default = "/* ----------------------------------------------------------------\n * Dark-mode fallback palette.\n * Each --_u-* var resolves to Discord's CSS variable when present,\n * and to a hand-picked dark color when Discord renames or removes it.\n * ---------------------------------------------------------------- */\n#undiscord { --_u-bg-panel:        var(--background-secondary, #2b2d31); --_u-bg-header:       var(--background-tertiary, #1e1f22); --_u-bg-sidebar:      var(--bg-overlay-4, var(--background-base-lowest, #1e1f22)); --_u-bg-main:         var(--bg-overlay-chat, var(--background-base-lower, #313338)); --_u-bg-toolbar:      var(--bg-overlay-2, var(--__header-bar-background, #2b2d31)); --_u-bg-input:        var(--input-background, #1e1f22); --_u-bg-floating:     var(--background-floating, #111214); --_u-bg-hover:        var(--background-modifier-hover, #35373c); --_u-bg-accent:       var(--background-modifier-accent, #3f4147); --_u-bg-surface-high: var(--background-surface-high, #2b2d31); --_u-text:        var(--text-normal, var(--text-default, #dbdee1)); --_u-text-muted:  var(--text-muted, #949ba4); --_u-text-header: var(--header-primary, #f2f3f5); --_u-text-label:  var(--header-secondary, #b5bac1); --_u-text-link:   var(--text-link, #00a8fc); --_u-int:        var(--interactive-normal, #b5bac1); --_u-int-hover:  var(--interactive-hover, #dbdee1); --_u-int-active: var(--interactive-active, #ffffff); --_u-int-muted:  var(--interactive-muted, #6d6f78); --_u-btn-secondary: var(--button-secondary-background, #4e5058); --_u-btn-danger:    var(--button-danger-background, #da373c); --_u-border:       var(--border-subtle, rgba(78, 80, 88, 0.48)); --_u-input-border: var(--input-border, #1e1f22); --_u-scrollbar-thumb: var(--scrollbar-thin-thumb, rgba(24, 25, 28, 0.6)); --_u-scrollbar-track: var(--scrollbar-thin-track, transparent); --_u-shadow:        var(--elevation-high, 0 8px 16px rgba(0, 0, 0, 0.24)); --_u-shadow-stroke: var(--elevation-stroke, 0 0 0 1px rgba(0, 0, 0, 0.2)); --_u-font-display:  var(--font-display, 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif); }\n/* undiscord window */\n#undiscord.browser { box-shadow: var(--_u-shadow-stroke), var(--_u-shadow); border: 1px solid var(--_u-border); overflow: hidden; }\n#undiscord.container,\n#undiscord .container { background-color: var(--_u-bg-surface-high); border-radius: 8px; box-sizing: border-box; cursor: default; flex-direction: column; }\n#undiscord .header { background-color: var(--_u-bg-header); height: 48px; align-items: center; min-height: 48px; padding: 0 16px; display: flex; color: var(--_u-text-label); }\n#undiscord .header .icon { color: var(--_u-int); margin-right: 8px; flex-shrink: 0; width: 24; height: 24; }\n#undiscord .header .icon:hover { color: var(--_u-int-hover); }\n#undiscord .header h3 { font-size: 16px; line-height: 20px; font-weight: 500; font-family: var(--_u-font-display); color: var(--_u-text-header); flex-shrink: 0; margin-right: 16px; }\n#undiscord .spacer { flex-grow: 1; }\n#undiscord .header .vert-divider { width: 1px; height: 24px; background-color: var(--_u-bg-accent); margin-right: 16px; flex-shrink: 0; }\n#undiscord legend,\n#undiscord label { color: var(--_u-text-label); font-size: 12px; line-height: 16px; font-weight: 500; text-transform: uppercase; cursor: default; font-family: var(--_u-font-display); margin-bottom: 8px; }\n#undiscord .multiInput { display: flex; align-items: center; font-size: 16px; box-sizing: border-box; width: 100%; border-radius: 3px; color: var(--_u-text); background-color: var(--_u-bg-input); border: none; transition: border-color 0.2s ease-in-out 0s; }\n#undiscord .multiInput :first-child { flex-grow: 1; }\n#undiscord .multiInput button:last-child { margin-right: 4px; }\n#undiscord .multiInput button + button { margin-left: 3px; }\n#undiscord .input-actions { display: flex; gap: 4px; margin-top: 6px; }\n#undiscord .input-actions button { flex: 1; }\n#undiscord .sectionDescription.tips > div { padding-left: 0.9em; text-indent: -0.9em; margin-bottom: 3px; }\n#undiscord #queueCounter { display: grid; grid-template-columns: max-content max-content; column-gap: 14px; row-gap: 2px; margin: 8px 0 12px; padding: 6px 10px; border-radius: 4px; background: var(--_u-bg-input); color: var(--_u-text); font-family: Consolas, Liberation Mono, Menlo, Courier, monospace; font-size: 12px; }\n#undiscord #queueCounter:empty { margin: 0; padding: 0; background: none; }\n#undiscord #queueCounter .qc-orphan { color: var(--_u-btn-danger, #da373c); }\n#undiscord .input { font-size: 16px; width: 100%; transition: border-color 0.2s ease-in-out 0s; padding: 10px; height: 44px; background-color: var(--_u-bg-input); border: 1px solid var(--_u-input-border); border-radius: 8px; box-sizing: border-box; color: var(--_u-text); }\n#undiscord fieldset { margin-top: 16px; }\n#undiscord .input-wrapper { display: flex; align-items: center; font-size: 16px; box-sizing: border-box; width: 100%; border-radius: 3px; color: var(--_u-text); background-color: var(--_u-bg-input); border: none; transition: border-color 0.2s ease-in-out 0s; }\n#undiscord input[type=\"text\"],\n#undiscord input[type=\"search\"],\n#undiscord input[type=\"password\"],\n#undiscord input[type=\"datetime-local\"],\n#undiscord input[type=\"number\"],\n#undiscord input[type=\"range\"] { background-color: var(--_u-bg-input); border: 1px solid var(--_u-input-border); border-radius: 8px; box-sizing: border-box; color: var(--_u-text); font-size: 16px; height: 44px; padding: 12px 10px; transition: border-color .2s ease-in-out; width: 100%; }\n#undiscord input[type=\"file\"] { color: var(--_u-text); }\n#undiscord hr { border: none; margin-bottom: 24px; padding-bottom: 4px; border-bottom: 1px solid var(--_u-bg-accent); }\n#undiscord .sectionDescription { margin-bottom: 16px; color: var(--_u-text-label); font-size: 14px; line-height: 20px; font-weight: 400; }\n#undiscord a { color: var(--_u-text-link); text-decoration: none; }\n#undiscord a:hover { text-decoration: underline; }\n#undiscord .btn,\n#undiscord button { position: relative; display: flex; -webkit-box-pack: center; justify-content: center; -webkit-box-align: center; align-items: center; box-sizing: border-box; background: none; border: none; border-radius: 3px; font-size: 14px; font-weight: 500; line-height: 16px; padding: 2px 16px; user-select: none; cursor: pointer; /* sizeSmall */     width: 60px; height: 32px; min-width: 60px; min-height: 32px; /* lookFilled colorPrimary */     color: #ffffff; background-color: var(--_u-btn-secondary); transition: background-color 0.15s ease, filter 0.15s ease; }\n#undiscord .btn:hover,\n#undiscord button:hover { filter: brightness(1.15); }\n#undiscord button:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }\n#undiscord .sizeMedium { width: 96px; height: 38px; min-width: 96px; min-height: 38px; }\n#undiscord .sizeMedium.icon { width: 38px; min-width: 38px; }\n#undiscord sup { vertical-align: top; }\n#undiscord .danger { background-color: var(--_u-btn-danger); }\n/* Scrollbar */\n#undiscord .scroll::-webkit-scrollbar { width: 8px; height: 8px; }\n#undiscord .scroll::-webkit-scrollbar-corner { background-color: transparent; }\n#undiscord .scroll::-webkit-scrollbar-thumb { background-clip: padding-box; border: 2px solid transparent; border-radius: 4px; background-color: var(--_u-scrollbar-thumb); min-height: 40px; }\n#undiscord .scroll::-webkit-scrollbar-track { border-color: var(--_u-scrollbar-track); background-color: var(--_u-scrollbar-track); border: 2px solid var(--_u-scrollbar-track); }\n/* fade scrollbar */\n#undiscord .scroll::-webkit-scrollbar-thumb,\n#undiscord .scroll::-webkit-scrollbar-track { visibility: hidden; }\n#undiscord .scroll:hover::-webkit-scrollbar-thumb,\n#undiscord .scroll:hover::-webkit-scrollbar-track { visibility: visible; }\n#undiscord :disabled { display: none; }\n/**** layout and utility classes ****/\n#undiscord,\n#undiscord * { box-sizing: border-box; }\n#undiscord .col { display: flex; flex-direction: column; }\n#undiscord .row { display: flex; flex-direction: row; align-items: center; }\n#undiscord .mb1 { margin-bottom: 8px; }\n#undiscord .log { margin-bottom: 0.25em; }\n#undiscord .log-debug { color: var(--_u-text); }\n#undiscord .log-info { color: #00b0f4; }\n#undiscord .log-verb { color: var(--_u-text-muted); }\n#undiscord .log-warn { color: #faa61a; }\n#undiscord .log-error { color: #f04747; }\n#undiscord .log-success { color: #43b581; }\n/**** Undiscord Button (FAB) ****/\n#undiscord-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--background-floating, #18191c); color: var(--interactive-normal); border-radius: 50%; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); cursor: pointer; transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease; }\n#undiscord-btn:hover { color: var(--interactive-active); background: var(--background-modifier-hover, #2e3035); transform: scale(1.05); }\n#undiscord-btn:focus-visible { outline: 2px solid var(--brand-experiment, #5865f2); outline-offset: 2px; }\n#undiscord-btn progress { position: absolute; bottom: 4px; left: 8px; width: 32px; height: 4px; display: none; }\n#undiscord-btn.running { color: var(--button-danger-background) !important; }\n#undiscord-btn.running progress { display: block; }\n/**** Undiscord Interface ****/\n#undiscord { position: fixed; z-index: 100; top: 58px; right: 10px; display: flex; flex-direction: column; width: 800px; height: 80vh; min-width: 610px; max-width: 100vw; min-height: 448px; max-height: 100vh; color: var(--_u-text); border-radius: 4px; background-color: var(--_u-bg-panel); box-shadow: var(--_u-shadow-stroke), var(--_u-shadow); will-change: top, left, width, height; }\n#undiscord .header .icon { cursor: pointer; }\n#undiscord .window-body { height: calc(100% - 48px); }\n#undiscord .sidebar { overflow: hidden scroll; overflow-y: auto; width: 270px; min-width: 250px; height: 100%; max-height: 100%; padding: 8px; background: var(--_u-bg-sidebar); }\n#undiscord .sidebar legend,\n#undiscord .sidebar label { display: block; width: 100%; }\n#undiscord .main { display: flex; max-width: calc(100% - 250px); background-color: var(--_u-bg-main); flex-grow: 1; }\n#undiscord #logArea { font-family: Consolas, Liberation Mono, Menlo, Courier, monospace; font-size: 0.75rem; overflow: auto; padding: 10px; user-select: text; flex-grow: 1; flex-grow: 1; cursor: auto; }\n#undiscord .tbar { padding: 8px; background-color: var(--_u-bg-toolbar); }\n#undiscord .tbar button { margin-right: 4px; margin-bottom: 4px; }\n#undiscord .footer #progressPercent { padding: 0 1em; font-size: small; color: var(--_u-text-muted); flex-grow: 1; }\n/**** Elements ****/\n#undiscord summary { font-size: 16px; font-weight: 500; line-height: 20px; position: relative; overflow: hidden; margin-bottom: 2px; padding: 6px 10px; cursor: pointer; white-space: nowrap; text-overflow: ellipsis; color: var(--_u-int); border-radius: 4px; flex-shrink: 0; }\n#undiscord summary:hover { color: var(--_u-int-hover); background-color: var(--_u-bg-hover); }\n#undiscord fieldset { padding-left: 8px; }\n#undiscord legend a { float: right; text-transform: initial; }\n#undiscord progress { height: 8px; margin-top: 4px; flex-grow: 1; }\n#undiscord .importJson { display: flex; flex-direction: row; }\n#undiscord .importJson button { margin-left: 5px; width: fit-content; }\n/**** Drag/resize handles ****/\n[name^=\"grab-\"] { position: absolute; --size: 6px; --corner-size: 16px; --offset: -1px; z-index: 9; }\n[name^=\"grab-\"]:hover { background: rgba(128, 128, 128, 0.1); }\n[name=\"grab-t\"] { top: 0; left: var(--corner-size); right: var(--corner-size); height: var(--size); margin-top: var(--offset); cursor: ns-resize; }\n[name=\"grab-r\"] { top: var(--corner-size); bottom: var(--corner-size); right: 0; width: var(--size); margin-right: var(--offset); cursor: ew-resize; }\n[name=\"grab-b\"] { bottom: 0; left: var(--corner-size); right: var(--corner-size); height: var(--size); margin-bottom: var(--offset); cursor: ns-resize; }\n[name=\"grab-l\"] { top: var(--corner-size); bottom: var(--corner-size); left: 0; width: var(--size); margin-left: var(--offset); cursor: ew-resize; }\n[name=\"grab-tl\"] { top: 0; left: 0; width: var(--corner-size); height: var(--corner-size); margin-top: var(--offset); margin-left: var(--offset); cursor: nwse-resize; }\n[name=\"grab-tr\"] { top: 0; right: 0; width: var(--corner-size); height: var(--corner-size); margin-top: var(--offset); margin-right: var(--offset); cursor: nesw-resize; }\n[name=\"grab-br\"] { bottom: 0; right: 0; width: var(--corner-size); height: var(--corner-size); margin-bottom: var(--offset); margin-right: var(--offset); cursor: nwse-resize; }\n[name=\"grab-bl\"] { bottom: 0; left: 0; width: var(--corner-size); height: var(--corner-size); margin-bottom: var(--offset); margin-left: var(--offset); cursor: nesw-resize; }\n/**** Decorative resize indicator + cursor hints ****/\n#undiscord .header { cursor: grab; }\n#undiscord .footer { cursor: se-resize; padding-right: 30px; }\n.resize-handle { position: absolute; bottom: -15px; right: -15px; width: 30px; height: 30px; transform: rotate(-45deg); background: repeating-linear-gradient(0, var(--_u-bg-accent, #3f4147), var(--_u-bg-accent, #3f4147) 1px, transparent 2px, transparent 4px); cursor: nwse-resize; }\n";
};

__modules["src/ui/undiscord.html"] = (__exports) => {
  __exports.default = "<div id=\"undiscord\" class=\"browser container\" style=\"display:none;\">\n    <div class=\"header\">\n        <svg class=\"icon\" aria-hidden=\"false\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n            <path fill=\"currentColor\" d=\"M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z\"></path>\n            <path fill=\"currentColor\"\n                d=\"M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z\">\n            </path>\n        </svg>\n        <h3>Undiscord Lite</h3>\n        <div class=\"vert-divider\"></div>\n        <span> Bulk delete messages</span>\n        <div class=\"spacer\"></div>\n        <div id=\"hide\" class=\"icon\" aria-label=\"Close\" role=\"button\" tabindex=\"0\">\n            <svg aria-hidden=\"false\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n                <path fill=\"currentColor\"\n                    d=\"M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z\">\n                </path>\n            </svg>\n        </div>\n    </div>\n    <div class=\"window-body\" style=\"display: flex; flex-direction: row;\">\n        <div class=\"sidebar scroll\">\n            <details open>\n                <summary>General</summary>\n                <fieldset>\n                    <legend>Author ID</legend>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input\" id=\"authorId\" type=\"text\">\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"getAuthor\">me</button>\n                    </div>\n                </fieldset>\n                <hr>\n                <fieldset>\n                    <legend>Server ID</legend>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input\" id=\"guildId\" type=\"text\">\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"setGuild\">set</button>\n                        <button id=\"addGuild\">add</button>\n                        <button id=\"delGuild\">del</button>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Channel ID</legend>\n                    <div class=\"input-wrapper\">\n                        <input class=\"input\" id=\"channelId\" type=\"text\">\n                    </div>\n                    <div class=\"input-actions\">\n                        <button id=\"setChannel\">set</button>\n                        <button id=\"addChannel\">add</button>\n                        <button id=\"delChannel\">del</button>\n                    </div>\n                    <div id=\"queueCounter\"></div>\n                    <div class=\"sectionDescription\">\n                        <label class=\"row\"><input id=\"includeNsfw\" type=\"checkbox\">This is a NSFW channel</label>\n                    </div>\n                    <div class=\"sectionDescription tips\">\n                        <div>› Leave Channel ID's empty to target the entire server.</div>\n                        <div>› Use 'set' to override all with the current server/channel.</div>\n                        <div>› Use 'add' to add the current server/channel to a batch job.</div>\n                        <div>› Use 'del' to remove the current server/channel from the batch.</div>\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Filter</summary>\n                <fieldset>\n                    <legend>Search</legend>\n                    <div class=\"input-wrapper\">\n                        <input id=\"search\" type=\"text\" placeholder=\"Containing text\">\n                    </div>\n                    <div class=\"sectionDescription\">\n                        Only delete messages that contain the text\n                    </div>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"hasLink\" type=\"checkbox\">has: link</label>\n                    </div>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"hasFile\" type=\"checkbox\">has: file</label>\n                    </div>\n                    <div class=\"sectionDescription\">\n                        <label><input id=\"includePinned\" type=\"checkbox\">Include pinned</label>\n                    </div>\n                </fieldset>\n            </details>\n            <details>\n                <summary>Messages interval</summary>\n                <fieldset>\n                    <legend>Interval of messages</legend>\n                    <div class=\"input-wrapper mb1\">\n                        <input id=\"minId\" type=\"text\" placeholder=\"After a message ID\">\n                    </div>\n                    <div class=\"input-wrapper\">\n                        <input id=\"maxId\" type=\"text\" placeholder=\"Before a message ID\">\n                    </div>\n                    <div class=\"sectionDescription\">\n                        Specify an interval to delete messages. Right-click a message in Discord → Copy Message ID.\n                    </div>\n                </fieldset>\n            </details>\n            <details>\n                <summary>Date interval</summary>\n                <fieldset>\n                    <legend>After date</legend>\n                    <div class=\"input-wrapper mb1\">\n                        <input id=\"minDate\" type=\"datetime-local\" title=\"Messages posted AFTER this date\">\n                    </div>\n                    <legend>Before date</legend>\n                    <div class=\"input-wrapper\">\n                        <input id=\"maxDate\" type=\"datetime-local\" title=\"Messages posted BEFORE this date\">\n                    </div>\n                    <div class=\"sectionDescription\">\n                        Delete messages that were posted between the two dates.\n                    </div>\n                    <div class=\"sectionDescription\">\n                        * Filtering by date doesn't work if you use the \"Messages interval\".\n                    </div>\n                </fieldset>\n            </details>\n            <hr>\n            <details>\n                <summary>Advanced settings</summary>\n                <fieldset>\n                    <legend>Search delay</legend>\n                    <div class=\"input-wrapper\">\n                        <input id=\"searchDelay\" type=\"range\" value=\"30000\" step=\"100\" min=\"100\" max=\"60000\">\n                        <div id=\"searchDelayValue\"></div>\n                    </div>\n                </fieldset>\n                <fieldset>\n                    <legend>Delete delay</legend>\n                    <div class=\"input-wrapper\">\n                        <input id=\"deleteDelay\" type=\"range\" value=\"1000\" step=\"50\" min=\"50\" max=\"10000\">\n                        <div id=\"deleteDelayValue\"></div>\n                    </div>\n                    <br>\n                    <div class=\"sectionDescription\">\n                        This will affect the speed in which the messages are deleted.\n                    </div>\n                </fieldset>\n            </details>\n        </div>\n        <div class=\"main col\">\n            <div class=\"tbar col\">\n                <div class=\"row\">\n                    <button id=\"start\" class=\"sizeMedium danger\" style=\"width: 150px;\" title=\"Start the deletion process\">▶︎ Delete</button>\n                    <button id=\"stop\" class=\"sizeMedium\" title=\"Stop the deletion process\" disabled>🛑 Stop</button>\n                    <button id=\"clear\" class=\"sizeMedium\">Clear log</button>\n                </div>\n                <div class=\"row\">\n                    <progress id=\"progressBar\" style=\"display:none;\"></progress>\n                </div>\n            </div>\n            <pre id=\"logArea\" class=\"logarea scroll\"></pre>\n            <div class=\"tbar footer row\">\n                <div id=\"progressPercent\"></div>\n                <span class=\"spacer\"></span>\n                <label>\n                    <input id=\"autoScroll\" type=\"checkbox\" checked> Auto scroll\n                </label>\n                <div class=\"resize-handle\"></div>\n            </div>\n        </div>\n    </div>\n</div>\n";
};

__modules["src/helpers.js"] = (__exports) => {
  // Shared helpers — utility functions, DOM helpers, the log facade,
  // and Discord-specific extractors (token, IDs).
  
  // ---------- General utilities ----------
  
  const msToHMS = s => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;
  const escapeHTML = html => String(html).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\'': '&#039;' })[m]);
  const queryString = params => params.filter(p => p[1] !== undefined).map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&');
  // Async wrapper around window.confirm. The 10ms setTimeout lets queued log writes
  // paint before the blocking modal pops. Returns true on OK, false on Cancel.
  const askYesNo = async msg => new Promise(resolve => setTimeout(() => resolve(window.confirm(msg)), 10));
  const toSnowflake = (date) => /:/.test(date) ? ((new Date(date).getTime() - 1420070400000) * Math.pow(2, 22)) : date;
  
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
  // the parent origin's storage and is the standard workaround. The iframe is
  // removed after the read so we don't accumulate orphan nodes.
  function withIframeLocalStorage(read) {
    const f = document.body.appendChild(document.createElement('iframe'));
    try { return read(f.contentWindow.localStorage); }
    finally { f.remove(); }
  }
  
  const CHANNEL_URL_RE = /channels\/([\w@]+)\/(\d+)/;
  
  function getToken() {
    window.dispatchEvent(new Event('beforeunload'));
    try {
      return withIframeLocalStorage(ls => JSON.parse(ls.token));
    } catch {
      log.info('Could not automatically detect Authorization Token in local storage!');
      log.info('Attempting to grab token using webpack');
      return (window.webpackChunkdiscord_app.push([[''], {}, e => { window.m = []; for (let c in e.c) window.m.push(e.c[c]); }]), window.m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken();
    }
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
  
  class UndiscordCore {
  
    // ---- Private state ----
    // #runId is bumped on every stop() and at the start of every run(); each
    // loop captures the value at start and bails out if it ever sees a different
    // value (the loop has been superseded by stop or a fresh run).
    #runId = 0;
    #waitAbort = null; // set while a #wait() is in flight; calling it resolves the wait early
    #beforeTs = 0;     // timestamp at request-send, used by afterRequest() for ping calc
  
    /** Cancellable sleep — stop() resolves this immediately so the loop checks running/runId without delay. */
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
      authToken: null, // Your authorization token
      authorId: null, // Author of the messages you want to delete
      guildId: null, // Server where the messages are located
      channelId: null, // Channel where the messages are located
      minId: null, // Only delete messages after this, leave blank to delete all
      maxId: null, // Only delete messages before this, leave blank to delete all
      content: null, // Filter messages that contains this text content
      hasLink: null, // Filter messages that contains link
      hasFile: null, // Filter messages that contains file
      includeNsfw: null, // Search in NSFW channels
      includePinned: null, // Delete messages that are pinned
      searchDelay: null, // Delay each time we fetch for more messages
      deleteDelay: null, // Delay between each delete operation
      maxEmptyPageRetries: 5, // Re-fetch this many times when an empty page comes back but grandTotal says more remain
      askForConfirmation: true,
    };
  
    state = {
      running: false,
      delCount: 0,
      failCount: 0,
      grandTotal: 0,
      offset: 0,
      emptyPageRetry: 0,
      _userDeleteDelay: 0, // baseline the user chose; options.deleteDelay decays back toward this after 429 bumps
      _userSearchDelay: 0, // baseline the user chose; options.searchDelay decays back toward this after 429 bumps
  
      _searchResponse: null,
      _messagesToDelete: [],
      _skippedMessages: [],
    };
  
    stats = {
      startTime: null, // set by run() at start; only read after onProgress fires
      throttledCount: 0, // how many times you have been throttled
      throttledTotalTime: 0, // the total amount of time you spent being throttled
      lastPing: null, // the most recent ping
      avgPing: null, // average ping used to calculate the estimated remaining time
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
        _userDeleteDelay: 0,
        _userSearchDelay: 0,
  
        _searchResponse: null,
        _messagesToDelete: [],
        _skippedMessages: [],
      };
  
      this.options.askForConfirmation = true;
    }
  
    /** Automate the deletion process of multiple channels */
    async runBatch(queue) {
      if (this.state.running) return log.error('Already running!');
  
      log.info(`Running batch with queue of ${queue.length} jobs`);
      for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        log.info('Starting job...', `(${i + 1}/${queue.length})`);
  
        // set options
        this.options = {
          ...this.options, // keep current options
          ...job, // override with options for that job
        };
  
        await this.run(true);
        if (!this.state.running) break;
  
        log.info('Job ended.', `(${i + 1}/${queue.length})`);
        this.resetState();
        this.options.askForConfirmation = false;
        // Note: run() sets state.running = true on entry, so we don't need to here.
      }
  
      log.info('Batch finished.');
      this.state.running = false;
    }
  
    /** Start the deletion process */
    async run(inBatch = false) {
      if (this.state.running && !inBatch) return log.error('Already running!');
  
      this.#runId++;                  // any prior loop now sees a stale id and exits
      const myRunId = this.#runId;    // captured for this run only
      this.state.running = true;
      this.state._userDeleteDelay = this.options.deleteDelay; // baseline for decay after rate-limit bumps
      this.state._userSearchDelay = this.options.searchDelay;
      this.stats.startTime = new Date();
  
      log.success(`\nStarted at ${this.stats.startTime.toLocaleString()}`);
      log.debug(
        `authorId = "${escapeHTML(this.options.authorId)}"`,
        `guildId = "${escapeHTML(this.options.guildId)}"`,
        `channelId = "${escapeHTML(this.options.channelId)}"`,
        `minId = "${escapeHTML(this.options.minId)}"`,
        `maxId = "${escapeHTML(this.options.maxId)}"`,
        `hasLink = ${!!this.options.hasLink}`,
        `hasFile = ${!!this.options.hasFile}`,
      );
  
      if (this.onStart) this.onStart(this.state, this.stats);
  
      do {
        // Bail out if a newer run() (or stop()) has superseded this loop.
        if (this.#runId !== myRunId) {
          log.verb('Run instance superseded — exiting old loop.');
          return;
        }
  
        log.verb('Fetching messages...');
        // Search messages
        await this.search();
  
        // search() can short-circuit on stop during a 202/429 cooldown wait,
        // returning before _searchResponse is populated. filterResponse would crash.
        if (!this.state.running || this.#runId !== myRunId) return;
  
        // Process results and find which messages should be deleted
        await this.filterResponse();
  
        log.verb(
          `Grand total: ${this.state.grandTotal}`,
          `(Messages in current page: ${this.state._searchResponse.messages.length}`,
          `To be deleted: ${this.state._messagesToDelete.length}`,
          `Skipped: ${this.state._skippedMessages.length})`,
          `offset: ${this.state.offset}`
        );
        this.printStats();
  
        // Calculate estimated time
        this.calcEtr();
        log.verb(`Estimated time remaining: ${msToHMS(this.stats.etr)}`);
  
        // if there are messages to delete, delete them
        if (this.state._messagesToDelete.length > 0) {
          this.state.emptyPageRetry = 0; // got a productive page, reset retry counter
  
          if (await this.promptConfirmation() === false) {
            this.state.running = false; // break out of a job
            break; // immediately stop this iteration
          }
  
          await this.deleteMessagesFromList();
        }
        else if (this.state._skippedMessages.length > 0) {
          this.state.emptyPageRetry = 0; // got a non-empty page, reset retry counter
          // There's stuff on this page, but nothing we can delete (e.g. a page full of system messages).
          // Check next page until we see a page with nothing in it (end of results).
          const oldOffset = this.state.offset;
          this.state.offset += this.state._skippedMessages.length;
          log.verb('There\'s nothing we can delete on this page, checking next page...');
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
            if (this.state.emptyPageRetry >= max) {
              log.warn(`Gave up after ${max} consecutive empty pages.`, `(${expectedRemaining} message(s) still expected per grandTotal — may be unreachable due to search index lag, offset cap, or filter mismatch.)`);
            } else {
              log.verb('Ended because API returned an empty page.');
            }
            log.verb('[End state]', this.state);
            if (inBatch) break; // break without stopping if this is part of a job
            this.state.running = false;
            break; // skip the trailing searchDelay wait — we're done
          }
        }
  
        // wait before next page (fix search page not updating fast enough)
        log.verb(`Waiting ${(this.options.searchDelay / 1000).toFixed(2)}s before next page...`);
        await this.#wait(this.options.searchDelay);
  
      } while (this.state.running);
  
      // If this loop was superseded while waiting, suppress the "Ended" summary
      // and the onStop callback — those belong to the new run, not this one.
      if (this.#runId !== myRunId) return;
  
      const endTime = new Date();
      log.success(`Ended at ${endTime.toLocaleString()}! Total time: ${msToHMS(endTime.getTime() - this.stats.startTime.getTime())}`);
      this.printStats();
      log.debug(`Deleted ${this.state.delCount} messages, ${this.state.failCount} failed.\n`);
  
      if (this.onStop) this.onStop(this.state, this.stats);
    }
  
    stop() {
      this.state.running = false;
      this.#runId++;                          // invalidate any in-flight loop
      if (this.#waitAbort) this.#waitAbort(); // wake up the loop's sleep so it exits immediately
      if (this.onStop) this.onStop(this.state, this.stats);
    }
  
    /** Calculate the estimated time remaining based on the current stats */
    calcEtr() {
      this.stats.etr = (this.options.searchDelay * Math.round(this.state.grandTotal / 25)) + ((this.options.deleteDelay + this.stats.avgPing) * this.state.grandTotal);
    }
  
    /** Show a window.confirm dialog with a preview of the messages about to be deleted. */
    async promptConfirmation() {
      if (!this.options.askForConfirmation) return true;
  
      log.verb('Waiting for your confirmation...');
      const preview = this.state._messagesToDelete.map(m => `${m.author?.username ?? '[system]'}#${m.author?.discriminator ?? '0'}: ${m.attachments?.length ? '[ATTACHMENTS]' : m.content}`).join('\n');
  
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
          ['has', this.options.hasLink ? 'link' : undefined],
          ['has', this.options.hasFile ? 'file' : undefined],
          ['content', this.options.content || undefined],
          ['include_nsfw', this.options.includeNsfw ? true : undefined],
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
  
    async filterResponse() {
      const data = this.state._searchResponse;
  
      // the search total will decrease as we delete stuff
      const total = data.total_results;
      if (total > this.state.grandTotal) this.state.grandTotal = total;
  
      // search returns messages near the actual message, only get the messages we searched for.
      // .filter(Boolean) drops convos with no hit (defensive — Discord normally guarantees a hit per convo).
      const discoveredMessages = data.messages.map(convo => convo.find(message => message.hit === true)).filter(Boolean);
  
      // we can only delete some types of messages, system messages are not deletable.
      let messagesToDelete = discoveredMessages;
      messagesToDelete = messagesToDelete.filter(msg => msg.type === 0 || (msg.type >= 6 && msg.type <= 21));
      messagesToDelete = messagesToDelete.filter(msg => msg.pinned ? this.options.includePinned : true);
  
      // create an array containing everything we skipped. (used to calculate offset for next searches)
      const skippedMessages = discoveredMessages.filter(msg => !messagesToDelete.find(m => m.id === msg.id));
  
      this.state._messagesToDelete = messagesToDelete;
      this.state._skippedMessages = skippedMessages;
    }
  
    async deleteMessagesFromList() {
      const myRunId = this.#runId;
      for (let i = 0; i < this.state._messagesToDelete.length; i++) {
        // Stop if user clicked stop OR a newer run has superseded this one.
        if (this.#runId !== myRunId || !this.state.running) return log.error('Stopped by you!');
  
        const message = this.state._messagesToDelete[i];
  
        const author = `${message.author?.username ?? '[system]'}#${message.author?.discriminator ?? '0'}`;
        log.debug(
          `[${this.state.delCount + 1}/${this.state.grandTotal}] ` +
          `<sup>${new Date(message.timestamp).toLocaleString()}</sup> ` +
          `<b>${escapeHTML(author)}</b>` +
          `: <i>${escapeHTML(message.content ?? '').replace(/\n/g, '↵')}</i>` +
          (message.attachments?.length ? escapeHTML(JSON.stringify(message.attachments)) : ''),
          `<sup>{ID:${escapeHTML(message.id)}}</sup>`
        );
  
        // Delete a single message (with retry)
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
      log.verb(
        `Delete delay: ${this.options.deleteDelay}ms, Search delay: ${this.options.searchDelay}ms`,
        `Last Ping: ${this.stats.lastPing}ms, Average Ping: ${this.stats.avgPing | 0}ms`,
      );
      log.verb(
        `Rate Limited: ${this.stats.throttledCount} times.`,
        `Total time throttled: ${msToHMS(this.stats.throttledTotalTime)}.`
      );
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
  // An empty group (";", or "C1;") = server-wide wipe of that server.
  // If the channel input has no ';', we fall back to the legacy parallel-CSV interpretation
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
  //   - Adding (S, '') absorbs any (S, channels) — they're redundant.
  //   - Adding (S, C) is skipped if (S, '') already covers S.
  // Plain duplicates are silently ignored. Migrates legacy parallel-CSV input to
  // grouped format on the way in.
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
      if (!wasNew && groups[idx].length > 0) {
        log.warn(`Server-wide wipe of ${server} absorbed ${groups[idx].length} channel-specific entr${groups[idx].length === 1 ? 'y' : 'ies'}.`);
      }
      groups[idx] = [];
    } else {
      // Channel-specific. If the server is currently server-wide, NARROW it to this channel
      // (Add Channel after Add Server is the user telling us "actually, just this one").
      if (!wasNew && groups[idx].length === 0) {
        log.info(`Server-wide wipe of ${server} narrowed to ${server}:${channel}.`);
        groups[idx] = [channel];
      } else {
        if (groups[idx].includes(channel)) return; // plain dedup
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
  
  // Remove a server (and all its channels) from the queue.
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
  // left after removal, the server is dropped too (we never auto-convert to server-wide).
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
      servers.splice(idx, 1);
      groups.splice(idx, 1);
      log.info(`Removed ${server}:${channel} (last channel — server dropped from batch).`);
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
      cells.push(`<span>Server: ${label}</span><span>|| Channels: ${count}</span>`);
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
  
  function initUI() {
  
    insertCss(styles);
  
    // create undiscord window
    ui.undiscordWindow = createElm(undiscordTemplate);
    document.body.appendChild(ui.undiscordWindow);
  
    // make the window draggable (header) and resizable (8 edge/corner handles)
    new Drag({ elm: ui.undiscordWindow, moveHandle: $('.header') });
  
    // create undiscord Trash icon as a floating action button
    ui.undiscordBtn = createElm(buttonHtml);
    ui.undiscordBtn.onclick = toggleWindow;
    document.body.appendChild(ui.undiscordBtn);
  
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
  
    // cached elements
    ui.logArea = $('#logArea');
    ui.autoScroll = $('#autoScroll');
    ui.progressMain = $('#progressBar');
    ui.progressIcon = ui.undiscordBtn.querySelector('progress');
    ui.percent = $('#progressPercent');
  
    // register event listeners
    $('#hide').onclick = toggleWindow;
    $('button#start').onclick = startAction;
    $('button#stop').onclick = stopAction;
    $('button#clear').onclick = () => ui.logArea.innerHTML = '';
    $('button#getAuthor').onclick = () => {
      const id = getAuthorId();
      if (id) $('input#authorId').value = id;
    };
    $('button#setGuild').onclick = () => {
      const guildId = getGuildId();
      if (!guildId) return;
      $('input#guildId').value = guildId;
      // For DMs, the channel ID is also needed (DMs have no server-wide concept).
      // For real servers, clear the channel input — overwriting Server = "wipe this whole server".
      if (guildId === '@me') {
        const channelId = getChannelId();
        $('input#channelId').value = channelId || '';
      } else {
        $('input#channelId').value = '';
      }
      renderQueue();
    };
    $('button#setChannel').onclick = () => {
      const channelId = getChannelId();
      const guildId = getGuildId();
      if (channelId) $('input#channelId').value = channelId;
      if (guildId) $('input#guildId').value = guildId;
      renderQueue();
    };
    // Add Server: append (currentServer, '') as a server-wide-wipe entry.
    $('button#addGuild').onclick = () => addPair(getGuildId(), '');
    // Add Channel: append (currentServer, currentChannel) as a specific-channel entry.
    $('button#addChannel').onclick = () => {
      const server = getGuildId();
      const channel = getChannelId();
      if (server && channel) addPair(server, channel);
    };
    // Del Server: remove the current server (and all its channels) from the batch.
    $('button#delGuild').onclick = () => {
      const server = getGuildId();
      if (server) removeServer(server);
    };
    // Del Channel: remove the current (server, channel) pair from the batch.
    $('button#delChannel').onclick = () => {
      const server = getGuildId();
      const channel = getChannelId();
      if (server && channel) removeChannel(server, channel);
    };
  
    // Live-update the queue counter when the user manually edits either input.
    $('input#guildId').addEventListener('input', renderQueue);
    $('input#channelId').addEventListener('input', renderQueue);
    renderQueue();
    // sync delays
    $('input#searchDelay').onchange = (e) => {
      const v = parseInt(e.target.value);
      if (v) {
        undiscordCore.options.searchDelay = v;
        undiscordCore.state._userSearchDelay = v; // retarget the decay baseline
      }
    };
    $('input#deleteDelay').onchange = (e) => {
      const v = parseInt(e.target.value);
      if (v) {
        undiscordCore.options.deleteDelay = v;
        undiscordCore.state._userDeleteDelay = v; // retarget the decay baseline
      }
    };
  
    $('input#searchDelay').addEventListener('input', (event) => {
      $('div#searchDelayValue').textContent = event.target.value + 'ms';
    });
    $('input#deleteDelay').addEventListener('input', (event) => {
      $('div#deleteDelayValue').textContent = event.target.value + 'ms';
    });
  
    // redirect console logs to inside the window after setting up the UI
    setLogFn(printLog);
  
    bindCoreEvents();
  }
  
  const LOG_MAX_ENTRIES = 1000; // trim oldest beyond this — prevents unbounded DOM growth on long wipes
  
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
  
  function bindCoreEvents() {
    undiscordCore.onStart = () => {
      $('#start').disabled = true;
      $('#stop').disabled = false;
      ui.undiscordBtn.classList.add('running');
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
      } else {
        ui.percent.innerHTML = '...';
        ui.progressIcon.removeAttribute('value');
        ui.progressMain.removeAttribute('value');
      }
  
      // Sync the slider to reflect any rate-limit bump/decay applied by core.
      $('input#searchDelay').value = undiscordCore.options.searchDelay;
      $('div#searchDelayValue').textContent = undiscordCore.options.searchDelay + 'ms';
      $('input#deleteDelay').value = undiscordCore.options.deleteDelay;
      $('div#deleteDelayValue').textContent = undiscordCore.options.deleteDelay + 'ms';
    };
  
    undiscordCore.onStop = () => {
      $('#start').disabled = false;
      $('#stop').disabled = true;
      ui.undiscordBtn.classList.remove('running');
      ui.progressMain.style.display = 'none';
      ui.percent.style.display = 'none';
    };
  }
  
  async function startAction() {
    // general
    const authorId = $('input#authorId').value.trim();
    const includeNsfw = $('input#includeNsfw').checked;
    // filter
    const content = $('input#search').value.trim();
    const hasLink = $('input#hasLink').checked;
    const hasFile = $('input#hasFile').checked;
    const includePinned = $('input#includePinned').checked;
    // message interval
    const minId = $('input#minId').value.trim();
    const maxId = $('input#maxId').value.trim();
    // date range
    const minDate = $('input#minDate').value.trim();
    const maxDate = $('input#maxDate').value.trim();
    // advanced
    const searchDelay = parseInt($('input#searchDelay').value.trim());
    const deleteDelay = parseInt($('input#deleteDelay').value.trim());
  
    // token (auto-fetched, no manual input)
    const authToken = fillToken();
    if (!authToken) return; // fillToken already logs an error.
  
    // Build the target list from the two parallel CSVs.
    const { targets, orphans } = parseTargets();
    if (!targets.length) return log.error('You must fill the "Server ID" field!');
    if (orphans) log.warn(`${orphans} channel entr${orphans === 1 ? 'y has' : 'ies have'} no server and will be skipped. Channels need a parent server.`);
  
    // clear logArea
    ui.logArea.innerHTML = '';
  
    undiscordCore.resetState();
    // Common options applied to every job. guildId/channelId are set per-job below.
    undiscordCore.options = {
      ...undiscordCore.options,
      authToken,
      authorId,
      minId: minId || minDate,
      maxId: maxId || maxDate,
      content,
      hasLink,
      hasFile,
      includeNsfw,
      includePinned,
      searchDelay,
      deleteDelay,
    };
  
    if (targets.length === 1) {
      undiscordCore.options.guildId = targets[0].guildId;
      undiscordCore.options.channelId = targets[0].channelId; // '' = server-wide
      try { await undiscordCore.run(); }
      catch (err) { log.error('CoreException', err); undiscordCore.stop(); }
    } else {
      try { await undiscordCore.runBatch(targets); }
      catch (err) { log.error('CoreException', err); }
    }
  }
  
  function stopAction() {
    undiscordCore.stop();
  }
  
  
  __exports.default = initUI;
};

__modules["src/index.js"] = (__exports) => {
  const initUI = __require("src/undiscord-ui.js").default;
  initUI();
  
};

__require("src/index.js");
})();
