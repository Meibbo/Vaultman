---
title: Release 1.0.2 core parity hotfix implementation plan
type: plan
status: completed
parent: "[[docs/work/publish/specs/2026-06-04-release-1-0-2-core-parity-hotfix-design|Release 1.0.2 core parity hotfix design]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T15:30:00
tags:
  - agent/plan
  - initiative/publish
  - release/1-0-2
  - ux
  - core-parity
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.2 Core Parity Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the visible `1.0.2` stable UX regressions by aligning queue behavior, File Explorer controls, Content preview, property types, statistics reactivity, minimal style, and icons with Obsidian core behavior.

**Architecture:** Patch the current stable hotfix worktree in place. Add no canary tooling or AI files to the stable worktree. Use Obsidian core DOM/API observations as references, keep changes scoped to existing services/components, and verify both by local gates and live `plugin-dev` CLI smoke.

**Tech Stack:** TypeScript, Svelte 5, Obsidian plugin API, Obsidian CLI, pnpm, esbuild, Vitest, svelte-check, SCSS/CSS.

---

## Target Worktree

`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

Branch: `hotfix/1.0.2-css-scorecard`

Do not add `.agents`, `AGENTS.md`, `.claude`, `.codex`, or generated agent files
to this worktree.

## Files

- Modify `src/services/serviceOperationQueue.ts` to add `stage/bypass` mode and
  a mode-change event.
- Modify `src/components/layout/islandQueue.ts` to show the empty-queue
  stage/bypass toggle.
- Modify `src/types/typeOps.ts` only if a queue marker needs a type-safe
  operation shape adjustment.
- Modify `src/types/typeTree.ts` so file-folder nodes can carry a folder object.
- Modify `src/logic/logicsFiles.ts` so folder metadata carries a resolvable
  folder path and helper tests cover folder-first tree behavior.
- Modify `src/components/containers/explorerFiles.ts` for queue-aware file
  actions, folder context menus, create note/folder, expand/collapse all, auto
  reveal, and search reveal.
- Modify `src/components/containers/explorerTags.ts` for queue-aware rename,
  delete, and inline-to-frontmatter actions.
- Modify `src/components/containers/explorerProps.ts` for native type-manager
  resolution and type-change behavior.
- Modify `src/services/serviceContextMenu.ts` to allow native file/folder menu
  population before Vaultman panel actions.
- Modify `src/components/layout/navbarFilters.svelte`,
  `src/components/layout/popupSort.svelte`, and
  `src/components/layout/popupView.svelte` for searchbox create button and
  minimal native-style controls.
- Modify `src/components/pages/pageFilters.svelte`,
  `src/components/pages/pageOps.svelte`, and `src/VaultmanFrame.svelte` so
  minimalStyle and settings changes are reactive.
- Modify `src/components/pages/tabContent.svelte` and
  `src/types/typeUI.ts` for streaming core Search preview results.
- Modify `src/components/pages/pageStatistics.svelte` for reactive counts and
  chunked word count.
- Modify `src/components/layout/navbarPillFab.svelte`,
  `src/components/layout/navbarTabs.svelte`, and `styles.css` for minimal dock
  and icon corrections.
- Add or update focused tests under `test/unit/` for pure logic/service changes
  where the current test harness supports them.

## Tasks

### Task 1: Queue Mode And Queue-Aware Operations

- [ ] Add `operationMode: 'stage' | 'bypass'` to `OperationQueueService`, default
  `stage`.
- [ ] Add `setOperationMode(mode)` and emit `changed` when mode changes.
- [ ] Render a stage/bypass toggle in `QueueIslandComponent` only when
  `queueService.isEmpty`.
- [ ] Convert Files delete to queue mode by staging a `file_delete`-style
  operation or executing direct only in bypass.
- [ ] Convert Tags rename/delete/inline-to-frontmatter to stage by default and
  bypass only when queue mode is `bypass`.
- [ ] Verify with focused tests or build-time type coverage that queue mode does
  not appear as pending work.

### Task 2: Files Explorer Core Parity

- [ ] Add folder metadata sufficient for `TFolder` context menus.
- [ ] Expand ancestors when file or folder search produces matching files.
- [ ] Add methods to Files Explorer for `createNote`, `createFolder`,
  `expandAll`, `collapseAll`, `autoRevealActiveFile`, and sort-order changes
  that match core labels.
- [ ] Route file/folder context menus through native file-menu population first,
  then append Vaultman actions.
- [ ] Keep tree view as default and keep folders before files at every level.

### Task 3: Header Sort/View/Search Controls

- [ ] Add the create button inside the searchbox to the right of the category
  toggle.
- [ ] In files tab, create note/folder according to the current search category.
- [ ] In props/tags, use the existing add/stage mode rather than rendering an
  inert create placeholder.
- [ ] Make minimal sort/view controls use `clickable-icon nav-action-button`
  and native menu/list visual treatment.
- [ ] Keep view pills as multi-select toggles with at least one identity cell
  visible.

### Task 4: Content Preview And Property Types

- [ ] Stream Content preview updates during scanning and keep a loading state.
- [ ] Replace custom preview classes with Obsidian core Search result classes.
- [ ] Resolve prop types through `metadataTypeManager` when available and
  preserve requested type icons.
- [ ] Call native property type manager APIs for type changes when available.

### Task 5: Statistics And Minimal Style Reactivity

- [ ] Make stats recompute on filter, queue, metadata, vault modify/create,
  delete, and rename events.
- [ ] Compute word count by reading files in chunks and cancel stale runs.
- [ ] Pass `minimalStyle` to BottomNav and page ops via settings revision, not
  direct non-reactive settings reads.
- [ ] Make the minimal dock solid and make side actions
  `clickable-icon nav-action-button`.
- [ ] Fix queue FAB tooltip/label reactivity and avoid double icons.
- [ ] Move `lucide-archive` to `tab_props`; restore Filters page icon to
  `lucide-filter`.

### Task 6: Verification

- [ ] Run targeted unit tests for file tree/search reveal and queue mode if
  added.
- [ ] Run Svelte autofixer on edited `.svelte` files.
- [ ] Run `pnpm run verify`.
- [ ] Run `pnpm run build`.
- [ ] Sync the built plugin to `plugin-dev`.
- [ ] Run `obsidian vault=plugin-dev plugin:reload id=vaultman`.
- [ ] Run DOM/eval smokes for minimalStyle, core search classes, file explorer
  toolbar/menu parity, and stats word count.
- [ ] Run `obsidian vault=plugin-dev dev:errors`.

## Plan Self-Review

- Spec coverage: every accepted requirement maps to one of Tasks 1-6.
- Placeholder scan: no placeholder-only task remains.
- Type consistency: queue mode is service-owned; search reveal is file-panel
  owned; stats reactivity is page-owned; native menu parity is context-menu
  service-owned.
- Stable branch guard: docs stay in the `.agents` branch, not in the hotfix
  worktree.

## Execution Evidence

Completed in stable hotfix worktree
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`.

