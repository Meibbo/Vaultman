---
title: 06 — overlayViewMenu wiring
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 06 — overlayViewMenu wiring

C7 edits `src/components/overlays/overlayViewMenu.svelte` to consume
the viewHost service via context, filter the view-mode list by
`preset.viewModes`, and render the renamed
`btnNodeElementsVisibility` submenu when applicable.

## Source-of-truth chain

```
preset.viewModes: readonly ExplorerViewMode[]    [declared in 0-B preset literal]
  ∩
EXPLORER_PLATFORM_VIEW_MODES = ['tree','list','table','grid','cards']
  [serviceExplorerViewContract.ts:3 — locked, no markmap, no outline]
  =
viewHost.selectableModes: readonly ExplorerPlatformViewMode[]
  [derived in ViewHostService]
```

The intersection is the safety net. Built-in presets never trigger
filtering because they declare only platform modes. Custom presets
and third-party themes can declare a `viewModes` array that includes
modes Vaultman has not yet shipped (e.g., a future `outline`); the
intersection drops them silently.

Built-in preset values (already locked in 0-B):

- `PRESET_NATIVE.viewModes = ['tree']`
- `PRESET_VAULTMAN.viewModes = ['tree', 'list', 'table', 'grid', 'cards']`

## Component shape after C7

```svelte
<!-- src/components/overlays/overlayViewMenu.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { VIEW_HOST_KEY } from '../explorer/viewHostContext';
  import ViewMenuNodeElementsToggle from './ViewMenuNodeElementsToggle.svelte';

  const viewHost = getContext(VIEW_HOST_KEY);
</script>

<div class="vm-view-menu vm-overlay-view-menu">
  <section class="vm-view-menu-modes">
    {#each viewHost.selectableModes as mode}
      <button
        type="button"
        class="vm-view-menu-mode"
        class:is-active={mode === viewHost.viewMode}
        onclick={() => viewHost.setViewMode(mode)}
      >
        {labelFor(mode)}
      </button>
    {/each}
  </section>

  {#if viewHost.multiSelectionAvailable}
    <hr class="vm-view-menu-divider" />
    <section class="vm-view-menu-node-elements">
      <ViewMenuNodeElementsToggle service={viewHost} />
    </section>
  {/if}
</div>
```

## ViewMenuNodeElementsToggle component (new, inline-expand layout)

Location: `src/components/overlays/ViewMenuNodeElementsToggle.svelte`
(can also be inlined in overlayViewMenu if preferred during impl;
spec assumes its own file for testability).

```svelte
<script lang="ts">
  import type { ViewHostService } from '../../services/serviceViewHost.svelte';
  import type { NodeElementKind, BadgeKindMask } from '../../types/typeViewHost';

  let { service }: { service: ViewHostService } = $props();

  const SIMPLE_KINDS: readonly NodeElementKind[] = ['icon', 'label', 'detail', 'media', 'actions'];
  const BADGE_KINDS: readonly (keyof BadgeKindMask)[] = ['ops', 'filters', 'warnings', 'inherited', 'counts'];
</script>

<div class="vm-node-elements-toggle">
  {#each SIMPLE_KINDS as kind}
    <label class="vm-node-elements-toggle-row">
      <input
        type="checkbox"
        checked={service.nodeElementMask[kind]}
        onchange={() => service.toggleElement(kind)}
      />
      <span>{kind}</span>
    </label>
  {/each}

  <label class="vm-node-elements-toggle-row">
    <input
      type="checkbox"
      checked={service.nodeElementMask.badges.ops
            && service.nodeElementMask.badges.filters
            && service.nodeElementMask.badges.warnings
            && service.nodeElementMask.badges.inherited
            && service.nodeElementMask.badges.counts}
      onchange={() => service.toggleElement('badges')}
    />
    <span>badges</span>
  </label>

  <div class="vm-node-elements-toggle-badges-group">
    {#each BADGE_KINDS as badgeKind}
      <label class="vm-node-elements-toggle-row vm-indent-1">
        <input
          type="checkbox"
          checked={service.nodeElementMask.badges[badgeKind]}
          onchange={() => service.toggleBadgeKind(badgeKind)}
        />
        <span>{badgeKind}</span>
      </label>
    {/each}
  </div>

  <button
    type="button"
    class="vm-node-elements-toggle-reset"
    onclick={() => service.resetOverrides()}
  >
    Reset
  </button>
</div>
```

