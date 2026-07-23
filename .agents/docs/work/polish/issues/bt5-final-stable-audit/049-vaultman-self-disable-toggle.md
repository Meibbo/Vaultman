---
title: BT5-049 — Vaultman self-disable from Plugins cell and action
type: issue
status: completed
lifecycle: active
priority: P0
execution: HITL
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-23T02:10:00
created_by: codex-gpt5-root
updated_by: claude-opus-4-8-audit
resolved_by: 1c689ef1
tags: [agent/issue, triage/in-progress, initiative/polish, release/1.2.0, plugins, lifecycle]
---

# BT5-049 — Vaultman self-disable from Plugins cell and action

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Make the Plugins Explorer state cell and context-menu action invoke the same
SASI capability for Vaultman. Vaultman may disable itself; it may never uninstall
itself. Remove the stale self-protected warning from the toggle path and handle the
fact that successful disable tears down the caller immediately.

## Acceptance criteria

- [x] Vaultman's state cell is an enabled toggle when no transition is pending.
- [x] Cell and context action share one toggle operation and copy.
- [x] Self-disable calls the plugin manager once and tolerates immediate unload.
- [x] External state refresh does not re-enable or leave a stale pending spinner.
- [x] Uninstall remains absent/disabled for Vaultman on every surface.
- [x] Tests replace the old assertion that self-disable is forbidden.
- [ ] `plugin-dev` smoke confirms disable and manual re-enable from core settings.

## Blocked by

None — can start immediately.

## Implementation checkpoint — 2026-07-22

- Product commit: `1c689ef1 fix(plugins): allow Vaultman self-disable`.
- `logicAddonCells` now owns the shared toggle/uninstall policy and the single
  `toggleCommunityPlugin` operation used by both the state cell and context menu.
- A successful Vaultman disable suppresses all post-operation refresh/rebuild work because
  Obsidian tears down the caller; failed operations still clear and repaint pending state.
- The uninstall handler now re-checks the shared policy, so Vaultman remains protected even
  if a caller bypasses menu visibility.
- The stale warning and its English/Spanish locale entries were removed.
- Verification: 82/82 focused tests, changed-path ESLint, Svelte format and diff check green.
  `pnpm run check` reports only the three pre-existing toolbar-overflow diagnostics from the
  foreign `logicResponsiveLayout.ts` worktree edit.
- Remaining gate: controlled `plugin-dev` self-disable followed by manual re-enable in Core
  Settings. The issue remains `in-progress` until that destructive/HITL check is witnessed.

## Outcome (2026-07-23)

HITL confirmed by the dev: the Plugins cell toggle disables Vaultman without the warning, uninstall stays blocked, manual re-enable works. Completed.
