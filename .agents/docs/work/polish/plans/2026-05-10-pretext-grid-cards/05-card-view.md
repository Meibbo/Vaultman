---
title: Cards view component and panel route
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T00:59:55
tags:
  - agent/plan
  - initiative/polish
  - explorer/views
---


# Task 5: Cards View Component And Panel Route

**Files:**

- Create: `src/components/views/ViewNodeCards.svelte`
- Create: `src/styles/data/_cards.scss`
- Modify: `src/main.scss`
- Modify: `src/components/containers/panelExplorer.svelte`
- Test: `test/component/viewNodeCards.test.ts`
- Modify: `test/component/panelExplorerEmpty.test.ts`
- Modify: `test/component/panelExplorerSelection.test.ts`
- Modify: `test/component/virtualizerItemKeys.test.ts`

## Steps

- [x] **Step 1: Write failing card component tests**

Create `test/component/viewNodeCards.test.ts` with tests mirroring grid
contracts:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha long label that wraps', depth: 0, meta: {}, icon: 'lucide-file', count: 2 },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag', count: 1 },
];

describe('ViewNodeCards', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) void unmount(app);
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(props: Record<string, unknown> = {}) {
		app = mount(ViewNodeCards as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				providerId: 'tags',
				nodes,
				visibleFields: ['icon', 'text', 'count'],
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('renders measured cards with selected and active state classes', () => {
		render({ selectedIds: new Set(['alpha']), activeId: 'beta' });

		expect(target.querySelector('[data-id="alpha"]')?.classList.contains('is-selected')).toBe(true);
		expect(target.querySelector('[data-id="beta"]')?.classList.contains('is-active-node')).toBe(true);
		expect(target.querySelector('[data-card-field="count"]')?.textContent).toContain('2');
	});

	it('dispatches click, context menu, and keyboard callbacks', () => {
		const onCardClick = vi.fn();
		const onContextMenu = vi.fn((_: string, e: MouseEvent) => e.preventDefault());
		const onCardKeydown = vi.fn();
		render({ onCardClick, onContextMenu, onCardKeydown });

		const alpha = target.querySelector<HTMLElement>('[data-id="alpha"]')!;
		alpha.click();
		alpha.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		alpha.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onCardClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(onContextMenu).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(onCardKeydown).toHaveBeenCalledWith('alpha', expect.any(KeyboardEvent));
	});
});
```

- [x] **Step 2: Run card component tests and verify they fail**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeCards.test.ts --fileParallelism=false
```

Expected: fail because `ViewNodeCards.svelte` does not exist.

- [x] **Step 3: Implement `ViewNodeCards.svelte`**

Create a Svelte 5 component based on `ViewNodeGrid.svelte` patterns:

- props: `providerId`, `nodes`, `visibleFields`, `selectedIds`, `focusedId`,
  `activeId`, `onCardClick`, `onSecondaryAction`, `onTertiaryAction`,
  `onContextMenu`, `onCardKeydown`, `scrollTarget`, `mouseGestureConfig`, `icon`;
- use `createVirtualizer` with durable row keys;
- compute columns from container width;
- group nodes into rows;
- use `createTextMeasureService()` and `measureNodeCard()` for row height;
- use `estimateSize: (index) => rows[index]?.height ?? CARD_HEIGHT_BUCKETS.standard`;
- render fields returned by `cardFieldsForNode`;
- include `data-id`, `data-node-id`, `role="gridcell"`, `aria-selected`, and
  state classes matching grid/table naming.

Use a local style snapshot for the first slice:

```ts
const CARD_MEASURE_STYLE = {
	title: { font: '600 13px Inter', lineHeight: 18, letterSpacing: 0 },
	meta: { font: '12px Inter', lineHeight: 16, letterSpacing: 0 },
};
```

Superseded by the CSS font snapshot follow-up. These fixed values now live only
as the fallback in `serviceNodeCardStyle.ts`.

- [x] **Step 4: Add card SCSS**

Create `src/styles/data/_cards.scss` with classes:

- `.vm-node-cards`
- `.vm-node-cards-inner`
- `.vm-node-card-row`
- `.vm-node-card`
- `.vm-node-card-icon`
- `.vm-node-card-field`
- `.vm-node-card-field.is-title`
- `.vm-node-card-field.is-meta`

Styles must:

- keep card radius at or below existing `$vm-radius-s`;
- preserve normal cursor on the broad card surface;
- reserve stable icon space when icon is hidden or unavailable;
- use restrained borders and selection/focus/active states consistent with
  `_grid.scss` and `_table.scss`.

Modify `src/main.scss` to import the new partial next to other data styles.

- [x] **Step 5: Route cards in `panelExplorer.svelte`**

Modify `panelExplorer.svelte`:

- import `ViewNodeCards`;
- add `visibleFields?: readonly string[]` prop with default `[]`;
- add `cardNodes = $derived(viewMode === 'cards' ? nodes : [])`;
- add `isCardsEmpty = $derived(viewMode === 'cards' && cardNodes.length === 0)`;
- update `refreshData()` so `cards` reads provider tree just like grid/table;
- update `visibleNodeIds()` so `cards` returns `cardNodes.map((node) => node.id)`;
- add a `cards` branch before fallback:

```svelte
{:else if viewMode === 'cards'}
	<div class="vm-cards-container">
		{#if isCardsEmpty}
			<ViewEmptyLanding state={emptyState} {icon} />
		{:else}
			<ViewNodeCards
				providerId={provider.id}
				nodes={cardNodes}
				{visibleFields}
				selectedIds={selectedNodeIds}
				focusedId={focusedNodeId}
				activeId={selectionSnapshot.activeId}
				onCardClick={handleNodeClick}
				onSecondaryAction={handleSecondaryAction}

Continua en [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/05-card-view-shard-1|continuacion 1]].