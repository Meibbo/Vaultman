---
title: 02 — FramePopupsState extraction (C2)
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O plan]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/plan
  - explorer/frame
  - explorer/refactor
---

# Commit 2 — Extract `FramePopupsState`

**Goal:** Move scope / active-filters / search / move popup state + mutations into `src/components/frame/framePopups.svelte.ts`. Frame instantiates and `setContext`s the class. `<PopupOverlay>` mount stays in frame but reads values from `popups.X`.

**Spec reference:** [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/04-api-frame-popups-state|04 — FramePopupsState API contract]].

**Estimated LOC delta:**
- Create `src/components/frame/framePopups.svelte.ts`: 0 → ~120 LOC.
- Modify `src/components/frame/frameVaultman.svelte`: ~720 → ~640 LOC (≈ -80).
- New test `test/component/framePopupsState.test.ts`: 0 → ~180 LOC.

## Files

- **Create:** `src/components/frame/framePopups.svelte.ts`
- **Create:** `test/component/framePopupsState.test.ts`
- **Modify:** `src/components/frame/frameVaultman.svelte`

---

## Task 2.1: Write failing tests for `FramePopupsState`

- [ ] **Step 1: Create `test/component/framePopupsState.test.ts`**

```typescript
// test/component/framePopupsState.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FramePopupsState,
  FRAME_POPUPS_KEY,
} from '../../src/components/frame/framePopups.svelte';
import type { FrameOverlayController } from '../../src/components/frame/frameOverlays.svelte';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

function makeOverlaysMock() {
  return {
    activePopup: null,
    popupOpen: false,
    isIslandOpen: false,
    closePopup: vi.fn(),
    closeQueueIsland: vi.fn(),
    closeFiltersIsland: vi.fn(),
  } as unknown as FrameOverlayController & {
    closePopup: ReturnType<typeof vi.fn>;
  };
}

vi.mock('../../src/utils/autocomplete', () => ({
  FolderSuggest: vi.fn().mockImplementation((_app, _input, _cb) => ({
    close: vi.fn(),
  })),
}));

function makePopups(opts: { onStatsDirty?: () => void } = {}) {
  const plugin = makeMockPlugin();
  const overlays = makeOverlaysMock();
  const onStatsDirty = opts.onStatsDirty ?? vi.fn();
  const popups = new FramePopupsState(plugin, overlays as unknown as FrameOverlayController, onStatsDirty);
  return { popups, plugin, overlays, onStatsDirty };
}

describe('FramePopupsState — context key', () => {
  it('exports FRAME_POPUPS_KEY as a Symbol', () => {
    expect(typeof FRAME_POPUPS_KEY).toBe('symbol');
    expect(String(FRAME_POPUPS_KEY)).toContain('frame.popups');
  });
});

describe('FramePopupsState — scope popup', () => {
  it('scopeOptions is a frozen array with 3 entries', () => {
    const { popups } = makePopups();
    expect(popups.scopeOptions).toHaveLength(3);
    expect(() => {
      (popups.scopeOptions as { value: string }[])[0].value = 'mutated';
    }).toThrow();
  });

  it('setScope writes plugin.settings + calls saveSettings + closes popup', () => {
    const { popups, plugin, overlays } = makePopups();
    popups.setScope('selected');
    expect(plugin.settings.explorerOperationScope).toBe('selected');
    expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
    expect(overlays.closePopup).toHaveBeenCalledTimes(1);
  });

  it('setFiltersOperationScope writes settings without closing popup', () => {
    const { popups, plugin, overlays } = makePopups();
    popups.setFiltersOperationScope('filtered');
    expect(plugin.settings.explorerOperationScope).toBe('filtered');
    expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
    expect(overlays.closePopup).not.toHaveBeenCalled();
  });
});

describe('FramePopupsState — active filters popup', () => {
  it('refreshActiveFiltersPopup populates activeFilterRules from filterService', () => {
    const { popups, plugin } = makePopups();
    plugin.filterService.activeFilter = {
      type: 'group',
      op: 'and',
      children: [
        { type: 'rule', id: 'r1', filterType: 'has_property', property: 'tags' } as never,
      ],
    };
    popups.refreshActiveFiltersPopup();
    expect(popups.activeFilterRules.length).toBe(1);
  });

  it('toggleFilterRule with truthy node.id calls filterService.toggleFilterRule', () => {
    const { popups, plugin } = makePopups();
    plugin.filterService.activeFilter = {
      type: 'group',
      op: 'and',
      children: [
        { type: 'rule', id: 'r1', filterType: 'has_property', property: 'tags' } as never,
      ],
    };
    popups.refreshActiveFiltersPopup();
    const rule = popups.activeFilterRules[0];
    popups.toggleFilterRule(rule);
    expect(plugin.filterService.toggleFilterRule).toHaveBeenCalledWith('r1');
  });

  it('toggleFilterRule no-op when node.id is falsy', () => {
    const { popups, plugin } = makePopups();
    const rule = {
      id: 'rule-0',
      description: '',
      node: { type: 'rule', filterType: 'has_property' } as never,
      parent: { type: 'group', op: 'and', children: [] } as never,
      enabled: true,
    };
    popups.toggleFilterRule(rule);
    expect(plugin.filterService.toggleFilterRule).not.toHaveBeenCalled();
  });

  it('deleteFilterRule calls removeNode + refresh + onStatsDirty', () => {
    const { popups, plugin, onStatsDirty } = makePopups();
    const rule = {
      id: 'rule-0',
      description: '',
      node: { type: 'rule', id: 'r1', filterType: 'has_property' } as never,
      parent: { type: 'group', op: 'and', children: [] } as never,
      enabled: true,
    };
    popups.deleteFilterRule(rule);
    expect(plugin.filterService.removeNode).toHaveBeenCalledWith(rule.node, rule.parent);
    expect(onStatsDirty).toHaveBeenCalledTimes(1);
  });
});

describe('FramePopupsState — search popup', () => {
  it('searchName get/set is reactive', () => {
    const { popups } = makePopups();
    expect(popups.searchName).toBe('');
    popups.searchName = 'foo';
    expect(popups.searchName).toBe('foo');
  });

  it('searchFolder get/set is reactive', () => {
    const { popups } = makePopups();
    popups.searchFolder = 'docs';
    expect(popups.searchFolder).toBe('docs');
  });
});

describe('FramePopupsState — move popup', () => {
  it('moveTargetFiles get/set is reactive', () => {
    const { popups } = makePopups();
    const files = [{ path: 'a.md', name: 'a.md' }] as never;
    popups.moveTargetFiles = files;
    expect(popups.moveTargetFiles).toBe(files);
  });

  it('moveTargetFolder get/set is reactive', () => {
    const { popups } = makePopups();
    popups.moveTargetFolder = 'archive';
    expect(popups.moveTargetFolder).toBe('archive');
  });

  it('movePreviews derives from files + folder', () => {
    const { popups } = makePopups();
    popups.moveTargetFiles = [
      { path: 'docs/a.md', name: 'a.md' },
      { path: 'docs/b.md', name: 'b.md' },
    ] as never;
    popups.moveTargetFolder = 'archive';
    expect(popups.movePreviews).toEqual([
      { oldPath: 'docs/a.md', newPath: 'archive/a.md' },
      { oldPath: 'docs/b.md', newPath: 'archive/b.md' },
    ]);
  });

  it('queueMoves builds + dispatches changes then closes popup', () => {
    const { popups, plugin, overlays } = makePopups();
    popups.moveTargetFiles = [{ path: 'a.md', name: 'a.md' }] as never;
    popups.moveTargetFolder = 'archive';
    popups.queueMoves();
    expect(plugin.queueService.addBatch).toHaveBeenCalledTimes(1);
    expect(overlays.closePopup).toHaveBeenCalledTimes(1);
  });

  it('attachFolderSuggest returns destroy() per action contract', () => {
    const { popups } = makePopups();
    const el = document.createElement('input');
    const action = popups.attachFolderSuggest(el);
    expect(typeof action.destroy).toBe('function');
    expect(() => action.destroy()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
pnpm exec vitest run --project component test/component/framePopupsState.test.ts
```

