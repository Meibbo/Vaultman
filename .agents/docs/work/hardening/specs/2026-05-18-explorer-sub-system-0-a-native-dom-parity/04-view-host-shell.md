---
title: 04 — ViewHost shell + serviceViewHost runes class
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 04 — ViewHost shell + serviceViewHost runes class

Two new modules. `serviceViewHost.svelte.ts` owns mutable per-panel state; `ViewHost.svelte` owns the mode switch and context distribution. Together they replace the inline mode-switch block in `panelExplorer.svelte` (lines 1205-1380 today).

## serviceViewHost.svelte.ts

```typescript
// src/services/serviceViewHost.svelte.ts

import type { ThemePreset } from '../types/typeThemePreset';
import type { ExplorerViewMode } from '../types/typeViews';
import type { ExplorerPlatformViewMode } from './serviceExplorerViewContract';
import {
  EXPLORER_PLATFORM_VIEW_MODES,
  explorerViewContract,
} from './serviceExplorerViewContract';
import type {
  NodeElementMask,
  NodeElementOverrides,
  NodeElementKind,
  BadgeKindMask,
  ViewHostMountContext,
} from '../types/typeViewHost';
import { computeNodeElementMask } from './serviceNodeElementVisibility';

export interface ViewHostServiceArgs {
  preset: ThemePreset;
  mountContext: ViewHostMountContext;
  initialViewMode?: ExplorerViewMode;
}

export class ViewHostService {
  preset = $state<ThemePreset>() as ThemePreset;
  mountContext = $state<ViewHostMountContext>('panel');
  viewMode = $state<ExplorerViewMode>('tree');
  btnNodeElementsVisibility = $state<NodeElementOverrides>({});

  readonly selectableModes = $derived<readonly ExplorerPlatformViewMode[]>(
    EXPLORER_PLATFORM_VIEW_MODES.filter((m) => this.preset.viewModes.includes(m)),
  );

  readonly nodeElementMask = $derived<NodeElementMask>(
    computeNodeElementMask(
      this.preset,
      this.preset.lockNodeElementVisibility ? null : this.btnNodeElementsVisibility,
    ),
  );

  readonly multiSelectionAvailable = $derived<boolean>(
    !this.preset.lockNodeElementVisibility
    && this.isPlatformMode(this.viewMode)
    && explorerViewContract(this.viewMode as ExplorerPlatformViewMode).features.nodeElementToggles,
  );

  constructor(args: ViewHostServiceArgs) {
    this.preset = args.preset;
    this.mountContext = args.mountContext;
    if (args.initialViewMode) this.viewMode = args.initialViewMode;
  }

  setViewMode(mode: ExplorerViewMode): void {
    this.viewMode = mode;
  }

  toggleElement(kind: NodeElementKind): void {
    if (this.preset.lockNodeElementVisibility) return;
    if (kind === 'badges') {
      const currentParent = this.nodeElementMask.badges;
      const allOn = currentParent.ops && currentParent.filters && currentParent.warnings && currentParent.inherited && currentParent.counts;
      const newValue = !allOn;
      this.btnNodeElementsVisibility = {
        ...this.btnNodeElementsVisibility,
        badges: { ops: newValue, filters: newValue, warnings: newValue, inherited: newValue, counts: newValue },
      };
      return;
    }
    this.btnNodeElementsVisibility = {
      ...this.btnNodeElementsVisibility,
      [kind]: !this.nodeElementMask[kind],
    };
  }

  toggleBadgeKind(badgeKind: keyof BadgeKindMask): void {
    if (this.preset.lockNodeElementVisibility) return;
    const currentBadges = this.nodeElementMask.badges;
    this.btnNodeElementsVisibility = {
      ...this.btnNodeElementsVisibility,
      badges: { ...currentBadges, [badgeKind]: !currentBadges[badgeKind] },
    };
  }

  resetOverrides(): void {
    this.btnNodeElementsVisibility = {};
  }

  private isPlatformMode(mode: ExplorerViewMode): boolean {
    return (EXPLORER_PLATFORM_VIEW_MODES as readonly string[]).includes(mode);
  }
}
```

