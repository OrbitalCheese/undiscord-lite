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

export default UndiscordCore;
