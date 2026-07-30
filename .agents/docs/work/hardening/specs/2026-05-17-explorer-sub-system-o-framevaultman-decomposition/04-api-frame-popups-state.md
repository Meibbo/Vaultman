---
title: FramePopupsState API contract
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O frameVaultman decomposition]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/spec
  - explorer/frame
  - explorer/refactor
---

# `FramePopupsState` API Contract

## File

`src/components/frame/framePopups.svelte.ts`

## Symbol context key

```ts
export const FRAME_POPUPS_KEY: unique symbol = Symbol('frame.popups');
```

## Constructor signature

```ts
export class FramePopupsState {
  constructor(plugin: VaultmanPlugin, overlays: FrameOverlayController);
}
```

- `plugin` — used for `plugin.settings`, `plugin.saveSettings()`, `plugin.filterService`, `plugin.queueService`, `plugin.app` (for `FolderSuggest`).
- `overlays` — used for `overlays.closePopup()` after scope / move popup actions.

The popups class is **constructable in any order relative to `FrameNavigationService`** — they share `overlays` but neither references the other. Both are created in frame, both are `setContext`-ed, both are independently consumable.

## Scope popup

```ts
readonly scopeOptions: ReadonlyArray<{
  value: string;
  label: string;
  icon: string;
}>;

setScope(value: string): void;
//   - filtersOperationScope = normalizeOperationScope(value as OperationScope)
//   - plugin.settings.explorerOperationScope = filtersOperationScope
//   - void plugin.saveSettings()
//   - overlays.closePopup()

setFiltersOperationScope(value: OperationScope): void;
//   - same as setScope but without closing the popup
//   - bound as the `onOperationScopeChange` callback for FiltersPage
```

`scopeOptions` is a frozen array built once in the constructor; it references the i18n `translate(...)` calls from `index/i18n/lang`.