- Product commit: `f4d9a97 fix(stable): align explorers with core parity`.
- Local gate: `pnpm run verify` passed after the final patch. Evidence:
  `eslint .`; `tsc -noEmit -skipLibCheck && svelte-check --tsconfig ./tsconfig.json`
  with `svelte-check found 0 errors and 0 warnings`; Prettier check passed;
  `stylelint styles.css`; production `build:plugin`; unit tests passed
  `2 files / 4 tests`; scorecard regression scan passed `17 checks`.
- Svelte autofixer: edited Svelte files were checked; `navbarTabs.svelte` and
  `tabContent.svelte` real keyed-each issues were fixed and rechecked clean.
  A later `VaultmanFrame.svelte` autofixer invocation timed out; the fresh
  `svelte-check`/verify gate remained clean.
- Runtime sync: copied `main.js`, `manifest.json`, and `styles.css` to
  `C:\Users\vic_A\Desktop\plugin-dev\.obsidian\plugins\vaultman`, then ran
  `obsidian vault=plugin-dev plugin:reload id=vaultman`.
- Runtime errors: after clearing the CLI error buffer and reloading/opening
  Vaultman, `obsidian vault=plugin-dev dev:errors` returned
  `No errors captured`.
- Runtime smokes:
  - Minimal style was active/reactive; dock actions rendered as
    `clickable-icon nav-action-button vaultman-nav-dock-action`.
  - Filters page icon rendered `lucide-filter`; `tab_props` rendered
    `lucide-archive`.
  - Operations page showed Queue and Active filters FABs; Queue empty island
    showed Stage/Bypass with Stage active.
  - Statistics page showed only locked Add-ons FAB with
    `vaultman-backdrop-lock`; stats cards and word count rendered.
  - Files search for `note-99` survived `filterService.clearFilters()` and
    rendered ancestor folder rows plus matching files.
  - Content preview used core Search classes and rendered file title, match row,
    and matched-text snippets for `Roadmap` in the narrowed Vaultman scope.
- Stable guard: the hotfix worktree contains no `AGENTS.md`, `CLAUDE.md`,
  `.agents`, `.claude`, or `.codex` files.
