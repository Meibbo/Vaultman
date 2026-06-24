---
title: "Operations suite live handoff"
type: implementation-handoff
status: active
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T19:49:00
updated: 2026-05-04T21:00:23
tags:
  - agent/handoff
  - hardening/logic
  - logic/queue
  - visuals/explorer
---

# Operations Suite Live Handoff

## Scope

User-reported operation suite regressions:

- Some property/tag nodes could not be added to the queue.
- Adding accepted nodes to the queue felt slow.
- Queue counts were per-file/per-op instead of logical operations.
- Queue list showed one bulk operation as many node rows.
- Core Obsidian could see/delete `pressBarBench`, but Vaultman could not handle it reliably.
- After core or Vaultman changed metadata, Vaultman property/tag explorer lists could stay stale.

## Fixed In Current Working Tree

- Queue add path now uses lazy frontmatter-only VFS for frontmatter-only operations.
- Queue logical count is grouped by `changeId ?? op.id`; `size` returns logical count.
- `OperationQueueService.remove(id)` removes all per-file staged ops that share the same logical change id.
- `indexOperations` groups staged ops by logical change id and preserves semantic target fields:
  `property` and `tag`.
- Props explorer queues precise operations:
  add property, native property rename, delete property, list/scalar value rename, and list/scalar value delete.
- Tags explorer queues tag add/delete operations instead of editing files immediately.
- `ViewService` maps semantic operations and active filters onto prop, value, tag, and file rows.
- `panelExplorer.svelte` passes `operationsIndex` and `activeFiltersIndex` into explorer providers for row state.
- `explorerProps` and `explorerTags` now invalidate their internal logic cache before reading the tree, preventing stale lists after external Obsidian metadata changes.
- `logicKeyboard` drives tree selection/focus and panel activation can apply to compatible selected nodes.
- Collapsed tree descendants bubble operation/filter badges to the visible parent as inherited child indicators.
- Queue badges now remove the matching logical queue operation on single click.
- File node activation no longer opens the note by default; it creates a replaceable selected-files filter group with exact `file_path` child rules.

## Live Obsidian Evidence

After `pnpm run build` and `obsidian plugin:reload id=vaultman`, Obsidian CLI confirmed:

- `getAllPropertyInfos()` resolves lower-case query `pressbarbench` to canonical `pressBarBench`.
- Metadata has exactly 2 matching files:
  `+/Untitled 8.md` and `+/2026-01-29-1024 Smartfit session.md`.
- Safe queue probe using `queueService.addAsync()` did not write files.
- Result:
  `logical: 1`, `fileCount: 2`, `opCount: 2`.
- `operationsIndex` exposed one row:
  `group: delete_prop`, `property: pressBarBench`, files set to the two matching notes.
- Cleanup returned queue and operations index to zero.

`obsidian dev:errors` still shows a vault YAML parse error in an unrelated note and ResizeObserver warnings; no Vaultman stack was observed. `obsidian dev:console level=error` reported debugger capture was not attached.

## Verification

- `pnpm run test:unit -- --run test/unit/components/explorerProps.test.ts test/unit/components/explorerTags.test.ts`
- `pnpm run test:unit`
- `pnpm run lint`
- `pnpm run check`
- `pnpm run test:component`
- `pnpm run build`
- `obsidian plugin:reload id=vaultman`
- Obsidian CLI live safe queue probe for `pressBarBench`

## Deferred Requirements

- Property rename still opens a modal. Next design should route rename into the smart navbar searchbox/FnR surface instead.
- `serviceFnR` is not implemented yet. User wants `boxSearch`/`navbarExplorer`/`navTools` to become a smart component with search and optional replace input, ant-renamer style tools, regex, categories/subcategories as labels/pills, clear button, more-options control, and top-expanding island mode.
- Active filters still flatten selected-files child rules visually; the filter tree now stores the `N selected files` group, but the popup/list projection should expose the group row with child file rows.
- Badge click currently removes queued operations. The next visual/action layer should add hover quick-action badges for enqueueing new operations from a node or selected node group.
