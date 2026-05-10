---
title: View-menu and settings wiring
type: implementation-plan
status: done
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T01:05:00
tags:
  - agent/plan
  - initiative/polish
  - explorer/views
---

# Task 4: View-Menu And Settings Wiring

**Files:**

- Modify: `src/components/layout/overlays/overlayViewMenu.svelte`
- Modify: `src/components/layout/navbarExplorer.svelte`
- Modify: `src/components/pages/pageFilters.svelte`
- Modify: `src/components/pages/tabFiles.svelte`
- Modify: `src/components/pages/tabProps.svelte`
- Modify: `src/components/pages/tabTags.svelte`
- Modify: `src/components/pages/tabContent.svelte`
- Test: `test/component/overlayViewMenu.test.ts`

## Steps

- [x] **Step 1: Extend overlay tests for cards and persistent field pills**

Modify `test/component/overlayViewMenu.test.ts` to include:

```ts
import type { NodeFieldDefinition } from '../../src/services/serviceNodeFieldVisibility';

const fieldDefinitions: NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
];

it('offers cards mode but not dnd mode in the first measured-cards slice', () => {
	renderViewModePopup({ fieldDefinitions, visibleFields: ['icon', 'name'] });

	expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Cards"]')).not.toBeNull();
	expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Drag & Drop list"]')).toBeNull();
});

it('emits normalized field changes instead of storing pills locally', () => {
	const onVisibleFieldsChange = vi.fn();
	renderViewModePopup({
		activeTab: 'files',
		viewMode: 'cards',
		initialViewMode: 'cards',
		fieldDefinitions,
		visibleFields: ['icon', 'name'],
		onVisibleFieldsChange,
	});

	target.querySelectorAll<HTMLButtonElement>('.vm-viewmode-pill')[2].click();
	flushSync();

	expect(onVisibleFieldsChange).toHaveBeenCalledWith(['icon', 'name', 'path']);
});
```

