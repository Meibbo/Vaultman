---
title: P112 Stability Polish Implementation Plan
type: implementation-plan
status: completed
lifecycle: active
parent: "[[docs/work/hardening/specs/2026-06-20-p112-stability-polish/index|P112 Stability Polish]]"
created: 2026-06-20T02:18:00
updated: 2026-06-20T03:50:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/plan
  - vaultman/hardening
---

# P112 Stability Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the approved P112 polish slices without reopening the recovered tree/tab/sort regressions.

**Architecture:** Keep global filter rules in `FilterService`, keep view-only filters in explorer/frame state, and make queue/sort/highlight behavior explicit at the boundaries that already own those concerns. Each slice is independently testable and should be committed before moving to the next slice.

**Tech Stack:** TypeScript, Svelte 5 runes, Obsidian plugin APIs, Vitest source/unit guards, pnpm/corepack, explicit `obsidian vault=plugin-dev` runtime checks.

---

## Source Spec

- [[docs/work/hardening/specs/2026-06-20-p112-stability-polish/index|P112 Stability Polish]]

## Closeout

- [[docs/work/hardening/items/2026-06-20-p112-stability-polish-closeout|P112 Stability Polish closeout]]

## Execution Order

1. [[01-folder-operation-projection|Folder operation projection]]
2. [[02-files-sort-parents-first|Files sort Parents First]]
3. [[03-view-filters-scope-counters|View filters and scope counters]]
4. [[04-content-auto-reveal|Content auto-reveal current file]]
5. [[05-search-highlight-setting|Explorer search highlight setting]]
6. [[06-props-labels|Props labels]]
7. Final gate and plugin-dev smoke.

## File Structure

- `src/logic/logicsFiles.ts`: Files tree projection; add `parentsFirst` option only.
- `src/components/containers/explorerFiles.ts`: Files sort state, folder delete queue payload, type view filter seams.
- `src/services/serviceOperationQueue.ts`: folder-delete execution identity.
- `src/logic/logicQueueWarnings.ts`: warning count semantics for folder targets.
- `src/types/typeUI.ts`: `ExplorerSortState.parentsFirst`.
- `src/components/layout/navbarFilters.svelte`: native sort menu state transport and Files sort labels.
- `src/components/layout/popupSort.svelte`: non-native popup sort state transport.
- `src/VaultmanFrame.svelte`: displayed counters, active view filter summaries, and content scope props.
- `src/components/pages/pageFilters.svelte`: Content scope hint, header action, search candidate scope.
- `src/components/pages/tabContent.svelte`: clickable scope hint and path-based reveal seam.
- `src/types/typeSettings.ts`: global search highlight default.
- `src/VaultmanSettings.ts`: settings toggle.
- `src/components/containers/explorerProps.ts`, `src/components/containers/explorerTags.ts`: highlight gating.
- `src/components/layout/viewTree.ts`, `src/components/layout/viewNodeTable.ts`: mutable highlight remains signature-free.
- `src/i18n/en.ts`, `src/i18n/es.ts`: labels.
- `test/unit/*`: focused source/unit guards listed in each task.

## Commit Policy

Use one local product commit per task unless two adjacent tasks are implemented in the same small edit and pass the same focused gate. Do not push. Do not touch `main`. Do not write AI docs in the product worktree.

## Final Gate

Run after all product commits:

```powershell
corepack pnpm run lint
corepack pnpm run check
corepack pnpm run stylelint
corepack pnpm run test:unit
corepack pnpm run build
```

Then sync is handled by the build script. If Obsidian CLI responds, use explicit plugin-dev only:

```powershell
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev dev:errors
```

Targeted DOM checks should cover folder delete count/badge, Files sort menu `Parents First`, Content scope hint click, and search highlight default off. If any CLI command times out, report the timeout and do not fall back to the focused personal vault.
