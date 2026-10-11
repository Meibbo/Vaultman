# obsidian-cdp — one reusable vault-scoped CDP CLI

Consolidates the ad-hoc CDP/keyboard helpers into a single dependency-free
tool (native `fetch` + `WebSocket` only). The coordinator alone operates the
real DOM; this CLI just gives it bounded, JSON-speaking verbs.

Protocol factored from the disposable drivers plus the smoke runners:

- `/data/data/com.termux/files/usr/tmp/opencode/u130-parity-driver.cjs` —
  page-target filter (`type === 'page'`), `Page.bringToFront` before inputs,
  bare keyDown/keyUp pairs, real-rect drag/click points, `exceptionDetails`
  surfacing, pending-timer cleanup in `finally`. (An earlier receipt revision
  wrongly claimed these files absent — it had searched only the worktree and
  git; they live in the approved temporary directory outside the worktree and
  were left untouched.)
- `/data/data/com.termux/files/usr/tmp/opencode/u130-universe-cdp.cjs` —
  `Page.bringToFront` before menu/wheel input, rect-center click/hover,
  F2/Escape key pairs, screenshot via `Page.captureScreenshot`.
- `scripts/run-u130-ui-smoke.mjs` — vault-scoped bounded exec with
  `AbortController` and `Promise.race` probe timeouts.
- `scripts/run-explorer-scroll-smoke.mjs` — trusted `Input.dispatchMouseEvent`
  precedent plus real `getBoundingClientRect` sampling before gestures.

## Files

- `scripts/cdp/cdp-target.mjs` — endpoint normalize, `?vault=` extraction,
  `/json/list` fetch (bounded), exact-match selection (fail on 0 or >1).
- `scripts/cdp/cdp-client.mjs` — `CdpSession` JSON-RPC with per-send timers,
  `withCdpSession` guaranteed socket close.
- `scripts/cdp/cdp-input.mjs` — pure `Input.*` builders: Tab/Space/Home/End/
  arrows/Ctrl/modifier bitmask, click center from real bounds.
- `scripts/cdp/obsidian-cdp.mjs` — CLI entry (`census eval key type click
  screenshot`), JSON stdout, bounded `--timeout`.
- `scripts/cdp/obsidian-cdp.test.mjs` — `node --test` suite, fully injected
  transport (no browser/network).

## Input fidelity notes

- `key` sends `Page.bringToFront`, then one trusted keyDown/keyUp pair — the
  parity-driver mechanics, so a backgrounded page is activated first.
- Unmodified printable keys (`a`, `1`, `Space`/`" "`) carry their text on
  keyDown exactly once; keyUp never carries text and no separate `char` event
  is emitted (Space previously duplicated text via both — fixed).
- Ctrl/Meta chords (`key a --modifiers 2`) carry no text anywhere, or the
  chord would also insert the character.
- `type` sends `Page.bringToFront` then `Input.insertText`: it inserts text
  but emits no key events, so tree prefix navigation (which listens to
  keydown, e.g. typing `reci` to jump) requires `key` presses, not `type`.
- `click` sends `Page.bringToFront`, resolves the selector to a real
  `getBoundingClientRect` in-page, and clicks the integer center.
- Target selection prefers `type === 'page'` targets on exact `?vault=`
  match and still fails on absence or ambiguity instead of guessing.

## Usage

```sh
# list targets (all, or filtered to one vault)
node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 census
node scripts/cdp/obsidian-cdp.mjs census

# evaluate (expression / file / stdin); exceptionDetails surfaced as errors
node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 eval "document.title"
node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 eval --file ./probe.js
echo "document.title" | node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 eval --stdin

# trusted keys: Tab Space Home End Ctrl arrows A-Z 0-9; modifiers Alt=1 Ctrl=2 Meta=4 Shift=8
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key Tab
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key Home
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key End
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key " "            # Space
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key a --modifiers 2  # Ctrl+A

# trusted text + real-bounds click + screenshot
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 type "reci"
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 click ".vaultman-tree-row"
node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 screenshot /tmp/shot.png

# custom endpoint / timeout (PC WSL forwards localhost:9222)
node scripts/cdp/obsidian-cdp.mjs --endpoint http://localhost:9222 --timeout 8000 --vault eb439ca890157574 census
```

All commands print one JSON object (`{"ok":true,"command":...}`) on stdout;
failures print `{"ok":false,"error":"..."}` on stderr with exit 1.

## Tests

```sh
node --test scripts/cdp/obsidian-cdp.test.mjs
node scripts/cdp/obsidian-cdp.mjs --help
```