Expected: FAIL — `FramePopupsState`, `FRAME_POPUPS_KEY` undefined.

## Task 2.2: Create `framePopups.svelte.ts`

- [ ] **Step 1: Create the module**

```typescript
// src/components/frame/framePopups.svelte.ts
import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../index/i18n/lang';
import { FolderSuggest } from '../../utils/autocomplete';
import {
  normalizeOperationScope,
  type OperationScope,
} from '../../services/serviceOperationScope';
import {
  collectActiveFilterRules,
  type ActiveFilterRule,
} from './frameActiveFilters';
import { createMoveChanges, createMovePreviews, type MovePreview } from './frameMoves';
import type { FrameOverlayController } from './frameOverlays.svelte';

export const FRAME_POPUPS_KEY: unique symbol = Symbol('frame.popups');

export class FramePopupsState {
  readonly #plugin: VaultmanPlugin;
  readonly #overlays: FrameOverlayController;
  readonly #onStatsDirty: () => void;

  readonly scopeOptions: ReadonlyArray<{ value: string; label: string; icon: string }>;

  #activeFilterRules = $state<ActiveFilterRule[]>([]);
  #searchName = $state('');
  #searchFolder = $state('');
  #moveTargetFiles = $state<TFile[]>([]);
  #moveTargetFolder = $state('');

  constructor(
    plugin: VaultmanPlugin,
    overlays: FrameOverlayController,
    onStatsDirty: () => void,
  ) {
    this.#plugin = plugin;
    this.#overlays = overlays;
    this.#onStatsDirty = onStatsDirty;

    this.scopeOptions = Object.freeze([
      { value: 'auto', label: translate('settings.scope.auto'), icon: 'lucide-sparkles' },
      { value: 'filtered', label: translate('scope.filtered'), icon: 'lucide-filter' },
      { value: 'selected', label: translate('scope.selected'), icon: 'lucide-check-square' },
    ] as const);
  }

  // ─── Scope popup ───

  setScope(value: string): void {
    const normalized = normalizeOperationScope(value as OperationScope);
    this.#plugin.settings.explorerOperationScope = normalized;
    void this.#plugin.saveSettings();
    this.#overlays.closePopup();
  }

  setFiltersOperationScope(value: OperationScope): void {
    const normalized = normalizeOperationScope(value);
    this.#plugin.settings.explorerOperationScope = normalized;
    void this.#plugin.saveSettings();
  }

  // ─── Active-filters popup ───

  get activeFilterRules(): ActiveFilterRule[] {
    return this.#activeFilterRules;
  }

  refreshActiveFiltersPopup(): void {
    this.#activeFilterRules = collectActiveFilterRules(this.#plugin.filterService.activeFilter);
  }

  toggleFilterRule(rule: ActiveFilterRule): void {
    if (rule.node.id) {
      this.#plugin.filterService.toggleFilterRule(rule.node.id);
    }
    this.refreshActiveFiltersPopup();
  }

  deleteFilterRule(rule: ActiveFilterRule): void {
    this.#plugin.filterService.removeNode(rule.node, rule.parent);
    this.refreshActiveFiltersPopup();
    this.#onStatsDirty();
  }

  // ─── Search popup ───

  get searchName(): string {
    return this.#searchName;
  }

  set searchName(v: string) {
    this.#searchName = v;
  }

  get searchFolder(): string {
    return this.#searchFolder;
  }

  set searchFolder(v: string) {
    this.#searchFolder = v;
  }

  // ─── Move popup ───

  get moveTargetFiles(): TFile[] {
    return this.#moveTargetFiles;
  }

  set moveTargetFiles(v: TFile[]) {
    this.#moveTargetFiles = v;
  }

  get moveTargetFolder(): string {
    return this.#moveTargetFolder;
  }

  set moveTargetFolder(v: string) {
    this.#moveTargetFolder = v;
  }

  get movePreviews(): MovePreview[] {
    return createMovePreviews(this.#moveTargetFiles, this.#moveTargetFolder);
  }

  queueMoves(): void {
    const changes = createMoveChanges(this.#moveTargetFiles, this.#moveTargetFolder);
    void this.#plugin.queueService.addBatch(changes);
    this.#overlays.closePopup();
  }

  attachFolderSuggest(el: HTMLElement): { destroy(): void } {
    const suggest = new FolderSuggest(
      this.#plugin.app,
      el as HTMLInputElement,
      (path: string) => {
        this.#moveTargetFolder = path;
        (el as HTMLInputElement).value = path;
      },
    );
    return {
      destroy: () => suggest.close(),
    };
  }
}
```

