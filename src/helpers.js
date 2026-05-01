// Shared helpers — utility functions, DOM helpers, the log facade,
// and Discord-specific extractors (token, IDs).

// ---------- General utilities ----------

export const msToHMS = s => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;
export const escapeHTML = html => String(html).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', '\'': '&#039;' })[m]);
export const queryString = params => params.filter(p => p[1] !== undefined).map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&');
// Async wrapper around window.confirm. The 10ms setTimeout lets queued log writes
// paint before the blocking modal pops. Returns true on OK, false on Cancel.
export const askYesNo = async msg => new Promise(resolve => setTimeout(() => resolve(window.confirm(msg)), 10));
export const toSnowflake = (date) => /:/.test(date) ? ((new Date(date).getTime() - 1420070400000) * Math.pow(2, 22)) : date;

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
// the parent origin's storage and is the standard workaround. The iframe is
// removed after the read so we don't accumulate orphan nodes.
function withIframeLocalStorage(read) {
  const f = document.body.appendChild(document.createElement('iframe'));
  try { return read(f.contentWindow.localStorage); }
  finally { f.remove(); }
}

const CHANNEL_URL_RE = /channels\/([\w@]+)\/(\d+)/;

export function getToken() {
  window.dispatchEvent(new Event('beforeunload'));
  try {
    return withIframeLocalStorage(ls => JSON.parse(ls.token));
  } catch {
    log.info('Could not automatically detect Authorization Token in local storage!');
    log.info('Attempting to grab token using webpack');
    return (window.webpackChunkdiscord_app.push([[''], {}, e => { window.m = []; for (let c in e.c) window.m.push(e.c[c]); }]), window.m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken();
  }
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
