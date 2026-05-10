---
title: "Node notes next-priority implementation order - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|Node notes next-priority implementation order]]"
shard_source: ".agents/docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index.md"
shard_of: "[[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|Node notes next-priority implementation order]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# Node notes next-priority implementation order - continuation 1

Continua desde [[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|Node notes next-priority implementation order]].

  the event.

Why later: this touches private DOM selectors and needs live Obsidian smoke
coverage.

Outcome:

- Added `NativeSurfaceBindingService` and wired it into `main.ts` after
  `NodeBindingService`.
- Native tag, metadata tag, CodeMirror hashtag, folder, and breadcrumb surfaces
  now support Ctrl/Cmd/Alt/middle-click binding-note creation/opening.
- Hover previews now use Obsidian's public `hover-link` trigger when a native
  surface has exactly one matching binding note alias.
- The adapter preserves native primary-click behavior and only suppresses the
  event after Vaultman resolves and handles a supported surface.

Verification:

- Focused native-surface plus node-binding unit suites passed with 2 files and
  28 tests.
- `pnpm run check`, `pnpm run lint`, and `pnpm run build` passed.
- Obsidian CLI smoke passed in `plugin-dev`: enable/reload `vaultman`, open
  Vaultman, inspect `dev:errors`, inspect error console after attaching the
  debugger, and runtime eval confirming the native-surface service is loaded.
- Full plan/result:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index|NN-4 native Obsidian surface adapter]].

### NN-5 - Harness Spike Only If Needed

Scope:

- Prefer existing unit/component tests plus Obsidian CLI/CDP smoke.
- Consider `obsidian-web` only as an isolated spike pinned to a commit, no real
  vault data, no vendored code, and only after licensing/safety constraints are
  accepted.

Why last: it is test infrastructure risk, not product behavior.

## Order Against Existing Pending Work

1. Finish/triage existing dirty worktree state.
2. NN-0 through NN-3.
3. Backlog Cut 10: user-facing view-size control.
4. Backlog Cut 11: cursor affordance and cheap hover pass.
5. Backlog Cuts 12-15: release-blocking audits for explorer search,
   queue/file/grid correctness, active highlighting, and badge bubbling.
6. Backlog Cuts 16-18: rename decision, overlay behavior, performance
   verification.
7. Backlog Cuts 19-24 and TanStack post-MVP table follow-ups.
8. Backlog Cut 25 stays post-rc.1 holding work.

## Source Links

- [[docs/work/hardening/research/2026-05-09-node-note-ui-assimilation/index|node note UI assimilation research]]
- [[docs/work/hardening/research/2026-05-09-node-note-ui-assimilation/03-tools-snippets-plugins|pageTools snippets and plugins explorers]]
- [[docs/work/hardening/plans/2026-05-09-node-notes-nn1-snippets/index|NN-1 snippets explorer implementation plan]]
- [[docs/work/hardening/plans/2026-05-09-node-notes-nn2-plugins/index|NN-2 plugins explorer implementation plan]]
- [[docs/work/hardening/plans/2026-05-07-multifacet-2/07-binding-notes-and-set|binding notes plan shard]]
- [[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index|pending cut ladder]]