### Lifecycle

- Construction: in panelExplorer mount block, when the panel knows its `preset` and `initialViewMode`. Service is created once per panel.
- Mutation: only via the three public methods (`setViewMode`, `toggleElement`, `toggleBadgeKind`, `resetOverrides`).
- Destruction: implicit when the panel unmounts. No teardown needed — runes state is GC'd with the component.
- Reactivity: derivations (`selectableModes`, `nodeElementMask`, `multiSelectionAvailable`) re-run on `preset` change, `viewMode` change, or `btnNodeElementsVisibility` mutation. Consumers reading via context get push-based updates.

### Preset switch behavior

When `this.preset` is reassigned (e.g., panelExplorer's `$effect` catches a theme-service change):

- `selectableModes` recomputes immediately.
- `nodeElementMask` recomputes immediately. If new preset has `lockNodeElementVisibility=true`, overrides go dormant (not cleared).
- `multiSelectionAvailable` recomputes immediately.
- If `this.viewMode ∉ selectableModes` after recompute, the caller (`ViewHost.svelte` via an `$effect`) prunes to `selectableModes[0]` and emits the change back via the bindable `viewMode` prop.

### Invariants (enforced by C3 tests)

- Setting `viewMode` to a non-platform value (e.g., `'markmap'`) still stores it; consumers downstream of ViewHost (panelExplorer outer fallback) handle non-platform modes.
- `toggleElement` is a no-op when `preset.lockNodeElementVisibility` is true, regardless of mask current value.
- `resetOverrides` returns the mask to `baseMaskFromPreset`.
- Reassigning `preset` does not clear `btnNodeElementsVisibility`.
- `multiSelectionAvailable` returns false when the current viewMode's feature contract has `features.nodeElementToggles=false`, even if `lockNodeElementVisibility=false`.

## viewHostContext.ts

```typescript
// src/components/explorer/viewHostContext.ts

import type { ViewHostService } from '../../services/serviceViewHost.svelte';
import type { ThemePreset } from '../../types/typeThemePreset';
import type { NodeElementMask } from '../../types/typeViewHost';

// Typed Symbol pattern mirrors O's FRAME_NAVIGATION_KEY / FRAME_POPUPS_KEY.
// If O uses a generic helper (e.g., createInjectionKey<T>()), reuse it;
// otherwise the cast pattern below is the locked fallback.

export const VIEW_HOST_KEY = Symbol('VIEW_HOST') as unknown as { readonly _t: ViewHostService };
export const NODE_ELEMENT_MASK_KEY = Symbol('NODE_ELEMENT_MASK') as unknown as { readonly _t: { value: () => NodeElementMask } };
export const PRESET_KEY = Symbol('PRESET') as unknown as { readonly _t: { value: () => ThemePreset } };

export type ViewHostKey = typeof VIEW_HOST_KEY;
export type NodeElementMaskKey = typeof NODE_ELEMENT_MASK_KEY;
export type PresetKey = typeof PRESET_KEY;
```

The phantom `_t` is a TypeScript trick to retain the value type for `getContext` returns. Confirm O's exact pattern during C3 implementation; if O has a published generic helper, swap to it for consistency.

The mask and preset are wrapped in `{ value: () => T }` thunks so consumers can re-read the derived state without snapshotting at setContext time.

## ViewHost.svelte

```svelte
<!-- src/components/explorer/ViewHost.svelte -->
<script lang="ts">
  import { setContext } from 'svelte';
  import type { ThemePreset } from '../../types/typeThemePreset';
  import type { ExplorerViewMode } from '../../types/typeViews';
  import type { ViewHostMountContext } from '../../types/typeViewHost';
  import { ViewHostService } from '../../services/serviceViewHost.svelte';
  import { VIEW_HOST_KEY, NODE_ELEMENT_MASK_KEY, PRESET_KEY } from './viewHostContext';
  import ViewTree from '../views/viewTree.svelte';
  import ViewNodeList from '../views/ViewNodeList.svelte';
  import ViewNodeTable from '../views/ViewNodeTable.svelte';
  import ViewNodeGrid from '../views/ViewNodeGrid.svelte';
  import ViewNodeCards from '../views/ViewNodeCards.svelte';
  // ... all the row-input / projection / callback props panelExplorer threads today

  let {
    preset,
    mountContext = 'panel',
    viewMode = $bindable<ExplorerViewMode>('tree'),
    // ... all callbacks: onToggle, onRowClick, onSecondaryAction, ... (same set today)
    // ... row inputs: nodes, rowInputs/projection, expandedIds, selectedIds, focusedId, ...
  } = $props();

  const service = new ViewHostService({ preset, mountContext, initialViewMode: viewMode });

  setContext(VIEW_HOST_KEY, service);
  setContext(NODE_ELEMENT_MASK_KEY, { value: () => service.nodeElementMask });
  setContext(PRESET_KEY, { value: () => preset });

  $effect(() => {
    service.preset = preset;
  });

  $effect(() => {
    service.viewMode = viewMode;
  });

  $effect(() => {
    // Prune viewMode if no longer selectable after preset change.
    if (!service.selectableModes.includes(service.viewMode as never)) {
      const fallback = service.selectableModes[0] ?? 'tree';
      service.setViewMode(fallback);
      viewMode = fallback; // bind back to parent
    }
  });
</script>

{#if viewMode === 'tree'}
  <ViewTree {...$$restProps} ... />
{:else if viewMode === 'list'}
  <ViewNodeList {...$$restProps} ... />
{:else if viewMode === 'table'}
  <ViewNodeTable {...$$restProps} ... />
{:else if viewMode === 'grid'}
  <ViewNodeGrid {...$$restProps} ... />
{:else if viewMode === 'cards'}
  <ViewNodeCards {...$$restProps} ... />
{/if}
```

### Behavior details

- ViewHost does NOT render fallback `<ViewEmptyLanding>` for empty states — that responsibility stays in panelExplorer's outer wrapper. ViewHost just picks the right view component given a non-empty payload.
- ViewHost does NOT handle `markmap` mode — that branch stays in panelExplorer's outer fallback (`viewMode === 'markmap'`) because markmap is non-platform.
- Props are threaded through to the chosen view component largely unchanged. The set of callbacks is exactly the same as what panelExplorer passes to each view today (per the inventory C / D in the brainstorm research).

### Invariants (enforced by C4 tests)

- DOM mounted under ViewHost has exactly one view component at a time (no double mount, no leaked unmount).
- `getContext(VIEW_HOST_KEY)` from any descendant returns the same service instance.
- `getContext(NODE_ELEMENT_MASK_KEY).value()` returns the current mask, re-reading on every call (reactive).
- `getContext(PRESET_KEY).value()` returns the current preset.
- Switching `viewMode` from outside (via the bindable) and from inside (via overlayViewMenu calling `service.setViewMode`) both work and stay in sync.
- Preset prop change triggers `service.preset` update via `$effect`. No stale preset reads anywhere.
- viewMode prune effect runs at most once per preset change and emits the new viewMode back to the parent via bindable assignment.

## File layout

- `src/components/explorer/` is a NEW folder. Initial contents:
  `ViewHost.svelte`, `viewHostContext.ts`. Future fast-follow may add `InEditorViewHost.svelte` or similar — out of scope for 0-A.
- The choice of `explorer/` (vs `containers/` or `views/`) keeps ViewHost separate from both the panel-specific containers and the view components themselves. It is a higher-order composition module.