Note: `movePreviews` is intentionally a plain getter (not `$derived`) because `createMovePreviews` is a pure function. Reading the getter on each access reruns the function — Svelte 5's reactivity tracks the getter call, so the value updates whenever `#moveTargetFiles` or `#moveTargetFolder` mutates. If implementers prefer caching, wrap in `$derived.by` inside the constructor — but the plain getter matches the inline `$derived.by` from the legacy frame (line 505) without behavioral difference.

- [ ] **Step 2: Run the test — expect PASS**

```bash
pnpm exec vitest run --project component test/component/framePopupsState.test.ts
```

Expected: PASS.

The `scopeOptions` frozen-array test only passes if `Object.freeze` is in effect. The implementation uses `Object.freeze([...] as const)` plus `readonly` on the type — combined, mutation throws in strict mode (which vitest uses by default).

- [ ] **Step 3: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors.

## Task 2.3: Refactor `frameVaultman.svelte` to use popups

- [ ] **Step 1: Update imports**

Add after `FrameNavigationService` imports:

```svelte
import { FramePopupsState, FRAME_POPUPS_KEY } from './framePopups.svelte';
```

Remove the existing imports for `FolderSuggest`, `normalizeOperationScope`, `OperationScope`, `collectActiveFilterRules`, `ActiveFilterRule`, `createMoveChanges`, `createMovePreviews` — they're now consumed by `framePopups.svelte.ts` instead.

