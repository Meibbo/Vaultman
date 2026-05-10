---
title: obsidian-web safety and test-harness assessment
type: agent-research-shard
status: active
parent: "[[02-rendering-quick-switcher-obsidian-web|rendering quick switcher obsidian-web]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/testing
  - security/review
created_by: codex
updated_by: codex
---

# obsidian-web Assessment

Repository: <https://github.com/MusiCode1/obsidian-web>

Observed repository state:

- Public repository: `MusiCode1/obsidian-web`
- Default branch: `main`
- Latest checked commit: `5d3027d2446a9210a7502da21f02e239ad788978`
- Commit date: 2026-05-09 04:08:51 +0000
- No `LICENSE` file found during inspection.

README/PLAN claims:

- Runs the original Obsidian renderer in a browser without Electron.
- Loads Obsidian `app.js` unmodified.
- Replaces Node/Electron dependencies with browser/client shims and HTTP server
  APIs.
- Has Node server and Cloudflare Worker modes.
- Warns not to expose the Node server publicly without authentication.

## Static Safety Notes

- Node server host defaults to `127.0.0.1`.
- There is no built-in application authentication.
- Vault registry can open arbitrary local folder paths if the caller can reach
  the server.
- File APIs are scoped by selected vault id and use path resolution checks to
  reject traversal outside the vault root.
- `/api/vaults/move` can rename a registered vault folder path. This is
  acceptable only for a trusted local process.
- `/api/proxy-request` is an outbound proxy with an allow-list for Obsidian,
  GitHub, and related domains. It should still not be exposed unauthenticated.
- `client/boot.js` shims `window.require`, `fs`, `electron`, `path`, `url`,
  `os`, `crypto`, and `child_process`.
- The crypto shim supports random bytes but synchronous `createHash().digest()`
  can return empty buffers. This can create false positives for plugins that
  depend on sync crypto.
- `child_process` is stubbed, so desktop plugins using process APIs are not
  faithfully testable.

## Verification Run

In a temp clone:

- `npm audit --omit=dev --json` in `server`: 0 reported vulnerabilities.
- `npm audit --omit=dev --json` in `cf`: 0 reported vulnerabilities.
- `npm ci --ignore-scripts` in `server`.
- `npm test` in `server`: 10 tests passed.

These results are useful but narrow. They validate the repository's own current
tests and package audit state; they do not prove the shim is faithful to desktop
Obsidian or safe to expose to untrusted callers.

## Interpretation

`obsidian-web` may become valuable for Playwright-style DOM regression tests if
it can run real Obsidian renderer surfaces in CI. It could help test properties,
breadcrumbs, file explorer nodes, hover previews, and modal behaviour without a
desktop Electron process.

It is not safe to vendor or depend on today:

- no discovered license
- brand-new repository
- partial shims, especially crypto and Electron IPC
- local file server with no auth
- downloads/extracts proprietary Obsidian renderer artifacts

Recommended treatment:

1. Do not add it as a dependency.
2. Do not copy code until licensing is resolved.
3. If useful, create an isolated spike pinned to commit
   `5d3027d2446a9210a7502da21f02e239ad788978`.
4. Use a temp vault only, never the user's real vault.
5. Keep it out of production and normal CI until the safety/legal checklist is
   closed.

