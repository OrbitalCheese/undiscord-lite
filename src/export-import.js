// ---------- Discord data-export import ----------
//
// Parses an unzipped Discord data-export folder (the contents of `messages/`
// inside the ZIP Discord ships) into a flat list of (channelId, messageId, ...)
// records, and exposes an `ImportSource` that the run loop can consume in place
// of Discord's search API.
//
// Why this exists: Discord's search-based wipe spends ~45s per page on the
// search call. If the user already has a complete index of their messages
// (the data export), we can skip search entirely and go straight to delete —
// roughly 3-5x faster for large wipes, with no "search index lag" failure
// modes. See README's Privacy section: parsing happens locally; nothing is
// uploaded.
//
// Folder shape (post-extraction):
//   messages/
//     index.json              ← { "<channelId>": "<display string>", ... }   (optional)
//                                where <display string> is "<channel> in <guild>" for guild
//                                channels and "Direct Message with <user>#<discriminator>" for DMs.
//                                The DM string is the only place the friend's username appears —
//                                channel.json's recipients field carries user IDs only.
//     c<channelId>/
//       channel.json          ← channel metadata (optional but preferred — see shapes in parseExport())
//       messages.json         ← array of { ID, Timestamp, Contents, Attachments }
//
// Both casings are tolerated for message field names (Discord's exporter has
// shipped both `ID`/`id` and `Contents`/`content` over the years).

// Walks a list of `File` objects (from `<input webkitdirectory>` or `multiple`)
// and returns a flat record per message plus aggregate metadata for the UI's
// summary line.
//
// Throws on hard parse failures (bad JSON, no c<id>/ folders found) so the
// caller can surface a clear error to the user. Per-channel issues that don't
// invalidate the rest of the import are skipped silently.
export async function parseExport(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('No files selected.');
  }

  // Top-level index.json (under messages/) maps channel ID → human-readable
  // name. Optional — falls back to channel.json's `name` then "c<id>" stub.
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
    if (!slot.messages) continue; // bare folder with no messages.json — skip

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
    // username is available from index.json's "Direct Message with NAME#0"
    // string. Group DMs may have a user-set `name` (or null for unnamed).
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
        recipientIds, // string IDs of every channel participant — used by the import-mode "Exclude User" filter for DM/GROUP_DM matching
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

// `webkitRelativePath` is the folder-pick path (e.g. "messages/c123/messages.json").
// Falls back to `name` for plain `multiple` selections so the parser still works
// when the user shift-selects files without folder support.
function relPath(file) {
  return file.webkitRelativePath || file.name;
}

// Discord exports timestamps as "YYYY-MM-DD HH:MM:SS" (no `T`, no `Z`) — and
// the values are UTC, verified against the snowflake the message ID encodes.
// Plain `new Date("YYYY-MM-DD HH:MM:SS")` in JavaScript parses that as LOCAL
// time, which silently shifts every imported timestamp by the user's TZ
// offset. Normalising to ISO-with-Z here ensures every downstream parse
// (filter pre-pass, oldest/newest summary, per-delete log timestamps) gets
// the correct UTC instant. Already-ISO inputs (T-separator or trailing Z /
// numeric offset) are passed through unchanged so future export formats keep
// working without a code change here.
function normalizeExportTs(str) {
  if (!str || typeof str !== 'string') return str;
  // Has T separator OR trailing Z OR ±HH:MM offset → trust it.
  if (/T/.test(str) || /Z$/.test(str) || /[+-]\d\d:?\d\d$/.test(str)) return str;
  // SQL-style "YYYY-MM-DD HH:MM:SS" → ISO UTC.
  return str.replace(' ', 'T') + 'Z';
}

