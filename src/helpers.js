// ---------- General utilities ----------

export const msToHMS = s => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;
export const escapeHTML = html => String(html).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\'': '&#039;' })[m]);
export const queryString = params => params.filter(p => p[1] !== undefined).map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&');
// 10ms setTimeout lets queued log writes paint before the blocking modal pops.
export const askYesNo = async msg => new Promise(resolve => setTimeout(() => resolve(window.confirm(msg)), 10));
// Convert a datetime-local string ("YYYY-MM-DDTHH:MM") to a Discord snowflake.
// Plain numeric strings pass through unchanged (already a snowflake).
// Negative offsets get clamped to 0 because Discord rejects negative snowflakes,
// and datetime-local is interpreted in the user's local timezone — eastern offsets
// can place "2015-01-01T00:00" before Discord's UTC epoch.
export const toSnowflake = (date) => {
  if (!/:/.test(date)) return date;
  const offset = new Date(date).getTime() - 1420070400000;
  return Math.max(0, offset) * Math.pow(2, 22);
};

// Inverse of toSnowflake — extract the millisecond timestamp embedded in a
// snowflake. Used by the import-mode pre-pass to apply the user's Messages
// interval bounds to a flat (channel, message) list pulled from the data export.
// BigInt handles 64-bit snowflakes without precision loss; the final Number()
// cast is safe because timestamps fit in 53 bits well into the year 287000.
export const snowflakeToMs = (sn) => Number((BigInt(sn) >> 22n) + 1420070400000n);

// ---------- DOM helpers ----------

export function createElm(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.removeChild(temp.firstElementChild);
}

export function insertCss(css) {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
  return style;
}

// ---------- Log facade ----------

let logFn;
export const setLogFn = (fn) => logFn = fn;
export const log = {
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
export function getToken() {
  window.dispatchEvent(new Event('beforeunload'));
  return withIframeLocalStorage(ls => JSON.parse(ls.token));
}

export function getAuthorId() {
  return withIframeLocalStorage(ls => JSON.parse(ls.user_id_cache));
}

export function getGuildId() {
  const m = location.href.match(CHANNEL_URL_RE);
  if (m) return m[1];
  alert('Could not find the Guild ID!\nPlease make sure you are on a Server or DM.');
  return null;
}

export function getChannelId() {
  const m = location.href.match(CHANNEL_URL_RE);
  if (m) return m[2];
  alert('Could not find the Channel ID!\nPlease make sure you are on a Channel or DM.');
  return null;
}

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
