---
title: U121-003 plan 08 - value operations
type: implementation-plan-shard
status: approved
parent: "[[index|U121-003 corrective implementation plan]]"
spec: "[[../spec-2026-08-02-corrective-primitives/07-value-operations|Spec shard 07]]"
created_by: claude-opus-5-root
updated_by: claude-opus-5-root
dateCreated: 2026-08-02
updated: 2026-08-02
---

# 08 — Value operations: labels, `Add to files`, property type

Implements sections A, C and D of
[[../spec-2026-08-02-corrective-primitives/07-value-operations|spec shard 07]].
Section B (`Move to prop...`) is planned in
[[08-value-operations-part-2|part 2]], which continues the task numbering.

## State this shard was planned against

Planned on 2026-08-02 against `claude/u121-029-panel-widget` at `26499dde`, after
plan shards 01–05 landed. The contracts this shard consumes therefore exist and
are named:

| Contract | File | Used for |
| --- | --- | --- |
| `buildOperationTargetSet` | `src/logic/logicOperationTargetSet.ts` | the origin set of every operation here |
| `resolveCellCapabilities` | `src/logic/logicCellCapabilities.ts` | hiding operations whose Cells are unavailable |
| `NodeSelectionAxon` | `src/logic/logicNodeSelection.ts` | the selected half of the origin set |
| `PropertyTypeService.setType` | `src/services/servicePropertyType.ts` | the only writer of `types.json`, reached through the queue |
| `coercePropertyValueForWidget` | `src/logic/propertyValueCoercion.ts` | keeping a written value's runtime type (added by the 2026-08-02 type-flip fix) |

The `add` gesture this shard converts into an operation lives at
`explorerProps.ts:593-707` (`interactionMode = 'add'`, `PropertyChange{action:'add'}`
writing an empty value, guarded by `action === 'add' && !meta.isValueNode`) and
`explorerTags.ts:858-877` (`TagChange{action:'add'}` with its duplicate guard).

## Task 8.1 — Correct the `Include as filter` label

**Files:**

- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`
- Modify or create: `test/unit/i18nLabels.test.ts`

- [x] Record `git rev-parse HEAD` and `git status --short`; preserve every dirty
  change that is not yours.
- [x] Add tests requiring `explorer.ctx.filter_include` to resolve to
  `Include as filter` / `Incluir como filtro`, `explorer.ctx.filter_exclude` to
  stay `Exclude as filter` / `Excluir como filtro`, and the two
  `folder.ctx.filter_*` keys to keep their current phrasing.
- [x] Add a test proving the key itself is unchanged: the persistence identifier
  is the key, so a rename of the key is a data migration, not a label fix.
- [x] Run the focused suite and confirm RED on the two include strings.
- [x] Change only the two display strings.
- [x] Re-run focused tests, confirm GREEN, and run `pnpm run check`.

## Task 8.2 — Make `Add to files` an operation with a stated blast radius

**Files:**

- Create: `src/logic/logicAddToFiles.ts`
- Create: `test/unit/addToFiles.test.ts`
- Modify: `src/components/containers/explorerProps.ts`, `explorerTags.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`
- Modify: `test/unit/propertyContextMenu.test.ts`

- [x] Add pure tests for a `buildAddToFilesPlan` that takes an
  `OperationTargetSet` plus the destination file list and returns one plan per
  target:
  - a tag target appends the tag with the existing duplicate guard;
  - a property target creates the key with an empty value, unchanged from today;
  - a **value target writes its value**, which is the branch that does not exist;
  - a value target whose destination property already holds a list appends with a
    duplicate guard;
  - a value target whose destination property holds a scalar is reported as a
    collision for the conflict policy of part 2, not silently overwritten.
- [x] Add tests proving the written value keeps its runtime type by routing
  through `coercePropertyValueForWidget`, so adding `42` to a `number` property
  does not write the string.
- [x] Add tests proving the destination is `filterService.filteredFiles` and
  never `filteredVaultFiles`. `applyFilters` already intersects with
  `getMarkdownFiles()` (`serviceFilter.ts:760-803`), so the markdown-only
  requirement is satisfied by using the right list, not by re-filtering.
- [x] Add tests for the label projection: the menu label carries the destination
  count (`Add to 412 files`), the count is read when the plan is built rather
  than when the menu was opened, and a zero count produces a **disabled** entry
  that is still visible with `0`.
- [x] Add a mixed-kind test proving the entry is hidden when the target set mixes
  kinds whose add semantics differ, per the intersection rule of shard 03.
- [x] Run the new suite and confirm RED because the module does not exist.
- [x] Implement `logicAddToFiles.ts` as pure logic over the target set and a
  destination list. It returns plans; it does not call the queue, the filter
  service or the vault.
- [x] Register `add-to-files` as a context-menu action on tag, prop and value
  nodes through the existing `ContextMenuService`, with its `when` returning the
  intersection result and its label built from the plan count.
- [x] Route the registered action through `queueService.addOrRun`, preserving the
  `settings.bulkOperationWarningThreshold` warning
  (`explorer.queue.threshold_warning`) unchanged.
- [x] Keep `interactionMode = 'add'` working as it does today. This task adds a
  menu path to the same operation; it does not remove the gesture, and the two
  must produce the identical queued change for the same target.
- [x] Re-run focused tests, confirm GREEN, run `pnpm run check`.

## Task 8.3 — `Property type` submenu on node_prop

**Files:**

- Create: `src/logic/logicPropertyTypeMenu.ts`
- Create: `test/unit/propertyTypeMenu.test.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`
- Modify: `test/unit/explorerPropsContextMenuSource.test.ts`

- [x] Add pure tests for the submenu projection:
  - the assignable list is exactly `text`, `list`, `number`, `checkbox`, `date`,
    `datetime`;
  - `tags`, `aliases` and `cssclasses` appear as the **current** type when they
    apply and are not assignable, matching Core;
  - the current type is marked and is not offered as a change;
  - the submenu is registered on node_prop only, and is absent on node_value.
- [x] Add a test proving the chosen type dispatches a `change_type`
  `PropertyChange` carrying the `NATIVE_SET_PROP_TYPE` sentinel, and a guard
  proving the menu path never calls `PropertyTypeService.setType` directly —
  calling it directly would bypass the queue and the bypass confirmation.
- [x] Add a test proving `Convert` stays registered on node_value with its
  existing `text`/`list` gate (`propertyValueCoercion.ts`
  `availablePropertyValueConversions`). The two menus are separate and neither
  replaces the other.
- [x] Run the focused suites and confirm RED.
- [x] Implement the pure projection, then register the submenu in
  `explorerProps.ts` beside the existing prop actions.
- [x] Re-run focused tests, confirm GREEN, run `pnpm run check` and the Svelte
  autofixer on any touched `.svelte`.

## Definition of done for this shard

- The two include labels read `Include as filter` / `Incluir como filtro` and no
  persistence key changed.
- `Add to files` is invokable from the context menu for tags, properties and
  values, states its destination count, and writes a value target's value with
  the property's runtime type.
- The empty-property behavior of a property target is unchanged.
- `Property type` is assignable from node_prop only, through a queued
  `change_type` operation.
- Focused suites, `pnpm run check`, `pnpm run lint` and Stylelint pass.

## Adversarial notes carried from the spec

- The count in the label is read at build time, so a filter change between
  opening the menu and confirming cannot make the shown count a lie.
- An empty filter result yields a disabled entry with `0` rather than a hidden
  one, because a missing entry reads as a bug and a disabled one states the
  reason.
- A scalar collision is not resolved here. It is handed to the conflict policy in
  part 2 so both operations resolve collisions the same way.

## Execution record — 2026-08-02, claude-opus-5-root

Executed on `claude/u121-029-panel-widget`. Deviations from the plan as written,
recorded because the checkboxes above are ticked and the names moved:

| Planned | Landed | Why |
| --- | --- | --- |
| `buildAddToFilesPlan(targetSet, files)` | `applyAddToFile(target, frontmatter)` + `addToFilesAvailability(targets, count)` | the queue calls `logicFunc(file, fm)` per file, so the pure decision is per file; a plan object would have been a wrapper that only the tests used |
| `test/unit/i18nLabels.test.ts` | `test/unit/filterMenuLabels.test.ts` | `filterI18n.test.ts` already owned the filter copy; the new file names what it locks |
| `src/logic/logicPropertyTypeMenu.ts` | not created | the submenu already existed over `EDITABLE_PROP_TYPE_OPTIONS`; a new module would have been a second projection of the same list |
| disabled menu entry at count 0 | entry stays visible, `run` reports the empty filter | `ActionDef` has no `disabled` field; adding one is a contract change this task does not need |

**Task 8.3 was already implemented** when this shard ran: `prop.type-*` was
registered on node_prop over the six assignable types and queued through
`NATIVE_SET_PROP_TYPE`. What the task actually contributed is the set of locks
the spec asks for, plus the one real gap — a property whose type is a derived
kind (`tags`, `aliases`, `cssclasses`) opened a submenu with nothing marked, so
the menu said nothing about the current type. `DERIVED_PROP_TYPE_OPTIONS` now
projects it as a checked, inert entry, matching Core.

**First consumer of two shard-03/05 contracts.** `buildOperationTargetSet` and
`PropertyValueInteractionPort` had landed as modules with no callers.
`Add to files` is the first caller of the target set. The interaction port still
has none: the inline rename calls `_replaceValueInVault` directly, which task
5.2 of shard 05 owns.

Commits: `e3806e62` (labels), `3722c7b6` (`Add to files`), `c6c98a25` (property
type). Gates per commit: focused suites green (12 + 17 + 18), `tsc` clean,
ESLint clean. The full unit suite and the exact-build smoke belong to shard 06
and have not been run for these commits.
