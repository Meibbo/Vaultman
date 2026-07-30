---
title: "View-menu and settings wiring - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/04-view-menu-routing|View-menu and settings wiring]]"
shard_source: ".agents/docs/work/polish/plans/2026-05-10-pretext-grid-cards/04-view-menu-routing.md"
shard_of: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/04-view-menu-routing|View-menu and settings wiring]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# View-menu and settings wiring - continuation 1

Continua desde [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/04-view-menu-routing|View-menu and settings wiring]].


- [x] **Step 6: Forward visible fields into tab components**

Add `visibleFields?: readonly string[]` props to `tabFiles.svelte`, `tabProps.svelte`, `tabTags.svelte`, and `tabContent.svelte`, then pass `visibleFields` to `PanelExplorer`.

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
  It receives `fieldDefinitions`, `visibleFields`, and `onVisibleFieldsChange`, renders the provided definitions, and emits normalized changes through `toggleVisibleField`.
- `dnd` was removed from the view-mode button list for this measured-cards slice. `cards` remains available in the popup.
- `navbarExplorer.svelte` now threads field definitions, visible fields, and the field-change callback into the view-mode overlay.
- `pageFilters.svelte` owns field visibility persistence through `serviceNodeFieldVisibility`, increments a local visibility version after explicit saves, derives active navbar fields by tab/view, and forwards provider-specific visible fields to every tab.
- `tabFiles.svelte`, `tabProps.svelte`, `tabTags.svelte`, and `tabContent.svelte` accept `visibleFields` and pass it into `PanelExplorer`.
- `panelExplorer.svelte` accepts the threaded `visibleFields` prop so Task 5 can consume it when the cards renderer is introduced.

## Verification

- RED:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false` failed because the overlay did not emit `onVisibleFieldsChange`.
- Focused GREEN:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false` passed with 1 file / 3 tests.
- Svelte autofixer:
  `overlayViewMenu.svelte`, `navbarExplorer.svelte`, `pageFilters.svelte`, `tabFiles.svelte`, `tabProps.svelte`, `tabTags.svelte`, `tabContent.svelte`, and `panelExplorer.svelte` reported no issues.
- Broad checks:
  - `pnpm run check` passed with 0 errors and 0 warnings.
  - `pnpm run lint` passed with 0 warnings and 0 errors.
  - `pnpm run build` passed.
  - Focused component set passed with 5 files / 55 tests.
  - `pnpm run test:unit` passed with 80 files / 546 tests.
  - `pnpm run test:component` passed with 41 files / 205 tests.
