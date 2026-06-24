---
title: Product feature libraries
type: research
status: active
parent: "[[docs/work/hardening/research/2026-05-12-library-usage-inventory/index|Library usage inventory]]"
created: 2026-05-12T00:00:00
updated: 2026-05-12T00:00:00
tags:
  - agent/work
  - initiative/hardening
  - research/dependencies
  - codebase/runtime
created_by: codex
updated_by: codex
---

# Product Feature Libraries

This shard covers third-party libraries used by specific Vaultman features,
views, services, or adapters. Foundational platform dependencies are covered in
[[docs/work/hardening/research/2026-05-12-library-usage-inventory/01-product-runtime|01 - Product runtime foundations]].

## `@tanstack/svelte-virtual`

Purpose: virtualization for dense explorer views. This keeps large trees,
grids, cards, and tables responsive by rendering only visible rows/items.

Product users:

- `src/components/views/viewTree.svelte`
- `src/components/views/ViewNodeCards.svelte`
- `src/components/views/ViewNodeGrid.svelte`
- `src/components/views/ViewNodeTable.svelte`
- `src/services/serviceScroll.ts`

Test and static-analysis users:

- `test/component/virtualizerItemKeys.test.ts`
- `test/component/viewTreeScrollFallback.test.ts`
- `test/component/viewNodeTableHeightmap.test.ts`
- `codeql/tests/javascript/vaultman/virtualizer-missing-item-key/VirtualizerMissingItemKey.ts`

Interpretation: this is an active product dependency. It is declared under
`devDependencies`, but product source imports it and the build bundles the
resulting code.

## `@tanstack/table-core`

Purpose: headless table engine for the node table view. It supplies table row
models, column definitions, sorting, and update utilities.

Product users:

- `src/components/views/ViewNodeTable.svelte`
- `src/services/serviceViewTableAdapter.ts`

Test users:

- `test/unit/services/serviceViewTableAdapter.test.ts`

Interpretation: this is an active product dependency for the table adapter and
table view.

## `@chenglou/pretext`

Purpose: text measurement support for UI sizing and dense list/card/grid
rendering.

Product users:

- `src/services/serviceTextMeasure.ts`

Interpretation: this is a narrow utility dependency used behind a service
boundary, which is a good containment shape.

## `@dnd-kit/svelte`

Purpose: Svelte drag-and-drop adapter.

Product users:

- `src/services/serviceDndSvelteAdapter.ts`

Test users:

- DnD-related component and service tests reference or mock the adapter layer.

Interpretation: this is intentionally isolated behind `serviceDndSvelteAdapter`
instead of being spread across views.

## `@svar-ui/svelte-filemanager`

Purpose: external Svelte file-manager component used by the SVAR file-manager
view.

Product users:

- `src/components/views/ViewSvarFileManager.svelte`

Test users:

- `test/component/viewSvarFileManager.test.ts`

Interpretation: this is a view-specific dependency. It is not part of the core
Explorer tree/grid/table rendering stack.

## `bits-ui`

Purpose: accessible headless primitives for overlays.

Product users:

- `src/components/overlays/vmDialog.svelte`
- `src/components/overlays/vmPopover.svelte`

Interpretation: this is contained at the overlay primitive boundary.

## `js-yaml`

Purpose: YAML parsing and serialization.

Product users:

- `src/services/serviceBasesInterop.ts`

Test/helper users:

- `test/helpers/yaml.ts`

Type support:

- `@types/js-yaml`

Interpretation: this dependency is currently scoped to Bases interop and tests.

## `unocss` And `@unocss/vite`

Purpose: atomic CSS engine and Vite integration.

Users:

- `uno.config.ts`
- `vite.config.ts`

Interpretation: this is styling/build tooling rather than runtime product logic,
but generated styles affect product UI.

## `@git-diff-view/svelte`

Purpose according to dependency name: Svelte diff viewer.

Current observed usage:

- No direct import found in product code, tests, scripts, or root configs.
- `src/components/views/viewDiff.svelte` currently appears to own the diff view
  locally rather than importing `@git-diff-view/svelte`.

Interpretation: declared but not directly used by the current source scan. This
needs a dependency-audit decision before removing, because it may be planned,
stale, or used through a path not covered by the scan.
