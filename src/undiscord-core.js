import {
  log,
  msToHMS,
  escapeHTML,
  queryString,
  askYesNo,
  toSnowflake,
} from './helpers.js';

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
    streamerMode: false, // redact message content AND author usernames in the confirmation preview and per-delete log
    // When set, run() pulls pages from this source's fetchPage() instead of
    // calling Discord's search API. Used by the data-export import flow to
    // skip the search phase entirely. See src/export-import.js#ImportSource.
    importSource: null,
  };

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
      // (Import mode populates synchronously, but the bail check is harmless.)
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

        // Import-mode short-circuit: an exhausted ImportSource means we've handed
        // out every record we have. There's no search index to wait on, so the
        // empty-page-retry budget doesn't apply — finalize immediately.
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

      // Wait before next page (gives Discord's search index time to catch up).
      // Skipped in import mode — there's no API call to pace, so trailing waits
      // would just stretch the wipe for no gain.
      if (!this.options.importSource) {
        log.verb(`Waiting ${(this.options.searchDelay / 1000).toFixed(2)}s before next page...`);
        await this.#wait(this.options.searchDelay);
      }

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
    // Import mode: only deleteDelay applies — there's no per-page search cost,
    // so the formula collapses to (deletes left × delay between deletes).
    if (this.options.importSource) {
      this.stats.etr = remaining * this.options.deleteDelay;
      return;
    }
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

export default UndiscordCore;
