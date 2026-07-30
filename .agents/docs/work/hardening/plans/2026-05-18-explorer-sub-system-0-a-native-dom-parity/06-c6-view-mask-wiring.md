---
title: 06 — C6 wire view components to consume NodeElementMask
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 06 — C6: Wire 5 view components to consume `NodeElementMask` via context

Each of the 5 view components reads the mask from context and gates per-node-element rendering on the mask boolean. EDP-009 row contract is NOT changed.

**Files:**
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/components/views/ViewNodeList.svelte`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Test: `test/component/views/*.NodeElementMask.test.ts` (5 files, one per view)

## Steps

- [ ] **Step 1: Write failing test for ViewNodeCards mask consumption (media slot gate)**

Create `test/component/views/ViewNodeCards.NodeElementMask.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import { setContext } from 'svelte';
import ViewNodeCards from '../../../src/components/views/ViewNodeCards.svelte';
import { NODE_ELEMENT_MASK_KEY } from '../../../src/components/explorer/viewHostContext';
import type { NodeElementMask } from '../../../src/types/typeViewHost';

afterEach(cleanup);

function makeMask(overrides: Partial<NodeElementMask> = {}): NodeElementMask {
  return {
    icon: true, label: true, detail: true,
    media: false,
    badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
    actions: true,
    ...overrides,
  };
}

describe('ViewNodeCards — NodeElementMask gating', () => {
  it('does NOT render .vm-node-card-cover when mask.media=false', () => {
    let mask = makeMask({ media: false });
    const { container } = render(ViewNodeCards, {
      context: new Map([
        [NODE_ELEMENT_MASK_KEY, { value: () => mask }],
      ]),
      props: {
        providerId: 'files',
        nodes: [{ id: 'a', label: 'A', mediaDescriptor: { thumbnailUrl: 'foo.png' } } as never],
        visibleFields: [],
        icon: (() => ({ update() {} })) as never,
        onCardClick: () => {},
        onContextMenu: () => {},
      } as never,
    });
    expect(container.querySelector('.vm-node-card-cover')).toBeNull();
  });

  it('renders .vm-node-card-cover when mask.media=true AND row.mediaDescriptor exists', () => {
    let mask = makeMask({ media: true });
    const { container } = render(ViewNodeCards, {
      context: new Map([
        [NODE_ELEMENT_MASK_KEY, { value: () => mask }],
      ]),
      props: {
        providerId: 'files',
        nodes: [{ id: 'a', label: 'A', mediaDescriptor: { thumbnailUrl: 'foo.png' } } as never],
        visibleFields: [],
        icon: (() => ({ update() {} })) as never,
        onCardClick: () => {},
        onContextMenu: () => {},
      } as never,
    });
    expect(container.querySelector('.vm-node-card-cover')).not.toBeNull();
  });

  it('hides badge container DOM when mask.badges.warnings=false AND warnings present', () => {
    let mask = makeMask({ badges: { ops: true, filters: true, warnings: false, inherited: true, counts: true } });
    const { container } = render(ViewNodeCards, {
      context: new Map([
        [NODE_ELEMENT_MASK_KEY, { value: () => mask }],
      ]),
      props: {
        providerId: 'files',
        nodes: [{ id: 'a', label: 'A', warnings: ['stale'] } as never],
        visibleFields: [],
        icon: (() => ({ update() {} })) as never,
        onCardClick: () => {},
        onContextMenu: () => {},
      } as never,
    });
    expect(container.querySelector('[data-badge-kind="warnings"], .vm-badge-warning')).toBeNull();
  });

  it('hides label DOM when mask.label=false', () => {
    let mask = makeMask({ label: false });
    const { container } = render(ViewNodeCards, {
      context: new Map([
        [NODE_ELEMENT_MASK_KEY, { value: () => mask }],
      ]),
      props: {
        providerId: 'files',
        nodes: [{ id: 'a', label: 'A' } as never],
        visibleFields: [],
        icon: (() => ({ update() {} })) as never,
        onCardClick: () => {},
        onContextMenu: () => {},
      } as never,
    });
    expect(container.querySelector('.vm-node-card-field.is-title')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/component/views/ViewNodeCards.NodeElementMask.test.ts
```

Expected: FAIL — cards still renders cover/label/badges unconditionally or based on local conditions, not mask.

- [ ] **Step 3: Update `ViewNodeCards.svelte` to consume mask**

In `<script>` section, add:

```typescript
import { getContext } from 'svelte';
import { NODE_ELEMENT_MASK_KEY } from '../explorer/viewHostContext';
import type { NodeElementMask } from '../../types/typeViewHost';

const maskCtx = getContext(NODE_ELEMENT_MASK_KEY);
const mask = $derived<NodeElementMask>(
  maskCtx ? maskCtx.value() : {
    icon: true, label: true, detail: true,
    media: false,
    badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
    actions: true,
  }
);
```

(The fallback default is for tests / standalone renders that don't provide context.)

In the card render template, gate per element:

```svelte
{#if mask.icon}
  <span class="vm-node-card-icon">...</span>
{/if}

{#if mask.label}
  <span class="vm-node-card-field is-title {vocab?.primaryLabel ?? ''}">{node.label}</span>
{/if}

{#if mask.media && row.mediaDescriptor}
  <div class="vm-node-card-cover">
    <img src={row.mediaDescriptor.thumbnailUrl} alt="" loading="lazy" />
  </div>
{/if}

{#if mask.detail && node.detail}
  <span class="vm-node-card-field is-meta">{node.detail}</span>
{/if}

{#if mask.badges.warnings && warnings.length}
  <BadgeWarning ... />
{/if}
{#if mask.badges.counts && counts.length}
  <BadgeCount ... />
{/if}
... etc per badge kind ...

{#if mask.actions}
  <ActionRow ... />
{/if}
```

Locate each existing render block and add the appropriate `{#if mask.<kind>}` guard. Do NOT remove existing local conditions (e.g., `if (node.detail)`);
add the mask guard as an outer wrapper.

- [ ] **Step 4: Run cards test to verify pass**

Run:

```powershell
pnpm vitest run test/component/views/ViewNodeCards.NodeElementMask.test.ts
```

Expected: PASS — 4 cases green.

- [ ] **Step 5: Repeat for viewTree.svelte (write test + wire mask + verify)**

Create `test/component/views/viewTree.NodeElementMask.test.ts` with analogous tests for tree row icon, label, detail, badges gating.
viewTree does NOT render media (no media slot on tree rows in any preset). Tree should still respect badge sub-kinds.

Update `viewTree.svelte` with the same mask import + gating pattern.

Run focused test, expect PASS.

- [ ] **Step 6: Repeat for ViewNodeList.svelte**

ViewNodeList has icon/label/detail/badges/actions but no media.
Tests focus on the gates for those.

Update `ViewNodeList.svelte` with mask import + gating.

Run focused test, expect PASS.

- [ ] **Step 7: Repeat for ViewNodeTable.svelte**

ViewNodeTable has icon/label/detail/badges/actions but no media (rendered through cells). Mask gates the icon column, label cell content, detail cells, badge column, and action column.

Update `ViewNodeTable.svelte` with mask import + gating.

Run focused test, expect PASS.

- [ ] **Step 8: Repeat for ViewNodeGrid.svelte**

ViewNodeGrid has icon/label/detail/badges/actions. Similar gating.

Update `ViewNodeGrid.svelte` with mask import + gating.

Run focused test, expect PASS.

- [ ] **Step 9: Run all 5 focused tests + `pnpm verify`**

```powershell
pnpm vitest run test/component/views/*.NodeElementMask.test.ts
pnpm verify
```

Expected: 5 test files PASS; full verify PASS.

- [ ] **Step 10: Live `plugin-dev` smoke**

```powershell
pnpm run build
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
# Visually verify each viewMode renders rows with full element set (vaultman preset default).
obsidian vault=plugin-dev dev:errors
```

Expected: `No errors captured.`

- [ ] **Step 11: Commit**

```powershell
git add src/components/views/viewTree.svelte src/components/views/ViewNodeList.svelte src/components/views/ViewNodeTable.svelte src/components/views/ViewNodeGrid.svelte src/components/views/ViewNodeCards.svelte test/component/views/*.NodeElementMask.test.ts
git commit -m "refactor(0-A): wire 5 view components to consume NodeElementMask via context

Each of viewTree, ViewNodeList, ViewNodeTable, ViewNodeGrid, ViewNodeCards
imports getContext(NODE_ELEMENT_MASK_KEY) and gates per-node-element
rendering (icon/label/detail/media/badges{ops,filters,warnings,inherited,counts}/actions)
on the mask boolean. EDP-009 row contract unchanged. Fallback default
mask used when context absent (standalone renders, tests)."
```

## Verification gates

- 5 focused tests pass (one per view).
- `pnpm verify` baseline preserved + new tests counted.
- Visual smoke: each view shows full element set under vaultman preset defaults.

## Risk

- Default fallback mask (used when context is absent) may mask defects in C7 wiring. The C7 commit verifies overlayViewMenu actually mutates the mask via viewHost service. C7 tests fail if mask doesn't drive re-render.

## Rollback

`git revert <commit>` reverts all 5 view edits. Mask is unused; the service + context keys remain available.
