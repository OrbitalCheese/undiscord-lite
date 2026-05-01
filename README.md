# Undiscord Lite

Bulk-delete your messages in Discord channels and DMs. A personal-use fork of
[victornpb/undiscord](https://github.com/victornpb/undiscord), rewritten end to end:

- **Zero npm dependencies.** The build is a single 250-line Node script — no rollup, no plugins, no `node_modules`.
- **Multi-server / multi-channel batching** with `set` / `add` / `del` semantics and a live human-readable queue display.
- **Robust rate-limit handling** — monotonic delay bumps with half-life decay back to your chosen baseline.
- **Auto-retry** on HTTP 5xx, network errors, and Discord's transient empty-page quirks.
- **Floating action button** + `Ctrl+Shift+D` shortcut. No more fragile toolbar mounting.
- **Dark-mode CSS** with hand-picked fallbacks for every Discord theme variable.
- **Defensive null handling**, run-instance fencing for stop+start races, log auto-trim at 1000 entries.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser of choice.
2. Open Chrome's `chrome://extensions` and toggle **Developer mode** on (required for userscripts in Chrome MV3).
3. Click here to install: **[undiscord-lite.user.js](https://github.com/OrbitalCheese/undiscord-lite/raw/master/undiscord-lite.user.js)**
4. Tampermonkey will detect the metadata banner and prompt you to install.
5. Open Discord — a trash icon appears in the bottom-right corner. Click it (or press **`Ctrl+Shift+D`**) to open the panel.

Tampermonkey will check for updates automatically and offer to install new builds when this repo updates.

## Usage

Each input field has three buttons:

- **`set`** — overwrites the queue with just the current target.
- **`add`** — appends the current target to the batch.
- **`del`** — removes the current target from the batch.

Click `add` on Server while inside a server's general view to queue a server-wide wipe.
Click `add` on Channel while inside a specific channel to queue just that channel.
Mix and match — the queue display shows what's lined up. Hit **`▶︎ Delete`** when ready.

Other settings live in the collapsible sections:

- **Filter** — narrow by content text, link/file presence, or include pinned messages
- **Messages interval** — min/max snowflake IDs (right-click a message in Discord → Copy Message ID)
- **Date interval** — datetime pickers, converted to snowflakes
- **Advanced settings** — search delay and delete delay sliders. The script auto-bumps these on rate-limit and decays them back as deletes succeed.

## Build (only if you're modifying the source)

```bash
node build.mjs
```

That's it. No `npm install` required. Outputs `undiscord-lite.user.js` at the repo root.

## Disclaimer

> ⚠️ Discord's terms of service forbid automated user-account actions (self-bots).
> Using this tool could result in account termination. Use at your own risk, on
> your own account, on your own data.

This tool only deletes messages owned by the account it's run on, via the same
HTTP endpoints Discord's UI uses.

## Credits

Built on the work of [victornpb/undiscord](https://github.com/victornpb/undiscord). MIT-licensed.
