---
title: Sticky tree rows nav offset handoff
type: implementation-record
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-12T23:55:00
updated: 2026-05-12T23:55:00
tags:
  - agent/plan
  - polish/tree
  - explorer/views
created_by: codex
updated_by: codex
---

# Sticky Tree Rows Nav Offset Handoff

## Context

The first sticky-row attempt lived in the accidental root `sandbox` worktree and was not portable as-is because it was mixed with stale EDP-005 work. The sticky row idea itself is valid and is now treated as a standalone Explorer tree UX feature.

## Implemented Scope

- Branch/worktree:
  `codex/sticky-rows-nav-offset` at `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\sticky-rows-nav-offset`.
- Base: `claude/explorer` at `044e189 feat: add explorer data-plane perf probes`.
- `viewTree.svelte` now tracks flattened row ancestry and subtree end indices.
- Expanded ancestor rows render in a `.vm-tree-sticky-layer` while scrolling through their subtree.
- Sticky rows use the same row snippet as normal virtual rows, so toggle, badge, label, selection, native DOM classes, and context handlers stay shared.
- `stickyTopOffset` defaults to `0`; this covers detached/no-nav-tools layouts.
  When a parent layout needs to reserve overlaid nav tools, it can pass the measured nav height without changing the sticky-row algorithm.
- `_virtual-list.scss` places sticky rows in their own non-layout layer and offsets the layer by `scrollTop + stickyTopOffset`.

## Tests Added

`test/component/viewTreeDecorations.test.ts` adds coverage that:

- expanded parent rows become sticky while scrolling through their subtree;
- sticky rows expose the configured nav-tools offset;
- the offset defaults to zero when nav tools are absent;
- sticky rows disappear after their subtree scrolls out;
- sticky parent toggle clicks route through the normal `onToggle` handler.

## Prompt For Next Agent

Use this exact prompt if dispatching the next implementation agent:

```text
You are continuing Vaultman after the sticky tree rows nav-offset slice.

Base branch/worktree:
- Use `claude/explorer` only after `codex/sticky-rows-nav-offset` has been
  integrated.
- Do not use the root `sandbox` worktree. It still contains stale accidental
  Wave 3/EDP edits and must not be copied literally.

Read first:
1. AGENTS.md
2. .agents/docs/start.md
3. .agents/docs/current/status.md
4. .agents/docs/current/handoff.md
5. .agents/docs/work/polish/plans/2026-05-12-sticky-tree-rows-nav-offset.md
6. .agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/04-parallel-agent-dispatch-index.md
7. .agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/05-worker-operating-contract.md

Preserve:
- `src/components/views/viewTree.svelte` sticky rows must keep using shared row
  rendering for normal and sticky rows.
- `stickyTopOffset` must default to `0` so layouts without nav tools do not get
  a phantom gap.
- Do not reintroduce panel-local snapshot rebuilding; Files panel must keep
  consuming `ExplorerDataPlaneService`.
- Do not drop `propsRevision` from Files structural cache/revision keys.

Recommended next route:
- Start EDP-006 Agent E0, the shared Tags/Props snapshot contract coordinator.
- Create an isolated worktree from `claude/explorer`:
  `git worktree add .claude\worktrees\edp-006-contract -b codex/edp-006-contract claude/explorer`
- Own only shared data-plane contracts/helpers/tests unless the worker contract
  explicitly expands ownership.

Minimum verification before handoff:
- Sticky tree focused gate:
  `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeScrollFallback.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeHoverBadges.test.ts --fileParallelism=false`
- EDP-006 focused tests added by the next agent.
- `pnpm run lint:full`
- `pnpm run check`
- `pnpm run build:plugin`
- If runtime UI behavior changed, run `pnpm run build`, then:
  `obsidian vault=plugin-dev plugin:reload id=vaultman`
  `obsidian vault=plugin-dev command id=vaultman:open`
  `obsidian vault=plugin-dev dev:errors`
```