### UI layout decisions (locked)

- **Inline expand**, not sub-popover. The submenu lives directly
  below the view-mode buttons in the same overlay.
- **Badges as flat indented group**, not nested submenu. Five
  sub-checkboxes indented one level under the parent `badges`
  checkbox.
- **Reset button** at the bottom. One click clears all overrides;
  mask falls back to `baseMaskFromPreset(preset)`.
- **Parent "badges" checkbox** is checked iff all 5 sub-kinds are
  true. Clicking it flips all 5 simultaneously (handled in
  `service.toggleElement('badges')`).
- **Checkbox state** reads `service.nodeElementMask[kind]`, the
  effective merged mask. Override state on the service is internal;
  user sees only the resolved boolean.
- **Disabled state**: if a sub-system in the future adds a kind
  whose value is forced by preset (e.g., `media` is always-false
  invariant), display it disabled. For 0-A, all 6 kinds are
  toggleable when `lockNodeElementVisibility=false`.

## Native preset behavior

When `preset === PRESET_NATIVE`:

- `viewHost.selectableModes = ['tree']` — overlayViewMenu shows
  only the Tree button.
- `viewHost.multiSelectionAvailable = false` because
  `preset.lockNodeElementVisibility = true` — submenu DOM is
  NOT rendered at all (no display:none escape hatch).
- The menu trigger is still visible for discoverability; the
  lone Tree button is marked `is-active`.

## Vaultman preset behavior

When `preset === PRESET_VAULTMAN`:

- 5 mode buttons rendered.
- btnNodeElementsVisibility submenu visible.
- Default mask: icon / label / detail / badges / actions = true,
  media = false (locked invariant).
- User toggles override the mask in real time.

## Feature-contract gating for the submenu

`viewHost.multiSelectionAvailable` also checks the active view's
`features.nodeElementToggles` flag. Today all 5 platform views
share `SHARED_FEATURES` with `nodeElementToggles: true`, so this
behaves identically to checking only `preset.lockNodeElementVisibility`
in practice. The contract is LIVE: future views (or per-view
contract variation) that declare `nodeElementToggles: false`
hide the submenu for that view regardless of preset.

## Rename: btnMultiSelection → btnNodeElementsVisibility

C7 also renames every occurrence of `btnMultiSelection` in the
codebase (typescript identifiers, CSS classes, documentation
strings) to `btnNodeElementsVisibility`. The historical name in
0-B docs reads as "multi-row selection toggle" which is a
different feature owned by `NodeSelectionService`. The new name
reflects the actual semantic.

Audit script in C7:

```
grep -rn 'btnMultiSelection' src/ test/ .agents/docs/
```

For each hit:
- In source: rename to `btnNodeElementsVisibility`.
- In docs: rename inline, add a one-line "renamed from
  `btnMultiSelection` in 0-A" annotation only if removing the
  old name would lose archeological context.

## C7 verification gates

```typescript
test('overlayViewMenu renders viewHost.selectableModes order matching preset.viewModes ∩ EXPLORER_PLATFORM_VIEW_MODES');
test('overlayViewMenu hides btnNodeElementsVisibility submenu when preset.lockNodeElementVisibility=true');
test('overlayViewMenu hides btnNodeElementsVisibility submenu when active view contract.features.nodeElementToggles=false');
test('overlayViewMenu shows 5 simple-kind checkboxes + 1 parent badges checkbox + 5 indented badge-kind checkboxes when submenu visible');
test('parent badges checkbox is checked when all 5 badge sub-kinds are true');
test('clicking parent badges checkbox flips all 5 sub-kinds together');
test('clicking a badge sub-kind flips only that sub-kind');
test('clicking Reset clears overrides; mask returns to baseMaskFromPreset');
test('switching viewMode within same panel preserves btnNodeElementsVisibility overrides');
test('switching preset within same panel preserves btnNodeElementsVisibility overrides; mask reflects new preset.nodeElements baseline');
test('switching to a preset with lockNodeElementVisibility=true makes overrides dormant (mask=baseFromPreset) but does not clear them');
test('switching back to an unlocked preset reasserts the dormant overrides');
```