Keep `countActiveFilterEntries` (used by `updateStats()`).

- [ ] **Step 2: Construct popups, register context**

After the `setContext(FRAME_NAVIGATION_KEY, nav)` line (added in C1), add:

```svelte
const popups = new FramePopupsState(plugin, overlays, () => updateStats());
setContext(FRAME_POPUPS_KEY, popups);
```

`updateStats` is defined later in the frame body — that's fine, the arrow closure captures it lazily.

- [ ] **Step 3: Update the active-filters popup refresh `$effect`**

Replace lines 572-576:

```svelte
$effect(() => {
  if (overlays.activePopup === 'active-filters' && overlays.popupOpen) {
    popups.refreshActiveFiltersPopup();
  }
});
```

- [ ] **Step 4: Update search routing `$effect`**

The search routing `$effect` at lines 468-473 stays in frame (per O2 + spec shard 04 recommendation). Rewrite it to read from `popups.X`:

```svelte
$effect(() => {
  const filesSearchTerm = getFiltersSearch(filtersSearchByTab, 'files');
  if (!popups.searchName && !popups.searchFolder && filesSearchTerm) return;
  fileList?.setSearchFilter(popups.searchName, popups.searchFolder);
  plugin.filterService.setSearchFilter(popups.searchName, popups.searchFolder);
});
```

- [ ] **Step 5: Update `<PopupOverlay>` mount**

Replace the mount at lines 846-866 with:

```svelte
<PopupOverlay
  {plugin}
  activePopup={overlays.activePopup}
  popupOpen={overlays.popupOpen}
  closePopup={() => overlays.closePopup()}
  activeFilterRules={popups.activeFilterRules}
  refreshActiveFiltersPopup={() => popups.refreshActiveFiltersPopup()}
  {updateStats}
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

**Note on `bind:` to popups setters:** The same POC outcome from C1 applies here (`bind:searchName={popups.searchName}` requires `bind:` to work against runes class getter/setter pairs). If the POC was RED in C1, switch each `bind:` here to the explicit prop + callback pattern:

```svelte
searchName={popups.searchName}
onSearchNameChange={(v) => (popups.searchName = v)}
```

This requires no `PopupOverlay` change — Svelte 5 auto-emits the callback for any `$bindable` prop.

- [ ] **Step 6: Delete moved declarations**

From frame, delete:

- `scopeOptions` array declaration (lines 432-448).
- `function setScope` (lines 450-455).
- `function setFiltersOperationScope` (lines 457-461).
- `let searchName = $state('')` + `let searchFolder = $state('')` (lines 465-466).
- The existing search routing `$effect` at lines 468-473 (replaced by the new form at step 4).
- `let activeFilterRules = $state<ActiveFilterRule[]>([])` (line 479).
- `function refreshActiveFiltersPopup` (lines 481-483).
- `function toggleFilterRule` (lines 485-490).
- `function deleteFilterRule` (lines 492-496).
- `let moveTargetFiles = $state<...>([])` + `let moveTargetFolder = $state('')` (lines 502-503).
- `const movePreviews = $derived.by(...)` (line 505).
- `function queueMoves` (lines 507-511).
- `function attachFolderSuggest` (lines 513-523).

**Keep in frame** (for now; some move later or never):

- `setFiltersOperationScope` is referenced by the dashboard `dashboardExplorer` snippet's `<FiltersPage onOperationScopeChange={setFiltersOperationScope}>`. Replace those call sites with `(v) => popups.setFiltersOperationScope(v)` inline at the FiltersPage mount point.
- `filtersOperationScope` $state stays in frame (it's bound from FiltersPage; see spec shard 04 decision A).

- [ ] **Step 7: Update FiltersPage `onOperationScopeChange` reference**

In **both** FiltersPage mounts (lines 671-691 in `dashboardExplorer` snippet AND lines 813-834 in pages-strip branch), replace:

```svelte
onOperationScopeChange={setFiltersOperationScope}
```

with:

```svelte
onOperationScopeChange={(v) => popups.setFiltersOperationScope(v)}
```

- [ ] **Step 8: `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors. Watch for orphaned imports (FolderSuggest, etc.) — IDE / lint will flag them.

