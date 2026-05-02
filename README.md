# Undiscord Lite

Bulk-delete your messages in Discord servers, channels, and DMs. A zero-dependency rewrite of [victornpb/undiscord](https://github.com/victornpb/undiscord).

## What's new

- **Zero npm dependencies.** The build is a single ~250-line Node script — no rollup, no plugins, no `node_modules`. The bundled userscript runs with no external dependencies, so there's nothing to audit beyond the file itself.

- **Multi-server / multi-channel batching** with `Add` / `Select` / `Delete` controls and a live queue display. The original technically supported batching — comma-separated channel IDs in one input — but it was undocumented and miserable to use manually. Dedicated buttons and a smarter queue let you mix entire-server wipes with channel-specific entries however you want.

- **Point-and-click ID capture.** Hit `Select` on any field, then click an avatar / message / server icon / channel in Discord — the relevant ID drops into the field. Hold Shift to capture several in a row. Faster than Developer Mode + Copy ID for everything except cross-server lookups.

- **Discord data export import.** Pre-load message IDs from your Discord data export and skip the search phase entirely — roughly 3-5x faster on large wipes. See [Import mode](#import-mode) below.

- **Robust rate-limit handling** — monotonic delay bumps with half-life decay back to your chosen baseline. The original bumped the delay on a 429 and never reset it, leaving you crawling for the rest of the run. Now it decays back toward your stepper value as deletes succeed.

- **Auto-retry** on HTTP 5xx, network errors, and Discord's transient empty-page quirks. The original would die on a single empty page, an internet hiccup, or any Discord wobble. Each of those now has proper retry logic.

- **Server-bar trash-icon injection** + `Ctrl+Shift+D` shortcut. The icon mounts inside Discord's left rail (between the Home/DM separator and the first server) and re-injects every second if React drops it. A floating action button in the bottom-right is the fallback when Discord's DOM doesn't expose the expected anchors.

- **Self-contained dark palette.** All colors are pinned to hardcoded hex values — the panel deliberately ignores Discord's CSS theme variables, so BetterDiscord/Vencord/custom themes can't make the UI look terrible. Single-source palette at the top of `styles.css` if you ever want to retune.

- **Defensive null handling**, run-instance fencing for stop+start races, log auto-trim at 1000 entries. Stop-and-resume during a wait used to corrupt the run; instance tracking and an interruptible sleep fix that.

## Install

Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (recommended), [Violentmonkey](https://violentmonkey.github.io/), or Greasemonkey. Works in Chrome, Edge, Firefox, Safari, Opera, and most Chromium-based browsers.

> **Chromium browsers only** (Chrome, Edge, Brave, Opera, Vivaldi): open the extensions page (`chrome://extensions` or equivalent) and enable **Developer mode**. Manifest V3 requires it for userscript managers to run user code. Firefox and Safari users can skip this step.

Then install the script via either path:

- **Greasy Fork** *(easiest — once published)* — visit the [Greasy Fork listing](https://greasyfork.org/) and click **Install this script**.
- **Direct from GitHub** — click **[undiscord-lite.user.js](https://github.com/OrbitalCheese/undiscord-lite/raw/master/undiscord-lite.user.js)**. Your userscript manager will detect the metadata banner and prompt you to install.

Open/reload Discord afterwards. A trash icon mounts in Discord's left rail just above the server list — click it (or press `Ctrl+Shift+D`) to open the panel. If Discord's DOM doesn't expose the expected anchors, a fallback floating action button appears in the bottom-right corner instead.

## Usage

Open the panel with the trash icon or `Ctrl+Shift+D`. The panel is draggable by its header and resizable from any edge or corner.

### Author ID

The Author ID field determines whose messages get deleted. Click **`Me`** to auto-fill your own user ID. You can paste a different user's ID, but Discord will only let you delete messages on channels where you have **Manage Messages** permission for that user (e.g. moderating your own server).

Comma-separate IDs (`id1,id2,id3`) to delete from multiple authors in one batch — the run expands to one job per (target × author). Non-self authors require Manage Messages on each target server; a one-shot pre-flight check at the start of the batch verifies this and aborts early on any failure. DMs only delete your own messages, so they spawn one self-author job regardless of how many IDs are listed.

### Building the queue

Server ID and Channel ID each have three control buttons plus a `Clear` button inside the input:

- **`Add`** — queues the current target. While viewing a server, `Add` on Server queues a server-wide wipe; while viewing a channel, `Add` on Channel queues that one channel (and pulls in its parent server).
- **`Select`** — enters point-and-click capture mode. The next click on a server icon / channel / message in Discord drops its ID into the field. Hold Shift to keep capturing without exiting.
- **`Delete`** — removes the current target from the queue. Removing the last channel under a server widens it back to a server-wide wipe.

Mix and match across as many servers as you want — order doesn't matter, the queue display groups everything by server.

**Server-wide vs channel-specific.** An empty Channel ID for a given server means "wipe the whole server." Adding a specific channel to a server already queued server-wide narrows it to just that channel. Adding a server-wide entry over channel-specifics absorbs them and resets that server back to a full wipe.

**DMs.** Open the DM in Discord and click `Add` on Channel. The Server field auto-fills as `@me`, the Channel field auto-fills with the DM ID — both pulled from Discord's URL.

**Wiping every DM at once.** Click the **`Add DM's`** button in the DMs fieldset. It calls Discord's own `GET /users/@me/channels` endpoint with your existing auth token and queues every 1:1 DM currently open in your sidebar. Group DMs are skipped by default — toggle the **group DMs** pill (red/off → green/on) next to it to include them too.

> Only currently-open DMs are queued. Conversations you've X'd out of the sidebar aren't returned by that endpoint — Discord considers them minimized rather than active. Re-open the DM in Discord first, then click `Add DM's` again.

### Running

Hit **`▶︎ Delete`**. On the first job, a confirmation dialog shows you the estimated message count, estimated time, and a preview of what's about to be deleted. Subsequent jobs in the same batch don't re-prompt.

The trash icon (whether mounted in the server bar or shown as the fallback FAB) turns red while a run is active and shows a thin progress bar. Click **`🛑 Stop`** at any time — the wait between requests aborts immediately, no waiting for the current sleep to elapse.

### Settings

Collapsible sidebar sections:

- **General** — Author ID, Server / Channel queue, DMs. NSFW channels are queried automatically; the script always sets `include_nsfw=true` server-side so age-gated channels return results.

- **Search filter** — narrow what comes back from Discord's search: content text, attachment types (link / image / video / sound / sticker / poll / embed / forwarded), `@everyone / @here` pings, pinned mode, and a single `@user` mention.

- **Delete filter** — drops messages from the queue *after* the search returns them: skip-text (substring or exact-word), the same set of attachment toggles, `@everyone / @here`, and a list of `@user` mentions to skip.

> **Mention asymmetry.** The Search filter's <kbd>Include @user</kbd> field accepts **one** ID — Discord's `mentions=` query param only filters by a single mentioned user per request. The Delete filter's <kbd>Skip @user</kbd> field accepts **any number** of comma-separated IDs, because the skip is a client-side check after the response: every listed ID is matched against each message's mentions. So if you queue a 10k-message run and want to skip three users, list all three on the Skip side and they'll all be honored in one pass.

- **Messages interval** — min/max snowflake IDs to bound the deletion. Right-click a message in Discord → Copy Message ID. Useful for "delete everything I posted after this point" or "only the last week."

- **Date interval** — datetime pickers, auto-converted to snowflakes. Ignored if you also fill in Messages interval — the snowflake range wins.

- **Advanced settings** — search delay (default 45s) and delete delay (default 1s) steppers set your *baseline*. Click the arrows or type a value directly (auto-clamped to the field's range). The script auto-bumps both on 429s and decays them back toward your baseline as deletes succeed. Lower delays = faster, but more throttling.

- **Import data export** — pre-load message IDs from your Discord data export and skip the search phase entirely (~3-5x faster on large wipes; no search-index-lag failure modes). See [Import mode](#import-mode) below.

> Discord's UI no longer lets you copy a raw message ID — only a message *link*. Paste the link and trim everything before the last segment: `https://discord.com/channels/<server>/<channel>/<MessageID>` — keep the last number.
>
> Around 30s is the practical floor for the search delay. Below that, Discord returns smaller batches per call until you're retrying more often than deleting. **40-45s search + 0.5–1s delete** is the sweet spot for consistent results.

## Import mode

If you've already requested your Discord data (User Settings → Privacy & Safety → **Request All My Data**), the resulting ZIP contains a complete index of every message you've ever sent. Import mode reads that index directly and skips Discord's search API entirely — turning a multi-hour wipe into a delete-only run.

**When to use it:**
- You're wiping thousands of messages and want it to finish in hours instead of half a day.
- Discord's search index is missing recent messages (a known intermittent issue).
- You want to delete from channels in servers Discord's search has been flaky on.

**How to use it:**

1. Request your data export from Discord. It arrives as a ZIP via email after a few minutes to a few days.
2. Unzip it locally. Inside is a `messages/` folder.
3. Open the panel's **Import data export** section. Click **Select Folder...** and point at that `messages/` folder.
4. The summary line fills in: total messages, channel count, oldest/newest timestamp.
5. Set your Date or Messages interval if you want to bound the wipe (e.g. "only delete posts older than 1 year"). These are pre-applied client-side before the run starts.
6. Click **▶︎ Delete**. The General queue, Search filter, and Delete filter sections grey out — the import IS the queue.

**What still applies in import mode:**
- Date interval and Messages interval (pre-pass; only matching records get queued).
- Delete delay (paces the actual DELETE requests).
- Streamer mode (redacts message content *and* usernames in the log + confirmation preview).

**What doesn't apply:**
- Author / Server / Channel / DM queue fields — replaced by the import.
- Search filter (no API call to filter).
- Delete filter — most categories rely on data the export doesn't carry (mentions, embeds, pin status). Date and message-interval bounds are the only filters honored.
- Search delay (no search call).

**Edge cases:**
- Messages already deleted (by you, by mods, by Discord) → 404 on DELETE; counted as failed but harmless.
- Channels you've since lost access to (banned, channel deleted, server deleted) → 403; same treatment.
- Group DMs and one-on-one DMs are included if your export contains them.

**Privacy:** the export is parsed locally in your browser (`FileReader.text()`). Nothing is uploaded — there is no code path that sends imported data anywhere. The same `grep` rules in the [Privacy](#privacy) section catch any regression of this guarantee.

> The export contains every DM you've ever had. Don't commit `messages/`, `package/`, or `*.zip` to a git repo by accident. The included `.gitignore` already covers these.

## How it works

A walkthrough of what happens after you click `▶︎ Delete`. Every step lines up with a function in the source so the trail is easy to follow.

1. **Auth token capture.** The script reads your Discord token from Discord's own `localStorage` via a same-origin iframe — the same token Discord's UI uses, from the same place. Never typed, never persisted by this script. *(`getToken()` in `src/helpers.js`.)*

2. **Queue resolution.** The Server ID and Channel ID fields are parsed into a list of `(server, channel)` jobs. An empty Channel ID for a given server means "wipe the whole server." DMs are queued as `(@me, <DM channel ID>)`. *(`parseTargets()` in `src/undiscord-ui.js`.)*

3. **Per-job loop.** For each queued target, the loop repeats: *(`run()` in `src/undiscord-core.js`.)*
   - **Search** — `GET /api/v9/guilds/<id>/messages/search` returns one page of matching messages. Page sizes are content-bounded (Discord caps somewhere near 25 but smaller pages are common on long-content channels). In **import mode**, this step is skipped — pages come from an `ImportSource` over the in-memory list parsed from your data export.
   - **Filter** — drops system messages and (by default) pinned messages, then runs all client-side `Skip ...` toggles. *(`filterResponse()`.)*
   - **Confirm** — first time only, a browser `confirm()` dialog shows the estimated count, ETA, and a content preview. Subsequent pages and jobs proceed silently.
   - **Delete** — issues `DELETE /api/v9/channels/<id>/messages/<id>` for each remaining message, sleeping `deleteDelay` ms between (default 1s). *(`deleteMessagesFromList()` and `deleteMessage()`.)*
   - **Wait** — sleeps `searchDelay` ms (default 45s) before the next page. Discord's search index lags real-time deletion; faster pacing returns smaller batches and triggers more retries. Skipped in import mode (no API call to pace).
   - **Repeat** — until the search returns empty (or the source is exhausted, or the empty-page retry budget runs out).

4. **Rate-limit handling.** On HTTP 429, the script reads `retry_after`, sleeps that long, and bumps its effective delay up to that value. Each subsequent successful response halves the delay back toward the stepper baseline (half-life decay). On 5xx or network error, it retries with exponential backoff (1s, 2s, 4s).

5. **Stop.** Clicking 🛑 Stop sets `running=false` and aborts the in-flight sleep. The loop exits at its next checkpoint, prints the end-summary, and resets the UI. *(`stop()`.)*

Every step that touches the network is one of four `fetch()` calls listed in the [Privacy](#privacy) section below. There is no other network I/O.

## Privacy

**Short version:** your auth token is never stored, never logged, and never sent anywhere except `discord.com`.

The longer version, in case you want to verify it yourself (you should):

- **Where the token comes from.** Read from Discord's own `localStorage` via a same-origin iframe (Discord blocks direct page access, but iframes inherit the parent origin's storage — standard workaround). It's the same token Discord's own client uses, from the same place.
  - `getToken()` — [`src/helpers.js:69`](src/helpers.js#L69)
  - iframe storage helper — [`src/helpers.js:58`](src/helpers.js#L58)

- **Where the token goes.** Held in a JavaScript variable (`options.authToken`) for the duration of the run. Used only as the `Authorization` header on `fetch()` calls to `https://discord.com/api/v9/...`. The codebase has exactly four `fetch()` call sites — search, delete, the DM-list lookup behind the `Add DM's` button, and the pre-flight permission check for multi-author batching — all four pointing at `discord.com`.
  - `authToken` field declaration — [`src/undiscord-core.js:52`](src/undiscord-core.js#L52)
  - search call — [`src/undiscord-core.js:419`](src/undiscord-core.js#L419) *(Authorization header at [line 447](src/undiscord-core.js#L447))*
  - delete call — [`src/undiscord-core.js:688`](src/undiscord-core.js#L688) *(Authorization header at [line 690](src/undiscord-core.js#L690))*
  - DM-list lookup — [`src/undiscord-ui.js:396`](src/undiscord-ui.js#L396) *(Authorization header at [line 397](src/undiscord-ui.js#L397))*
  - permission pre-flight — [`src/undiscord-ui.js:1302`](src/undiscord-ui.js#L1302) *(Authorization header at [line 1303](src/undiscord-ui.js#L1303))*
  - verify yourself: `grep -rn 'fetch(' src/` — exactly four hits
  - *Line numbers may drift between releases. If a link is off, search the file for the symbol — it's the most reliable anchor.*

- **Where the token doesn't go.** Never written to `localStorage`, `IndexedDB`, cookies, files, or any other persistent storage. Never serialized into the log area. Never sent to GitHub, Greasy Fork, the author, an analytics service, or anything else — there is no code that talks to anything other than `discord.com`. Closing the tab clears it from memory.
  - verify yourself: `grep -rEn 'localStorage\.setItem|indexedDB|document\.cookie|navigator\.sendBeacon' src/` — zero hits

- **No telemetry, no analytics, no update beacons.** Update checks happen at the userscript-manager layer (Tampermonkey, Violentmonkey, etc) as this repo gets updated, never from inside this script.
  - verify yourself: `grep -rEn 'fetch\(|XMLHttpRequest|WebSocket|sendBeacon' src/` — only the four `discord.com` fetches above

- **No third-party code, fully self-contained.** Zero `npm` dependencies, zero `@require` directives, no remote script injection. `@grant none` means no `GM_*` privileges, no CSP bypass, no cross-origin reach beyond what a normal page script has. The bundle has no `<img>`, `<link>`, `<script>`, `@font-face`, `@import`, or `url(http...)` references — every icon is inline SVG, every font falls through to system fonts, every color has a hardcoded hex fallback. After install, you could block every domain except `discord.com` and the script would still work.
  - userscript metadata banner — [`undiscord-lite.user.js:1-11`](undiscord-lite.user.js#L1-L11) (`@grant none`, no `@require`)
  - dependency manifest — [`package.json`](package.json) (no `dependencies` or `devDependencies` blocks)

- **What gets logged locally.** The panel's log shows usernames, message content, attachment metadata, and message IDs as items are deleted (so you can confirm what's happening). It's rendered into the DOM in your own tab — not transmitted, not persisted, and wiped when you click **Clear Log** or close the tab. Auto-trims at 1000 entries.
  - log renderer — [`src/undiscord-ui.js:1216`](src/undiscord-ui.js#L1216) (`printLog`)
  - auto-trim limit — [`src/undiscord-ui.js:1211`](src/undiscord-ui.js#L1211) (`LOG_MAX_ENTRIES`)

- **Auditable.** The bundled script is ~3,000 lines of readable JavaScript in one file ([`undiscord-lite.user.js`](undiscord-lite.user.js)). No minification, no obfuscation. Open it in any text editor before installing.

## Build

Modifying the source? One command, no install step:

```bash
node build.mjs
```

Outputs `undiscord-lite.user.js` at the repo root.

## Disclaimer

> ⚠️ Discord's terms of service forbid automated user-account actions (self-bots). Using this tool could result in account termination. Use at your own risk, on your own account, on your own data.

This tool only deletes messages owned by the account it's run on, (Or messages the account has the *Manage Messages* privilege over.) via the same HTTP endpoints Discord's UI uses.

## Credits

Built on the work of [victornpb/undiscord](https://github.com/victornpb/undiscord). MIT-licensed.