- [x] **Step 2: Run overlay tests and verify they fail**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false
```

Expected: fail because overlay props and field-service wiring are not present.

- [x] **Step 3: Refactor `overlayViewMenu.svelte` props**

In `src/components/layout/overlays/overlayViewMenu.svelte`:

- import `toggleVisibleField` and `type NodeFieldDefinition`;
- replace local `PILLS`, `defaultPills`, `pillsKey`, `activePills`, and
  `currentPillDefs` with props;
- remove `dnd` from `VIEW_MODES`;
- add:

```ts
fieldDefinitions = [],
visibleFields = [],
onVisibleFieldsChange,
```

to props, with types:

```ts
fieldDefinitions?: readonly NodeFieldDefinition[];
visibleFields?: readonly string[];
onVisibleFieldsChange?: (fields: string[]) => void;
```

Use this toggle handler:

```ts
function togglePill(id: string) {
	onVisibleFieldsChange?.(toggleVisibleField(activeTab, viewMode, visibleFields, id));
}
```

Render `fieldDefinitions`:

```svelte
{#each fieldDefinitions as pill (pill.id)}
	<button
		type="button"
		class="vm-viewmode-pill"
		class:is-active={visibleFields.includes(pill.id)}
		aria-pressed={visibleFields.includes(pill.id)}
		onclick={() => togglePill(pill.id)}
	>
		{translate(pill.labelKey)}
	</button>
{/each}
```

- [x] **Step 4: Thread field props through `navbarExplorer.svelte`**

Add props:

```ts
fieldDefinitions = [],
visibleFields = [],
onVisibleFieldsChange,
```

with matching types imported from `serviceNodeFieldVisibility`, then pass them
to `<ViewModePopup>`.

- [x] **Step 5: Own persistence in `pageFilters.svelte`**

Import:

```ts
import {
	fieldDefinitionsFor,
	setVisibleFieldsForSettings,
	visibleFieldsFromSettings,
} from '../../services/serviceNodeFieldVisibility';
import type { ExplorerViewMode } from '../../types/typeViews';
```

Add:

```ts
let fieldVisibilityVersion = $state(0);
```

Add helpers:

```ts
function providerIdForTab(tab: FiltersSearchTab): string {
	return tab;
}

function visibleFieldsFor(tab: FiltersSearchTab, mode: ExplorerViewMode): string[] {
	void fieldVisibilityVersion;
	return visibleFieldsFromSettings(plugin.settings, providerIdForTab(tab), mode);
}

async function setActiveVisibleFields(fields: string[]): Promise<void> {
	await setVisibleFieldsForSettings(
		plugin,
		providerIdForTab(filtersActiveTab),
		filtersViewMode as ExplorerViewMode,
		fields,
	);
	fieldVisibilityVersion += 1;
}
```

Add derived values for the navbar:

```ts
const activeFieldDefinitions = $derived(
	fieldDefinitionsFor(providerIdForTab(filtersActiveTab), filtersViewMode as ExplorerViewMode),
);
const activeVisibleFields = $derived(
	visibleFieldsFor(filtersActiveTab, filtersViewMode as ExplorerViewMode),
);
```

Pass to `<NavbarExplorer>`:

```svelte
fieldDefinitions={activeFieldDefinitions}
visibleFields={activeVisibleFields}
onVisibleFieldsChange={(fields) => void setActiveVisibleFields(fields)}
```

- [x] **Step 6: Forward visible fields into tab components**

Add `visibleFields?: readonly string[]` props to `tabFiles.svelte`,
`tabProps.svelte`, `tabTags.svelte`, and `tabContent.svelte`, then pass
`visibleFields` to `PanelExplorer`.

In `pageFilters.svelte`, pass provider-specific values:

```svelte
visibleFields={visibleFieldsFor('props', filtersViewMode as ExplorerViewMode)}
visibleFields={visibleFieldsFor('files', filtersViewMode as ExplorerViewMode)}
visibleFields={visibleFieldsFor('tags', filtersViewMode as ExplorerViewMode)}
visibleFields={visibleFieldsFor('content', filtersViewMode as ExplorerViewMode)}
```

- [x] **Step 7: Run overlay tests**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false
```

Expected: all overlay tests pass and `dnd` no longer appears.

## Completion Notes

- `overlayViewMenu.svelte` no longer owns local pill definitions or pill state.
  It receives `fieldDefinitions`, `visibleFields`, and
  `onVisibleFieldsChange`, renders the provided definitions, and emits
  normalized changes through `toggleVisibleField`.
- `dnd` was removed from the view-mode button list for this measured-cards
  slice. `cards` remains available in the popup.
- `navbarExplorer.svelte` now threads field definitions, visible fields, and
  the field-change callback into the view-mode overlay.
- `pageFilters.svelte` owns field visibility persistence through
  `serviceNodeFieldVisibility`, increments a local visibility version after
  explicit saves, derives active navbar fields by tab/view, and forwards
  provider-specific visible fields to every tab.
- `tabFiles.svelte`, `tabProps.svelte`, `tabTags.svelte`, and
  `tabContent.svelte` accept `visibleFields` and pass it into
  `PanelExplorer`.
- `panelExplorer.svelte` accepts the threaded `visibleFields` prop so Task 5
  can consume it when the cards renderer is introduced.

## Verification

- RED:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false`
  failed because the overlay did not emit `onVisibleFieldsChange`.
- Focused GREEN:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false`
  passed with 1 file / 3 tests.
- Svelte autofixer:
  `overlayViewMenu.svelte`, `navbarExplorer.svelte`, `pageFilters.svelte`,
  `tabFiles.svelte`, `tabProps.svelte`, `tabTags.svelte`,
  `tabContent.svelte`, and `panelExplorer.svelte` reported no issues.
- Broad checks:
  - `pnpm run check` passed with 0 errors and 0 warnings.
  - `pnpm run lint` passed with 0 warnings and 0 errors.
  - `pnpm run build` passed.
  - Focused component set passed with 5 files / 55 tests.
  - `pnpm run test:unit` passed with 80 files / 546 tests.
  - `pnpm run test:component` passed with 41 files / 205 tests.