- [ ] **Step 9: Run popups test + baseline + full suite**

```bash
pnpm exec vitest run --project component test/component/framePopupsState.test.ts
pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts
pnpm exec vitest run --project component test/component/frameNavigationService.test.ts
```

Expected: all PASS. Baseline must remain byte-equivalent — `<PopupOverlay>` renders the same DOM when its props come from `popups.X` vs inline state, since the values are identical.

- [ ] **Step 10: `pnpm verify`**

```bash
pnpm verify
```

Expected: PASS.

## Task 2.4: Live `plugin-dev` smoke

- [ ] **Step 1: Reload**

```bash
obsidian plugin:reload id=vaultman vault=plugin-dev
```

- [ ] **Step 2: Exercise each popup**

- **Scope popup:** open the operation scope picker, click each of `auto`/`filtered`/`selected`. Verify the popup closes after each pick + `plugin.settings.explorerOperationScope` persists (re-open settings, confirm).
- **Active filters popup:** with at least one filter active, open the active-filters popup. Toggle a rule (verify pill state updates). Delete a rule (verify it disappears + stats counter decrements).
- **Search popup:** open the file/folder search popup. Type a name; verify `fileList` filters. Type a folder; verify the folder filter applies. Clear; verify reset.
- **Move popup:** open the move popup (likely from FiltersPage selection actions). Pick a target folder via the autocomplete. Submit; verify `queueService` receives the batch + popup closes.

- [ ] **Step 3: `dev:errors`**

```bash
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.`

## Task 2.5: Commit

- [ ] **Step 1: Stage**

```bash
git add src/components/frame/framePopups.svelte.ts \
        src/components/frame/frameVaultman.svelte \
        test/component/framePopupsState.test.ts
```

- [ ] **Step 2: Commit (HEREDOC body)**

```bash
git commit -m "$(cat <<'EOF'
feat(O): extract FramePopupsState

Move scope / active-filters / search / move popup state + mutations
into src/components/frame/framePopups.svelte.ts. Frame now sets
FRAME_POPUPS_KEY context. PopupOverlay threading updated to read from
popups.X (PopupOverlay prop signatures unchanged; only source changes).

The active-filters popup refresh \$effect proxies to
popups.refreshActiveFiltersPopup. The filters-search routing \$effect
stays inline in frame (consumes fileList which lives as a bind:-ed
frame \$state; per spec shard 04 decision A).

filtersOperationScope and the stats counters stay in frame
(downstream FiltersPage bind: surfaces preserved). Frame's
onOperationScopeChange callback for FiltersPage now proxies to
popups.setFiltersOperationScope.

frameVaultman.svelte: ~720 → ~640 LOC.

Tests: test/component/framePopupsState.test.ts (all 4 popup concerns,
state mutations, onStatsDirty callback, FolderSuggest action contract).
Smoke: scope / active-filters / search / move popups exercised against
plugin-dev with dev:errors clean.

Refs: .agents/docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/04-api-frame-popups-state

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git status
wc -l src/components/frame/frameVaultman.svelte
```

Expected: clean tree; frame LOC ~640.

---

## Rollback

Revert C2 to fall back to inline popup state. C1 stays intact — nav doesn't depend on popups. C3 / C4 depend on the popups context being set up if they read `popups.X` directly (none currently do per shards 05 + 06; shells consume `nav` only). So C2 is safely revertible without touching C3/C4 if they've already landed.

## Verification gate

- `pnpm exec vitest run --project component test/component/framePopupsState.test.ts` → PASS.
- Baseline snapshots unchanged.
- `pnpm verify` → PASS.
- `obsidian dev:errors vault=plugin-dev` → `No errors captured.`
- All 4 popup flows live-verified.
