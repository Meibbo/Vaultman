---
title: Agent Brain Pending Ledger
status: active
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]"
---

# Agent Brain Pending Ledger

## Release-Blocking Verification Still Not Done

Status: `pending`.

These items survive from the hardening audit and cut ladder:

- Cut 10: user-facing view-size control.
- Cut 11: cursor affordance and cheap hover behavior.
- Cut 12: explorer search, external refresh, hierarchy, and keyboard
  verification.
- Cut 13: queue correctness and visible queue UI audit.
- Cut 14: file/grid operation parity.
- Cut 15: active filter highlighting and badge bubbling verification.
- Cut 16: inline or in-frame rename decision and implementation.
- Cut 17: menu/popup overlay behavior.
- Cut 18: performance verification.

Concrete checks still named in the backlog include search filters preserving
ancestors, search category toggles, properties/tags visible-row refresh after
external metadata changes, Files nested folders with filters, sort arrows,
default alpha sort, sort target controls, outside click behavior, column
controls, show-selected-only/select-all behavior, low-frequency property
operation counts, stale counts, large `viewDiff`, queue row focus/filter,
inactive page render cost, overlay push/scroll jumps, and responsive nav.

## V1 Polish Still Not Done

Status: `pending`.

- Cut 19: Bases parity filters.
- Cut 20: editable file matrix and table density beyond read-only table MVP.
- Cut 21: theme variants.
- Cut 22: navbar/workspace UX polish.
- Cut 23: explorer polish bundle.
- Cut 24: programmable interface foundation.

These map to archived `out-hardening` scope and should not be treated as
cancelled just because they are old.

## Post-RC.1 Holding Still Not Done

Status: `pending`, but not release-blocking unless user reclassifies it.

- `serviceMarks`.
- `tabMarks`.
- manual sort via marks.
- Templates settings and real templates consumers.
- `tabLinter` surface wiring if revived.

Current code evidence: `serviceTemplatesIndex.ts` is still a stub, `tabLinter`
exists but is not wired into page tools, and no `serviceMarks`/`tabMarks`
implementation is present.

## Archived Roadmap Items Still Not Done

Status: `pending`, except where marked.

- Search plugin augmentation: `Send to Vaultman` and Search-results-as-scope.
- Bulk tag rename/merge operations in queue.
- DnD for all tree nodes.
- Deeper keyboard navigation and multi-select verification.
- Coming Soon overlays for intentionally disabled surfaces.
- Health check for broken frontmatter and duplicates.
- Central variables/settings store beyond current narrow settings fields.
- Native context menu injection follow-through.
- Sidebar tab editor and mobile behavior.
- Bottom bar replacement.
- Visual intercept picker for context menu selection: `deferred`.

## Queue Contract Drift

Status: `partial`.

Old queue audit statements that `size` is stuck at zero are superseded: current
code computes `size` from logical operation count. However, `pending` remains a
`$state<PendingChange[]>` surface and current ingestion does not append to it.

Pending decision: either remove/retire `pending` from public expectations or
reconnect it to transaction ingestion with tests. Do not keep both meanings
unexplained.

## Explorer And Grid Regression Docs

Status: `partial`.

Superseded:

- `showSelectedOnly` exists in current explorer/file paths.
- hierarchical node grid and table tests exist.
- current TanStack table replaces older read-only grid ambitions.

Still pending:

- select-all variants and indeterminate master checkbox behavior;
- selected-only isolation verification across filters;
- external metadata refresh in visible virtual rows;
- file/grid operations parity for move/delete/rename/tag/props paths;
- inline editing and persisted column layout if table moves beyond MVP.

## Lifecycle And Event Safety

Status: `pending`.

Archived lifecycle specs are not implemented. Current code still creates
functional indexes in `main.ts` and registers many events centrally. Current
`frameVaultman.svelte` subscribes to `metadataCache.on('resolved', ...)` in
`onMount` and manually unregisters it, but it does not receive a `leaf` prop
for leaf-bound lifecycle cleanup.

## Superseded Or Already Covered

Status: `superseded/done`.

- Generic performance over 1000 nodes.
- Tree rerender scroll reset.
- View reset on active filters.
- Older inline grid expansion plan.
- Queue count zero bug as originally stated.
- FnR "not implemented" notes where current service/UI now exists.
- Hover quick-action badge gaps where current multi-facet badges cover the
  intent.
- Old shadcn/Tailwind research suggestions as broad mandates; they remain
  research constraints only.