// index.json's value for a DM channel looks like "Direct Message with USER#0".
// Pull the username out (Discord's discriminator is always #0 since the 2023
// username migration; we strip it regardless to be safe). Returns null when
// the entry is missing or doesn't match the expected prefix.
function extractDmFriendName(indexValue) {
  if (typeof indexValue !== 'string') return null;
  const m = indexValue.match(/^Direct Message with (.+?)(?:#\d+)?$/);
  return m ? m[1] : null;
}

// Builds a per-guild / per-DM breakdown of an imported set, returned as an
// array of pre-formatted log lines for the UI to print verbatim. Sorted by
// message count (desc) within each group so the heaviest sources surface first.
//
// Output shape:
//   "Server: <name> | Channels: <N> | Messages: <total>"
//   "DM:     <friend>                 | Messages: <total>"
//   "Group DM: <name or count>        | Messages: <total>"
//   "Unknown channel: <id>            | Messages: <total>"   (channel.json missing)
export function summarizeImport(parsed) {
  // Group by (kind, key). Guilds aggregate by guildId; DMs/groups stay per-channel.
  const guilds = new Map();   // guildId -> { name, channels:Set<channelId>, count }
  const dms = new Map();      // channelId -> { friend, count }
  const groups = new Map();   // channelId -> { name, recipientCount, count }
  const unknown = new Map();  // channelId -> count

  for (const m of parsed.messages) {
    if (m.type === 'GUILD_TEXT' || (m.guildId && m.type !== 'DM' && m.type !== 'GROUP_DM')) {
      // Threads, voice text, announcements, etc. all roll up under their parent guild.
      const key = m.guildId || `unknown-guild-for-${m.channelId}`;
      if (!guilds.has(key)) guilds.set(key, { name: m.guildName || 'Unknown Server', channels: new Set(), count: 0 });
      const g = guilds.get(key);
      g.channels.add(m.channelId);
      g.count++;
      // Late-arriving guild name (in case earlier messages had it null and later ones don't)
      if (!g.name && m.guildName) g.name = m.guildName;
    } else if (m.type === 'DM') {
      if (!dms.has(m.channelId)) dms.set(m.channelId, { friend: m.dmFriendName || `(unknown — ${m.channelId})`, count: 0 });
      dms.get(m.channelId).count++;
    } else if (m.type === 'GROUP_DM') {
      if (!groups.has(m.channelId)) groups.set(m.channelId, { name: m.channelName, recipientCount: m.recipientCount, count: 0 });
      groups.get(m.channelId).count++;
    } else {
      // Channel.json missing or type unrecognized — show what we have.
      if (!unknown.has(m.channelId)) unknown.set(m.channelId, 0);
      unknown.set(m.channelId, unknown.get(m.channelId) + 1);
    }
  }

  const lines = [];

  const sortedGuilds = [...guilds.values()].sort((a, b) => b.count - a.count);
  for (const g of sortedGuilds) {
    lines.push(`Server: ${g.name} | Channels: ${g.channels.size} | Messages: ${g.count.toLocaleString()}`);
  }

  const sortedDms = [...dms.values()].sort((a, b) => b.count - a.count);
  for (const d of sortedDms) {
    lines.push(`DM: ${d.friend} | Messages: ${d.count.toLocaleString()}`);
  }

  const sortedGroups = [...groups.values()].sort((a, b) => b.count - a.count);
  for (const g of sortedGroups) {
    const label = g.name || `Group DM (${g.recipientCount} people)`;
    lines.push(`Group DM: ${label} | Messages: ${g.count.toLocaleString()}`);
  }

  if (unknown.size) {
    const total = [...unknown.values()].reduce((s, n) => s + n, 0);
    lines.push(`Unknown channel kind: ${unknown.size} channel${unknown.size === 1 ? '' : 's'} | Messages: ${total.toLocaleString()}`);
  }

  return lines;
}

// Discord's export stores Attachments as a comma- or whitespace-separated list
// of CDN URLs. Inflate to the {url, content_type} shape filterResponse expects
// for its excludeImage/Video/Sound checks. Content type is inferred from the
// URL extension — good enough for the filter pass; not a perfect match for
// Discord's authoritative MIME, but the post-search filter doesn't require it.
function parseAttachments(raw) {
  if (!raw) return [];
  const urls = String(raw).split(/[\s,]+/).filter(Boolean);
  return urls.map(url => ({ url, content_type: inferContentType(url) }));
}

function inferContentType(url) {
  const ext = (url.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/) || [])[1];
  if (!ext) return 'application/octet-stream';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(ext)) return `image/${ext}`;
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext))                 return `video/${ext}`;
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'opus'].includes(ext))         return `audio/${ext}`;
  return 'application/octet-stream';
}

// Drop-in replacement for the search() side of the run loop. Holds the parsed
// message list and a cursor; each fetchPage(core) call assigns the next slice
// into core.state._searchResponse using the same shape Discord's search API
// returns (so filterResponse() works unchanged).
//
// Pagination preserves the existing run-loop semantics: confirmation prompt
// only sees the first page, ETR's running mean still converges, progress bar
// updates per-page just like a search-mode run.
export class ImportSource {
  static PAGE_SIZE = 50;

  constructor(messages) {
    this.messages = messages;
    this.cursor = 0;
  }

  // True once every imported record has been emitted at least once. The run
  // loop checks this on empty pages to short-circuit the empty-page-retry
  // budget — there's no search index to wait on in import mode.
  get exhausted() {
    return this.cursor >= this.messages.length;
  }

  // Mirror of UndiscordCore.search(): populate core.state._searchResponse with
  // the next page. Each message is wrapped in a single-element conversation
  // array with hit:true, matching Discord's `messages: [[{hit, ...}, ...]]` shape.
  fetchPage(core) {
    const slice = this.messages.slice(this.cursor, this.cursor + ImportSource.PAGE_SIZE);
    this.cursor += slice.length;
    core.state._searchResponse = {
      total_results: this.messages.length,
      messages: slice.map(m => [toApiShape(m)]),
    };
  }
}

// Synthesize a Discord-API-shaped message from an export record. Fields the
// export doesn't carry (mentions, embeds, author info, etc.) are stubbed with
// safe defaults — filterResponse's exclude-* paths gracefully handle empty
// arrays / falsy fields. Author is a placeholder ("imported#0") since the
// export's per-message author info is implicit (your account, by definition).
function toApiShape(m) {
  return {
    hit: true,
    id: m.messageId,
    channel_id: m.channelId,
    type: 0,                                  // regular user message — passes filterResponse's type filter
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
