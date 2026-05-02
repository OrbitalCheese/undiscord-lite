const LOG_PREFIX = '[UNDISCORD-LITE]';

import styles from './ui/styles.css';
import undiscordTemplate from './ui/undiscord.html';

import UndiscordCore from './undiscord-core';
import Drag from './ui/drag';
import { parseExport, summarizeImport, ImportSource } from './export-import';
import {
  createElm, insertCss, log, setLogFn, msToHMS,
  getAuthorId, getGuildId, getChannelId, fillToken, snowflakeToMs,
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

// Loaded Discord data export (post-parse). Null when no import is active.
// Shape: { messages, channelCount, oldestTs, newestTs } as returned by parseExport().
// When set, startAction() routes through startImportAction() and the General /
// Search filter / Delete filter UI sections grey out (CSS via .import-mode).
let importedSet = null;

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
  // Add Server queues (currentServer, '') as a server-wide wipe; the current
  // server is read from Discord's URL. Point-and-click capture for the same
  // input lives below under the Select bindings.
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

  // Import data export — folder picker, summary, clear button.
  bindImportControls();

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
  // the relevant ID. Hold Shift to capture multiple in a row without exiting.
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
      "Right-click any message → <b>Copy Message Link</b>, paste into either field. The script auto-strips the URL down to just the ID.",
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
    name: 'Advanced settings',
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
      "Non-self authors require <i>Manage Messages</i> permission on their target server. A pre-flight check runs once at the top of the batch and aborts early if any pair lacks it.",
      "DMs are excluded from multi-author batching — Discord only lets you delete your own DM messages, so each DM target spawns one self-author job regardless of how many IDs are in the list.",
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
      "Click <b>Add DM's</b> to queue every 1:1 DM channel currently open in your sidebar. Group DMs are skipped by default — toggle the <b>group DMs</b> pill (red/off &rarr; green/on) to include them too.",
      "Click <b>Clear DM's</b> to remove every queued DM at once.",
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
  importExport: {
    name: 'Import data export',
    lines: [
      "Pre-load message IDs from your Discord data export and skip the search phase entirely. Roughly <b>3-5x faster</b> than search-mode on large wipes, with no risk of \"search index lag\" empty-page failures.",
      "<b>How to get an export:</b> Discord settings &rarr; Privacy &amp; Safety &rarr; <b>Request All My Data</b>. Discord emails you a ZIP after a few minutes (sometimes a few days). Unzip it locally — inside is a <code>messages/</code> folder.",
      "<b>How to use it:</b> Click <b>Select Folder...</b> and pick that <code>messages/</code> folder. The summary line fills in (total messages, channel count, oldest/newest date). Set Date or Messages interval if you want to bound the wipe. Click <b>▶︎ Delete</b>.",
      "<b>What still applies:</b> Date interval, Messages interval, Delete delay, Streamer mode. Pre-pass filters the imported set by date / snowflake before the run starts.",
      "<b>What doesn't apply:</b> Author / Server / Channel / DMs queue, Search filter, Delete filter (most categories rely on data the export doesn't carry — mentions, embeds, pin status). Those sections grey out when an import is loaded.",
      "<b>Edge cases:</b> Already-deleted messages return 404 (counted as failed but harmless). Channels you've lost access to (banned, deleted, etc) return 403 (same).",
      "<b>Privacy:</b> the export is parsed in-browser. Nothing is uploaded — there is no code path that sends imported data anywhere. The export contains every DM you've ever had; don't commit <code>messages/</code> to a git repo (the bundled <code>.gitignore</code> covers this).",
      "Click <b>Clear Import</b> to drop the loaded set and return to live-search mode.",
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
//   - Shift down/up toggles the shift-lock visual on the active button (light
//     purple while held, amber otherwise — see .shift-locked rule in styles.css).
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

// ---- Import data export ----

// Wires the file picker, the Clear-import button, and renders the summary line.
// Idempotent: safe to call once on init. The picker's <input> is hidden — the
// visible Select Folder... button just triggers a click on it (browser-standard
// pattern for getting a styled file picker without an ugly default).
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
    for (const line of summarizeImport(parsed)) log.info(`› ${line}`);
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

function renderImportSummary() {
  const el = $('#importSummary');
  if (!importedSet) {
    el.textContent = 'No import loaded.';
    return;
  }
  const { messages, channelCount, oldestTs, newestTs } = importedSet;
  const fmt = (ts) => ts ? new Date(ts).toISOString().slice(0, 10) : '—';
  el.textContent = `Imported ${messages.length.toLocaleString()} messages across ${channelCount} channel${channelCount === 1 ? '' : 's'} · oldest ${fmt(oldestTs)} · newest ${fmt(newestTs)}`;
}

// Import-mode entry point — peer of startAction(). Skips the queue, permission
// check, and most filter inputs; pre-filters the imported set by Date/Messages
// interval; builds a single synthetic job carrying an ImportSource into core.
async function startImportAction() {
  if (!importedSet) return log.error('Import mode active but no imported set — clear and re-import.');

  // Date / Messages interval: applied as a client-side pre-pass against each
  // record's ISO timestamp. Messages interval (snowflake range) wins when both
  // are set, mirroring search-mode precedence in startAction below.
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

  const filtered = importedSet.messages.filter(m => {
    const ts = new Date(m.timestamp).getTime();
    return Number.isFinite(ts) && ts >= minMs && ts <= maxMs;
  });

  if (filtered.length === 0) {
    return log.error(`Filters left zero messages from the import (had ${importedSet.messages.length}). Adjust Date or Messages interval, or click "All".`);
  }

  const authToken = fillToken();
  if (!authToken) return; // fillToken already logs an error.

  const deleteDelay = getDelayMs('deleteDelay');
  const streamerMode = $('input#streamerMode').checked;

  ui.logArea.innerHTML = '';

  undiscordCore.resetState();
  // Reset every search-mode field on options so nothing leaks across modes,
  // then plug in the import source. searchDelay isn't consulted in import mode
  // but is set to 0 defensively in case downstream code reads it.
  undiscordCore.options = {
    ...undiscordCore.options,
    authToken,
    importSource: new ImportSource(filtered),
    authorId: '',
    guildId: '',
    channelId: '',
    minId: '',
    maxId: '',
    content: '',
    hasLink: false, hasImage: false, hasVideo: false, hasSound: false,
    hasSticker: false, hasPoll: false, hasEmbed: false, hasForward: false,
    mentions: '',
    mentionEveryone: false,
    pinnedMode: 'include',  // export records have no pin metadata; "include" is the no-op
    excludeContent: '',
    excludeLink: false, excludeImage: false, excludeVideo: false, excludeSound: false,
    excludeSticker: false, excludePoll: false, excludeEmbed: false, excludeForward: false,
    excludeMentions: '',
    excludeMentionEveryone: false,
    searchDelay: 0,
    deleteDelay,
    streamerMode,
  };

  const skipped = importedSet.messages.length - filtered.length;
  log.info(`Import-mode run: ${filtered.length.toLocaleString()} messages queued${skipped ? ` (${skipped.toLocaleString()} skipped by Date / Messages interval)` : ''}.`);

  try { await undiscordCore.run(); }
  catch (err) { log.error('CoreException', err); undiscordCore.stop(); }
  finally {
    // Drop the source reference so a subsequent search-mode run starts clean.
    undiscordCore.options.importSource = null;
  }
}

// Click handler for the ▶︎ Delete button. Reads every form input, captures the
// auth token, parses the queue, expands jobs across (target × author), runs a
// pre-flight permission check, and dispatches to undiscordCore.run() (single
// target+author) or undiscordCore.runBatch() (multiple jobs).
//
// Routes to startImportAction() when an export has been imported.
async function startAction() {
  if (importedSet) return startImportAction();
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
    importSource: null, // defensive — make sure a stale import source from a prior run doesn't leak in
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

export default initUI;