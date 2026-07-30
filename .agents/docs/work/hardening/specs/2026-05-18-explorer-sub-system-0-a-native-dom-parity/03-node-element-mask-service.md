---
title: 03 — Node Element Mask service
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 03 — Node Element Mask service

Pure-function presentation service that derives a per-row visibility mask from the active preset and the user's runtime overrides (`btnNodeElementsVisibility` toggles held in `serviceViewHost`).

## Types

```typescript
// src/types/typeViewHost.ts

export type NodeElementKind = 'icon' | 'label' | 'detail' | 'media' | 'badges' | 'actions';

export interface BadgeKindMask {
  ops: boolean;
  filters: boolean;
  warnings: boolean;
  inherited: boolean;
  counts: boolean;
}

export interface NodeElementMask {
  icon: boolean;
  label: boolean;
  detail: boolean;
  media: boolean;
  badges: BadgeKindMask;
  actions: boolean;
}

export type NodeElementOverrides = Partial<{
  icon: boolean;
  label: boolean;
  detail: boolean;
  media: boolean;
  badges: Partial<BadgeKindMask>;
  actions: boolean;
}>;

export type ViewHostMountContext = 'panel' | 'in-editor';
```

`NodeElementOverrides` is what `btnNodeElementsVisibility` mutates on the viewHost service. It is `Partial<>` because the user may have toggled only `media`; everything else falls through to the preset's default `nodeElements` values.

## Service module

```typescript
// src/services/serviceNodeElementVisibility.ts

import type { ThemePreset } from '../types/typeThemePreset';
import type { NodeElementMask, NodeElementOverrides, BadgeKindMask } from '../types/typeViewHost';

export function baseMaskFromPreset(preset: ThemePreset): NodeElementMask {
  return {
    icon: preset.nodeElements.icon,
    label: preset.nodeElements.label,
    detail: preset.nodeElements.detail,
    media: preset.nodeElements.media,
    badges: { ...preset.nodeElements.badges },
    actions: preset.nodeElements.actions,
  };
}

export function mergeOverrides(base: NodeElementMask, ov: NodeElementOverrides): NodeElementMask {
  return {
    icon: ov.icon ?? base.icon,
    label: ov.label ?? base.label,
    detail: ov.detail ?? base.detail,
    media: ov.media ?? base.media,
    badges: {
      ops: ov.badges?.ops ?? base.badges.ops,
      filters: ov.badges?.filters ?? base.badges.filters,
      warnings: ov.badges?.warnings ?? base.badges.warnings,
      inherited: ov.badges?.inherited ?? base.badges.inherited,
      counts: ov.badges?.counts ?? base.badges.counts,
    },
    actions: ov.actions ?? base.actions,
  };
}

export function computeNodeElementMask(
  preset: ThemePreset,
  overrides: NodeElementOverrides | null,
): NodeElementMask {
  if (preset.lockNodeElementVisibility) {
    return baseMaskFromPreset(preset);
  }
  return mergeOverrides(baseMaskFromPreset(preset), overrides ?? {});
}
```

Pure functions only. No closures, no `this`, no service deps. Each function deterministic for the same input.

## Invariants

**Hard invariants enforced by C2 unit tests:**

1. **Lock priority.** When `preset.lockNodeElementVisibility === true`, `computeNodeElementMask(preset, anyOverrides)` returns the same value as `baseMaskFromPreset(preset)`. Overrides are ignored.
2. **Media default-off.** Every built-in preset has `nodeElements.media === false`. The mask reflects this absent user override.
3. **Determinism.** `computeNodeElementMask(p, o)` returns structurally identical output for structurally identical input, regardless of call history.
4. **No mutation of inputs.** Neither `preset.nodeElements` nor `overrides` is mutated. Returned mask is a fresh object with a fresh `badges` sub-object.
5. **Badge sub-merge correctness.** `mergeOverrides` merges `badges` per sub-key, not as a whole-object replace. Partial overrides on `badges.warnings` do not clobber other badge keys.
6. **`null`/`undefined` overrides are equivalent.** Calling `computeNodeElementMask(p, null)` and `computeNodeElementMask(p, undefined as unknown as NodeElementOverrides)` return identical output.

## Test fixtures

```typescript
const FIXTURE_PRESET_NATIVE: ThemePreset = {
  // ... existing native preset
  lockNodeElementVisibility: true,
  nodeElements: {
    icon: true, label: true, detail: false, media: false,
    badges: { ops: false, filters: false, warnings: true, inherited: false, counts: true },
    actions: false,
  },
};

const FIXTURE_PRESET_VAULTMAN: ThemePreset = {
  // ... existing vaultman preset
  lockNodeElementVisibility: false,
  nodeElements: {
    icon: true, label: true, detail: true, media: false,
    badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
    actions: true,
  },
};
```

## Consumer pattern

```typescript
// inside serviceViewHost.svelte.ts
import { computeNodeElementMask } from './serviceNodeElementVisibility';

readonly nodeElementMask = $derived<NodeElementMask>(
  computeNodeElementMask(
    this.preset,
    this.preset.lockNodeElementVisibility ? null : this.btnNodeElementsVisibility,
  ),
);
```

```svelte
<!-- inside any view component, e.g., ViewNodeCards.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { NODE_ELEMENT_MASK_KEY } from '../explorer/viewHostContext';
  const maskCtx = getContext(NODE_ELEMENT_MASK_KEY);
  const mask = $derived(maskCtx.value());
</script>

{#if mask.icon}     <Icon ... />     {/if}
{#if mask.label}    <Label ... />    {/if}
{#if mask.detail}   <Detail ... />   {/if}
{#if mask.media && row.mediaDescriptor}
  <CoverImage descriptor={row.mediaDescriptor} />
{/if}
{#if mask.badges.warnings && warnings.length > 0}
  <BadgeWarning ... />
{/if}
{#if mask.badges.counts}
  <BadgeCount ... />
{/if}
{#if mask.actions}  <ActionRow ... /> {/if}
```

## File location and ownership

- Module: `src/services/serviceNodeElementVisibility.ts`
- Types: `src/types/typeViewHost.ts` (shared with viewHost service)
- Owner: 0-A; future Theme Builder may extend with per-preset override snapshots but the pure-function contract here stays.

## Open question — confirmed during implementation, not blocking

- Whether `BadgeKindMask` should include future badge kinds (e.g., `lockState`, `dirty`, `unread`) currently absent. Out of scope unless EDP-009 / serviceBadge surfaces them in 0-A's lifecycle. If they appear post-merge, additive change to the mask is non-breaking.
