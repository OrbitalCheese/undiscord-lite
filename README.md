# Undiscord Lite

Bulk-delete your messages in Discord servers, channels, and DMs. A zero-dependency rewrite of [victornpb/undiscord](https://github.com/victornpb/undiscord).

## What's new

- **Zero npm dependencies.** The build is a single 250-line Node script — no rollup, no plugins, no `node_modules`. The bundled userscript is under 100 KB and runs with no external dependencies, so there's nothing to audit beyond the file itself.

- **Multi-server / multi-channel batching** with `set` / `add` / `del` semantics and a live queue display. The original technically supported batching — comma-separated channel IDs in one input — but it was undocumented and miserable to use manually. Dedicated buttons and a smarter queue let you mix entire-server wipes with channel-specific entries however you want.

- **Robust rate-limit handling** — monotonic delay bumps with half-life decay back to your chosen baseline. The original bumped the delay on a 429 and never reset it, leaving you crawling for the rest of the run. Now it decays back toward your slider position as deletes succeed.

- **Auto-retry** on HTTP 5xx, network errors, and Discord's transient empty-page quirks. The original would die on a single empty page, an internet hiccup, or any Discord wobble. Each of those now has proper retry logic.

- **Floating action button** + `Ctrl+Shift+D` shortcut. No more fragile toolbar mounting.

- **Dark-mode CSS** with hand-picked fallbacks for every Discord theme variable. No more broken-looking text.

- **Defensive null handling**, run-instance fencing for stop+start races, log auto-trim at 1000 entries. Stop-and-resume during a wait used to corrupt the run; instance tracking and an interruptible sleep fix that.

## Install

Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (recommended), [Violentmonkey](https://violentmonkey.github.io/), or Greasemonkey. Works in Chrome, Edge, Firefox, Safari, Opera, and most Chromium-based browsers.

> **Chromium browsers only** (Chrome, Edge, Brave, Opera, Vivaldi): open the extensions page (`chrome://extensions` or equivalent) and enable **Developer mode**. Manifest V3 requires it for userscript managers to run user code. Firefox and Safari users can skip this step.

Then install the script via either path:

- **Greasy Fork** *(easiest — once published)* — visit the [Greasy Fork listing](https://greasyfork.org/) and click **Install this script**.
- **Direct from GitHub** — click **[undiscord-lite.user.js](https://github.com/OrbitalCheese/undiscord-lite/raw/master/undiscord-lite.user.js)**. Your userscript manager will detect the metadata banner and prompt you to install.

Open/reload Discord afterwards. A trash icon appears in the bottom-right corner — click it (or press `Ctrl+Shift+D`) to open the panel. 

## Usage

Open the panel with the trash icon or `Ctrl+Shift+D`. The panel is draggable by its header and resizable from any edge or corner.

### Author ID

The Author ID field determines whose messages get deleted. Click **`me`** to auto-fill your own user ID. You can paste a different user's ID, but Discord will only let you delete messages on channels where you have **Manage Messages** permission for that user (e.g. moderating your own server).

### Building the queue

Each target field (Server ID, Channel ID) has three buttons:

- **`set`** — overwrites the queue with just the current target.
- **`add`** — appends the current target to the batch.
- **`del`** — removes the current target from the batch.

The current target is read from whatever Discord page you're viewing. Click `add` on Server while viewing a server to queue a server-wide wipe; click `add` on Channel inside a specific channel to queue just that channel. Mix and match across as many servers as you want — order doesn't matter, the queue display groups everything by server. Adding a channel automatically pulls in its server, and deleting a server culls every channel under it.

**Server-wide vs channel-specific.** An empty Channel ID for a given server means "wipe the whole server." Adding a specific channel to a server already queued server-wide narrows it to just that channel. Adding a server-wide entry over channel-specifics absorbs them and resets that server back to a full wipe.

**DMs.** Open the DM in Discord and click `set` on Server. Server ID fills in as `@me`, Channel ID fills in with the DM ID — exactly what's needed.

**Wiping every DM at once.** Click the **`add all DMs`** button under the Channel ID field. It calls Discord's own `GET /users/@me/channels` endpoint with your existing auth token and queues every open DM. Toggle **Skip groups** next to it to exclude group DMs.

> Only currently-open DMs are queued. Conversations you've X'd out of the sidebar aren't returned by that endpoint — Discord considers them minimized rather than active. Re-open the DM in Discord first, then click `add all DMs` again.

### Running

Hit **`▶︎ Delete`**. On the first job, a confirmation dialog shows you the estimated message count, estimated time, and a preview of what's about to be deleted. Subsequent jobs in the same batch don't re-prompt.

The trash FAB turns red while a run is active and shows a thin progress bar. Click **`🛑 Stop`** at any time — the wait between requests aborts immediately, no waiting for the current sleep to elapse.

### Settings

Collapsible sidebar sections:

- **General → NSFW checkbox** — must be on if any queued channel is age-gated, otherwise Discord's search API returns nothing for those channels.

- **Search filter** — narrow what comes back from Discord's search: content text, attachment types (link / image / video / sound / sticker / poll / embed / forwarded), `@everyone / @here` pings, pinned mode, and a single `@user` mention.

- **Delete filter** — drops messages from the queue *after* the search returns them: skip-text (substring or exact-word), the same set of attachment toggles, `@everyone / @here`, and a list of `@user` mentions to skip.

> **Mention asymmetry.** The Search filter's <kbd>Include @user</kbd> field accepts **one** ID — Discord's `mentions=` query param only filters by a single mentioned user per request. The Delete filter's <kbd>Skip @user</kbd> field accepts **any number** of comma-separated IDs, because the skip is a client-side check after the response: every listed ID is matched against each message's mentions. So if you queue a 10k-message run and want to skip three users, list all three on the Skip side and they'll all be honored in one pass.

- **Messages interval** — min/max snowflake IDs to bound the deletion. Right-click a message in Discord → Copy Message ID. Useful for "delete everything I posted after this point" or "only the last week."

- **Date interval** — datetime pickers, auto-converted to snowflakes. Ignored if you also fill in Messages interval — the snowflake range wins.

- **Advanced settings** — search delay (default 45s) and delete delay (default 1s) sliders set your *baseline*. The script auto-bumps both on 429s and decays them back toward your baseline as deletes succeed. Lower delays = faster, but more throttling.

> Discord's UI no longer lets you copy a raw message ID — only a message *link*. Paste the link and trim everything before the last segment: `https://discord.com/channels/<server>/<channel>/<MessageID>` — keep the last number.
>
> Around 30s is the practical floor for the search delay. Below that, Discord returns smaller batches per call until you're retrying more often than deleting. **40-45s search + 0.5–1s delete** is the sweet spot for consistent results.

## How it works

A walkthrough of what happens after you click `▶︎ Delete`. Every step lines up with a function in the source so the trail is easy to follow.

1. **Auth token capture.** The script reads your Discord token from Discord's own `localStorage` via a same-origin iframe — the same token Discord's UI uses, from the same place. Never typed, never persisted by this script. *(`getToken()` in `src/helpers.js`.)*

2. **Queue resolution.** The Server ID and Channel ID fields are parsed into a list of `(server, channel)` jobs. An empty Channel ID for a given server means "wipe the whole server." DMs are queued as `(@me, <DM channel ID>)`. *(`parseTargets()` in `src/undiscord-ui.js`.)*

3. **Per-job loop.** For each queued target, the loop repeats: *(`run()` in `src/undiscord-core.js`.)*
   - **Search** — `GET /api/v9/guilds/<id>/messages/search` returns up to 25 messages per page that match the filter (content, link/file presence, snowflake range, etc).
   - **Filter** — drops system messages and (by default) pinned messages. *(`filterResponse()`.)*
   - **Confirm** — first time only, a browser `confirm()` dialog shows the estimated count, ETA, and a content preview. Subsequent pages and jobs proceed silently.
   - **Delete** — issues `DELETE /api/v9/channels/<id>/messages/<id>` for each remaining message, sleeping `deleteDelay` ms between (default 1s). *(`deleteMessagesFromList()` and `deleteMessage()`.)*
   - **Wait** — sleeps `searchDelay` ms (default 45s) before the next page. Discord's search index lags real-time deletion; faster pacing returns smaller batches and triggers more retries.
   - **Repeat** — until the search returns empty (or the empty-page retry budget is exhausted).

4. **Rate-limit handling.** On HTTP 429, the script reads `retry_after`, sleeps that long, and bumps its effective delay up to that value. Each subsequent successful response halves the delay back toward the slider baseline (half-life decay). On 5xx or network error, it retries with exponential backoff (1s, 2s, 4s).

5. **Stop.** Clicking 🛑 Stop sets `running=false` and aborts the in-flight sleep. The loop exits at its next checkpoint, prints the end-summary, and resets the UI. *(`stop()`.)*

Every step that touches the network is one of four `fetch()` calls listed in the [Privacy](#privacy) section below. There is no other network I/O.

## Privacy

**Short version:** your auth token is never stored, never logged, and never sent anywhere except `discord.com`.

The longer version, in case you want to verify it yourself (you should):

- **Where the token comes from.** Read from Discord's own `localStorage` via a same-origin iframe (Discord blocks direct page access, but iframes inherit the parent origin's storage — standard workaround). It's the same token Discord's own client uses, from the same place.
  - `getToken()` — [`src/helpers.js:53`](src/helpers.js#L53)
  - iframe storage helper — [`src/helpers.js:42`](src/helpers.js#L42)

- **Where the token goes.** Held in a JavaScript variable (`options.authToken`) for the duration of the run. Used only as the `Authorization` header on `fetch()` calls to `https://discord.com/api/v9/...`. The codebase has exactly four `fetch()` call sites — search, delete, the DM-list lookup behind the `add all DMs` button, and the pre-flight permission check for multi-author batching — all four pointing at `discord.com`.
  - `authToken` field declaration — [`src/undiscord-core.js:40`](src/undiscord-core.js#L40)
  - search call — [`src/undiscord-core.js:381`](src/undiscord-core.js#L381) *(Authorization header at [line 409](src/undiscord-core.js#L409))*
  - delete call — [`src/undiscord-core.js:644`](src/undiscord-core.js#L644) *(Authorization header at [line 646](src/undiscord-core.js#L646))*
  - DM-list lookup — [`src/undiscord-ui.js:391`](src/undiscord-ui.js#L391) *(Authorization header at [line 392](src/undiscord-ui.js#L392))*
  - permission pre-flight — [`src/undiscord-ui.js:1208`](src/undiscord-ui.js#L1208) *(Authorization header at [line 1209](src/undiscord-ui.js#L1209))*
  - verify yourself: `grep -rn 'fetch(' src/` — exactly four hits

- **Where the token doesn't go.** Never written to `localStorage`, `IndexedDB`, cookies, files, or any other persistent storage. Never serialized into the log area. Never sent to GitHub, Greasy Fork, the author, an analytics service, or anything else — there is no code that talks to anything other than `discord.com`. Closing the tab clears it from memory.
  - verify yourself: `grep -rEn 'localStorage\.setItem|indexedDB|document\.cookie|navigator\.sendBeacon' src/` — zero hits

- **No telemetry, no analytics, no update beacons.** Update checks happen at the userscript-manager layer (Tampermonkey, Violentmonkey, etc) as this repo gets updated, never from inside this script.
  - verify yourself: `grep -rEn 'fetch\(|XMLHttpRequest|WebSocket|sendBeacon' src/` — only the four `discord.com` fetches above

- **No third-party code, fully self-contained.** Zero `npm` dependencies, zero `@require` directives, no remote script injection. `@grant none` means no `GM_*` privileges, no CSP bypass, no cross-origin reach beyond what a normal page script has. The bundle has no `<img>`, `<link>`, `<script>`, `@font-face`, `@import`, or `url(http...)` references — every icon is inline SVG, every font falls through to system fonts, every color has a hardcoded hex fallback. After install, you could block every domain except `discord.com` and the script would still work.
  - userscript metadata banner — [`undiscord-lite.user.js:1-11`](undiscord-lite.user.js#L1-L11) (`@grant none`, no `@require`)
  - dependency manifest — [`package.json`](package.json) (no `dependencies` or `devDependencies` blocks)

- **What gets logged locally.** The panel's log shows usernames, message content, attachment metadata, and message IDs as items are deleted (so you can confirm what's happening). It's rendered into the DOM in your own tab — not transmitted, not persisted, and wiped when you click **Clear log** or close the tab. Auto-trims at 1000 entries.
  - log renderer — [`src/undiscord-ui.js:448`](src/undiscord-ui.js#L448) (`printLog`)
  - auto-trim limit — [`src/undiscord-ui.js:443`](src/undiscord-ui.js#L443) (`LOG_MAX_ENTRIES`)

- **Auditable.** The bundled script is ~1,500 lines of readable JavaScript in one file ([`undiscord-lite.user.js`](undiscord-lite.user.js)). No minification, no obfuscation. Open it in any text editor before installing.

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
