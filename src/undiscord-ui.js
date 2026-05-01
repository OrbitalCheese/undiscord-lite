const LOG_PREFIX = '[UNDISCORD-LITE]';

import styles from './ui/styles.css';
import undiscordTemplate from './ui/undiscord.html';

import UndiscordCore from './undiscord-core';
import Drag from './ui/drag';
import {
  createElm, insertCss, log, setLogFn, msToHMS,
  getAuthorId, getGuildId, getChannelId, fillToken,
} from './helpers';

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

export default initUI;