The current `filtersOperationScope` $state stays in frame (it's read by FiltersPage `bind:filtersOperationScope`); the popup service mutates it via the setter pair.

**Decision point — does `filtersOperationScope` move into popups?**
It's both (a) the user's scope choice (popup concern) and (b) the filters page binding (downstream consumer's contract). Two shapes:

- **A:** stays in frame `$state`, popups class mutates via setter.
  Simpler — matches today's structure.
- **B:** moves into popups class as `popups.filtersOperationScope` (get/set), FiltersPage binds to `popups.filtersOperationScope`.

**Recommendation:** A — keep `filtersOperationScope` in frame. The state is read more by FiltersPage than written by popups; moving it into popups creates an awkward situation where a "popups" class owns state that survives popup close.

## Active filters popup

```ts
get activeFilterRules(): ActiveFilterRule[];

refreshActiveFiltersPopup(): void;
//   - activeFilterRules = collectActiveFilterRules(plugin.filterService.activeFilter)

toggleFilterRule(rule: ActiveFilterRule): void;
//   - if (rule.node.id) plugin.filterService.toggleFilterRule(rule.node.id)
//   - refreshActiveFiltersPopup()

deleteFilterRule(rule: ActiveFilterRule): void;
//   - plugin.filterService.removeNode(rule.node, rule.parent)
//   - refreshActiveFiltersPopup()
//   - emit a 'stats-dirty' signal so frame's updateStats() is called
```

The `updateStats()` callback today is a frame function that updates the frame's counters. Popups need to trigger it on delete.

Two options:

- **A:** popups class accepts an `onStatsDirty: () => void` callback in its constructor; calls it from `deleteFilterRule`.
- **B:** popups class emits an event (custom event dispatcher) and frame subscribes.

**Recommendation:** A — `onStatsDirty: () => void` callback. Simpler than introducing an event abstraction. Constructor:

```ts
constructor(
  plugin: VaultmanPlugin,
  overlays: FrameOverlayController,
  onStatsDirty: () => void,
);
```

## Search popup

```ts
get searchName(): string;
set searchName(v: string);

get searchFolder(): string;
set searchFolder(v: string);
```

The current frame `$effect` that routes search to `fileList` and `plugin.filterService` cannot move into popups cleanly because it reads `fileList` (which lives in frame as a bound `$state`). Two shapes:

- **A:** popups owns `searchName` / `searchFolder` $state; the routing $effect stays in frame and reads `popups.searchName` / `popups.searchFolder`.
- **B:** popups owns state AND the routing $effect; constructor takes a `getFileList: () => explorerFiles | undefined` accessor.

**Recommendation:** A — state in popups, effect in frame. Symmetric with the filters-search routing decision in `FrameNavigationService` shard 03: effects that consume frame-only state stay in frame.

## Move popup

```ts
get moveTargetFiles(): TFile[];
set moveTargetFiles(v: TFile[]);

get moveTargetFolder(): string;
set moveTargetFolder(v: string);

get movePreviews(): MovePreview[];   // $derived from createMovePreviews

queueMoves(): void;
//   - const changes = createMoveChanges(this.moveTargetFiles, this.moveTargetFolder)
//   - void plugin.queueService.addBatch(changes)
//   - overlays.closePopup()

attachFolderSuggest(el: HTMLElement): { destroy(): void };
//   - new FolderSuggest(plugin.app, el as HTMLInputElement, (path: string) => {
//       this.moveTargetFolder = path;
//       (el as HTMLInputElement).value = path;
//     })
//   - returns { destroy() { suggest.close(); } } per Svelte action contract
```

`createMoveChanges` and `createMovePreviews` are existing helpers in `frameMoves.ts`. Popups imports them directly — they remain unchanged.

## Frame consumption pattern

Frame after Commit 2:

```svelte
<script>
  const popups = new FramePopupsState(
    plugin,
    overlays,
    () => updateStats(), // onStatsDirty
  );
  setContext(FRAME_POPUPS_KEY, popups);

  // Active filters popup refresh — 3-line $effect
  $effect(() => {
    if (overlays.activePopup === 'active-filters' && overlays.popupOpen) {
      popups.refreshActiveFiltersPopup();
    }
  });

  // Search routing — stays in frame because fileList lives here
  $effect(() => {
    const filesSearchTerm = getFiltersSearch(filtersSearchByTab, 'files');
    if (!popups.searchName && !popups.searchFolder && filesSearchTerm) return;
    fileList?.setSearchFilter(popups.searchName, popups.searchFolder);
    plugin.filterService.setSearchFilter(popups.searchName, popups.searchFolder);
  });
</script>

<!-- PopupOverlay threading — passes from popups now, behavior unchanged -->
<PopupOverlay
  {plugin}
  activePopup={overlays.activePopup}
  popupOpen={overlays.popupOpen}
  closePopup={() => overlays.closePopup()}
  activeFilterRules={popups.activeFilterRules}
  refreshActiveFiltersPopup={() => popups.refreshActiveFiltersPopup()}
  updateStats={updateStats}
  toggleFilterRule={(r) => popups.toggleFilterRule(r)}
  deleteFilterRule={(r) => popups.deleteFilterRule(r)}
  scopeOptions={popups.scopeOptions}
  setScope={(v) => popups.setScope(v)}
  bind:searchName={popups.searchName}
  bind:searchFolder={popups.searchFolder}
  moveTargetFiles={popups.moveTargetFiles}
  bind:moveTargetFolder={popups.moveTargetFolder}
  movePreviews={popups.movePreviews}
  attachFolderSuggest={(el) => popups.attachFolderSuggest(el)}
  queueMoves={() => popups.queueMoves()}
  {icon}
/>
```

`PopupOverlay`'s prop signature is unchanged. Only the source of the values + handlers changes (popups class instead of inline).

## Removed from frame after Commit 2

- `scopeOptions` array declaration
- `setScope` / `setFiltersOperationScope` functions
- `activeFilterRules` $state
- `refreshActiveFiltersPopup` / `toggleFilterRule` / `deleteFilterRule` functions
- `searchName` / `searchFolder` $state
- `moveTargetFiles` / `moveTargetFolder` / `movePreviews` state
- `queueMoves` / `attachFolderSuggest` functions

The `<PopupOverlay>` mount stays in frame because it's a render-tree sibling of `vm-view`. Threading shifts from inline values to `popups.X` accessors.
