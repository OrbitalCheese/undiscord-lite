// ============================================================================
// GENERAL UTILITIES
// ----------------------------------------------------------------------------
// Pure functions for parsing user input, building filter predicates, and
// formatting display strings. No DOM access; no module state.
// ============================================================================

/** Splits a comma-separated string into a trimmed array with empty fragments dropped. Returns [] for null/undefined/empty input. */
export function parseCsvList(str) {
  if (str == null) return [];
  const s = String(str).trim();
  if (!s) return [];
  return s.split(/\s*,\s*/).filter(Boolean);
}

/** Returns a `(content) => boolean` predicate matching `term` either as a case-insensitive substring (default) or as a standalone word ('exact' mode). Returns null when `term` is empty. */
export function buildContentMatcher(term, mode) {
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
export function buildExtensionMatcher(extensions) {
  if (!extensions?.length) return null;
  const set = new Set(extensions);
  return (attachments) => !!attachments?.some(a => {
    const name = a.filename || a.url || '';
    const m = name.toLowerCase().match(/\.([a-z0-9]+)(?:[?#]|$)/);
    return m && set.has(m[1]);
  });
}

/** Formats a millisecond duration as a "Xh Ym Zs" string. */
export const msToHMS = s => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;

/** HTML-escapes a value (& < " ') for safe injection into innerHTML. */
export const escapeHTML = html => String(html).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\'': '&#039;' })[m]);

/** Emits the `.sm-real / .sm-redacted` dual-span used by streamer-mode log redaction. CSS at panel scope shows exactly one of the two spans depending on whether `.streamer-on` is set, so toggling streamer mode instantly re-renders every already-printed log line. The real value is HTML-escaped; the placeholder defaults to '••••' (callers pass e.g. '[ATTACHMENTS]' for non-ID redactions). */
export function redactHtml(real, placeholder = '••••') {
  return `<span class="sm-real">${escapeHTML(String(real))}</span><span class="sm-redacted">${escapeHTML(placeholder)}</span>`;
}

/** Joins a `[[key, value], ...]` array into a URL query string, skipping pairs whose value is undefined. Values are URL-encoded. */
export const queryString = params => params.filter(p => p[1] !== undefined).map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&');

/** Async window.confirm() — yields one event-loop tick so queued log writes can paint before the modal blocks the thread. */
export const askYesNo = async msg => new Promise(resolve => setTimeout(() => resolve(window.confirm(msg)), 10));

/** Converts a datetime-local string ("YYYY-MM-DDTHH:MM") to a Discord snowflake ID. Plain numeric strings pass through unchanged. Pre-epoch values clamp to 0. */
export const toSnowflake = (date) => {
  if (!/:/.test(date)) return date;
  const offset = new Date(date).getTime() - 1420070400000;
  return Math.max(0, offset) * Math.pow(2, 22);
};

/** Inverse of toSnowflake — returns the millisecond Unix timestamp embedded in a Discord snowflake. BigInt avoids precision loss on the 64-bit ID. */
export const snowflakeToMs = (sn) => Number((BigInt(sn) >> 22n) + 1420070400000n);


// ============================================================================
// DOM HELPERS
// ----------------------------------------------------------------------------
// Thin wrappers around DOM construction primitives.
// ============================================================================

/** Parses an HTML fragment string into a single root element and returns it. */
export function createElm(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.removeChild(temp.firstElementChild);
}

/** Appends a `<style>` element with the given CSS to `<head>` and returns the element. */
export function insertCss(css) {
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
export const setLogFn = (fn) => logFn = fn;

export const log = {
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
export function getToken() {
  window.dispatchEvent(new Event('beforeunload'));
  return withIframeLocalStorage(ls => JSON.parse(ls.token));
}

/** Returns the current user's snowflake ID from Discord's localStorage cache. */
export function getAuthorId() {
  return withIframeLocalStorage(ls => JSON.parse(ls.user_id_cache));
}

/** Returns the current guild ID from the URL, or '@me' on the friends tab. Alerts and returns null when no channel/server context can be parsed. */
export function getGuildId() {
  const m = location.href.match(CHANNEL_URL_RE);
  if (m) return m[1];
  alert('Could not find the Guild ID!\nPlease make sure you are on a Server or DM.');
  return null;
}

/** Returns the current channel ID from the URL. Alerts and returns null when no channel is open. */
export function getChannelId() {
  const m = location.href.match(CHANNEL_URL_RE);
  if (m && m[2]) return m[2];
  alert('Could not find the Channel ID!\nPlease make sure you are on a Channel or DM.');
  return null;
}

/** Returns the Discord auth token, or '' on failure (with an error logged). */
export function fillToken() {
  try {
    return getToken();
  } catch (err) {
    log.verb(err);
    log.error('Could not automatically detect Authorization Token!');
    log.info('Please make sure Undiscord Lite is up to date');
  }
  return '';
}
