// ============================================================================
// UNDISCORD-LITE — UI LAYER
// ----------------------------------------------------------------------------
// Owns the panel HTML, CSS, every event binding, and the two run orchestrators
// (search-mode startAction / import-mode startImportAction). All Discord page
// I/O — token, URL parsing, server-bar injection, point-and-click ID capture —
// happens here. The delete pipeline itself lives in undiscord-core.js.
// ============================================================================

const LOG_PREFIX = '[UNDISCORD-LITE]';

import styles from './ui/styles.css';
import undiscordTemplate from './ui/undiscord.html';

import UndiscordCore from './undiscord-core';
import Drag from './ui/drag';
import { parseExport, summarizeImport, ImportSource } from './export-import';
import {
  createElm, insertCss, log, setLogFn, msToHMS,
  getAuthorId, getGuildId, getChannelId, fillToken, snowflakeToMs,
  parseCsvList, buildContentMatcher, buildExtensionMatcher,
} from './helpers';


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
// When set, startAction() routes through startImportAction() and the General /
// Search filter / Delete filter UI sections grey out (CSS via .import-mode).
let importedSet = null;

// One-shot log message printed right after the "Started at..." line. Used by
// startAction to surface notices that would otherwise be wiped by the log-clear
// it does just before kicking off the run. Consumed (and cleared) by onStart.
let pendingStartNotice = null;

// Current batch position, surfaced by core.onJob during a runBatch loop. Reset
// to {1, 1} at the start of each run so single-job runs (which never call
// onJob) display "Job 1/1" in the top bar instead of leftover values.
let currentJobInfo = { i: 1, n: 1 };

/** Streamer-mode redaction. Returns '••••' when the Streamer mode toggle is on, the value as-is otherwise. '@me' passes through verbatim — it's a literal Discord URL token, not a sensitive ID, and the queue-management logs read clearer with it intact. Empty / null inputs pass through so callers don't have to null-guard. */
function dot(v) {
  if (v == null || v === '') return v;
  if (!$('input#streamerMode')?.checked) return v;
  if (v === '@me') return '@me';
  return '••••';
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

/** Parses the Server / Channel inputs into a flat `[{guildId, channelId}, ...]` target list. Channel entries with no parent server (orphans) are counted but not included in the list. */
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
      "Click <b>Select</b> and then click a server icon in Discord to capture its ID — hold Shift to capture several in a row. Pasting one or more snowflake-shaped IDs appends with deduplication.",
      "Matches against each message's <code>guildId</code> as recorded in <code>channel.json</code>. <b>Use <code>@me</code></b> to drop every DM and group DM in one go (they all carry <code>guildId=@me</code>).",
      "Servers in the export but not currently joined still match — the filter is purely client-side against the export data.",
    ],
  },
  importExcludeChannel: {
    name: 'Import — Exclude Channel',
    lines: [
      "Drop specific <b>channels</b> from the import. Comma-separate any number of channel IDs (works for guild channels, DMs, and group DMs alike — they all use the same snowflake format).",
      "Click <b>Select</b> and then click a channel in the sidebar (or any message inside one) to capture its ID — hold Shift to capture several in a row.",
      "Matches against each message's <code>channelId</code>. Independent of <b>Exclude Server</b> — a channel listed here is dropped even if its parent server isn't excluded.",
    ],
  },
  importExcludeUser: {
    name: 'Import — Exclude DM with User',
    lines: [
      "Drop <b>DMs</b> and <b>group DMs</b> that include the listed user(s) as participants. Comma-separate any number of User IDs.",
      "Click <b>Select</b> and then click an avatar / username / message author in Discord to capture the User ID — hold Shift to capture several in a row.",
      "Matches against the channel's <code>recipients</code> list (from <code>channel.json</code>). For group DMs, any single matched recipient drops the whole group.",
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
      const elapsed = msToHMS(Date.now() - stats.startTime.getTime());
      const remaining = msToHMS(stats.etr);
      ui.topBarSlot.innerHTML =
        `<span class="status-line status-running">Deleting... ` +
        `| (${value}/${max}) ${percent} ` +
        `| Failures: ${state.failCount} ` +
        `| Job ${currentJobInfo.i}/${currentJobInfo.n} |</span>`;
      ui.footerTime.textContent = `Elapsed ${elapsed} · Remaining ${remaining}`;
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
    ui.footerTime.textContent = ''; // clear elapsed/remaining when idle
    renderTopBar();
  };
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
    servers: 0, channels: 0, dmUsers: 0,
    dateInterval: 0,
    text: 0, links: 0,
    mentions: 0, everyone: 0,
    attachments: 0, extensions: 0,
  };
  const filtered = [];
  for (const m of messages) {
    // Import-only exclusions — checked first since matching here drops the
    // record cheaply before any content / regex scanning.
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
// startAction (▶︎ Delete button) reads every form input, validates, captures
// the auth token, parses the queue, expands jobs across (target × author),
// runs a permission pre-flight, and dispatches to undiscordCore.run() (single
// target+author) or undiscordCore.runBatch() (multiple jobs). Routes to
// startImportAction() when an export has been imported.
// ============================================================================

/** Import-mode entry point — peer of startAction(). Pre-filters the imported set with every applicable filter, then hands a single synthetic job carrying an ImportSource into core. */
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

  const authToken = fillToken();
  if (!authToken) return; // fillToken already logs an error.

  const deleteDelay = getDelayMs('deleteDelay');
  const streamerMode = $('input#streamerMode').checked;

  ui.logArea.innerHTML = '';

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
  });

  const skipped = importedSet.messages.length - filtered.length;
  log.info(`Import-mode run: ${filtered.length.toLocaleString()} messages queued${skipped ? ` (${skipped.toLocaleString()} skipped)` : ''}.`);

  // Breakdown lines — show every category that either (a) caught at least one
  // record, or (b) the user explicitly configured (so a configured-but-zero
  // filter is visible too, confirming "yes, your filter ran and matched 0").
  // Categories that are neither configured nor matched stay hidden.
  const dateConfigured = (minMs > -Infinity) || (maxMs < Infinity);
  const breakdown = [
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

/** Search-mode entry point. Reads every form input, validates, captures the auth token, parses the queue, expands jobs across (target × author), runs a permission pre-flight, and dispatches into core. Routes to startImportAction() when an export has been imported. */
async function startAction() {
  if (importedSet) return startImportAction();

  // Edge case: empty Author ID. Fill the UI field with your own ID so the
  // rest of startAction sees a populated input. The notice itself is deferred
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

  // ---- Token + queue ----
  const authToken = fillToken();
  if (!authToken) return; // fillToken already logs an error.

  const { targets, orphans } = parseTargets();
  if (!targets.length) return log.error('You must fill the "Server ID" field!');
  if (orphans) log.warn(`${orphans} channel entr${orphans === 1 ? 'y has' : 'ies have'} no server and will be skipped. Channels need a parent server.`);

  const { jobs, warnings } = expandJobs(targets, authorList);
  for (const w of warnings) log.warn(w);

  // Pre-flight permission check: any non-DM job with a non-self author needs
  // Manage Messages or Administrator on its target server. One API call total.
  const ok = await checkBatchPermissions(jobs, authToken);
  if (!ok) return;

  ui.logArea.innerHTML = '';

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

/** Click handler for the 🛑 Stop button. Forwards to core.stop(). */
function stopAction() {
  undiscordCore.stop();
}

export default initUI;
