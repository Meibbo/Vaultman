---
title: Backlog cut 5 - generic badge module and serviceMessage
type: implementation-record
status: done
created: 2026-05-08T09:40:11
updated: 2026-05-08T10:46:49
parent: "[[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index|backlog cut 4]]"
tags:
  - agent/work
  - vaultman/backlog
created_by: codex
updated_by: codex
---

# Backlog cut 5 - generic badge module and serviceMessage

## Trigger

The user asked to stop treating hover badges, normal badges, and FAB badges as
one-off component details. Badges need a generic module because normal explorer
badges, hover action badges, and FAB count badges share vocabulary, labels,
icons, ordering, and conflict rules. The same request also introduced
`serviceMessage` as the single place for warnings, errors, and other
system-to-user messages.

Provider/API module migration is explicitly not part of this cut. It remains
cut 6 in the pending ladder.

## Design

- Add a deep badge module that owns badge descriptors rather than letting tree,
  grid, and FAB components each hard-code badge labels and icon names.
- Keep the existing `badgeRegistry` import path as a compatibility shim while
  moving the real implementation to the badge module.
- Preserve current hover badge behavior:
  - `convert` remains queue-display only.
  - already-active kinds are hidden from hover badges.
  - queued delete collapses hover actions to filter only.
- Add FAB count-badge descriptors for queue and active filters.
- Add contradiction detection in the badge module so later multi-selected badge
  operations can reuse one conflict vocabulary.
- Add `serviceMessage` with explicit message kinds: `info`, `success`,
  `warning`, and `error`.
- Migrate direct warning/error/user notice call sites only where the surface is
  already straightforward. Do not expand this cut into provider relocation or
  UI redesign.

## Acceptance

- Tree and grid hover badges consume badge descriptors from the generic badge
  module.
- FAB badges consume count descriptors from the same module.
- Existing `src/services/badgeRegistry.ts` consumers remain compatible during
  the migration.
- `serviceMessage` can emit info, success, warning, and error messages through
  one testable API.
- Migrated warnings/errors preserve user-visible text.
- Provider/API module migration remains untouched.

## Verification

Red checks:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/badges/serviceBadge.test.ts test/unit/services/serviceMessage.test.ts --fileParallelism=false`
  failed before `src/badges/serviceBadge.ts` and
  `src/services/serviceMessage.ts` existed.

Implementation:

- Added `src/badges/serviceBadge.ts` as the generic badge module:
  `BadgeKind`, `FabBadgeKind`, canonical order, badge descriptors, hover
  descriptors, FAB count descriptors, active/hover visibility helpers,
  contradiction detection, and op/node-badge mapping helpers.
- Kept `src/services/badgeRegistry.ts` as a compatibility shim that re-exports
  the new badge module.
- Updated `viewTree.svelte` and `ViewNodeGrid.svelte` to render hover badges
  from badge descriptors rather than local label/icon maps.
- Updated `navbarPillFab.svelte` and `FabDef.badgeKind` to consume FAB badge
  descriptors from the badge module.
- Added `src/services/serviceMessage.ts` with a testable
  `ServiceMessageService`, singleton `serviceMessage`, message history,
  subscription, presenter injection, and kind-specific helpers for `info`,
  `success`, `warning`, and `error`.
- Migrated straightforward direct message surfaces to `serviceMessage`:
  context-menu action failures/hide-rule warnings, queue add/result messages,
  node-binding duplicate-alias warning, queue-details warnings, prop-set
  warnings, settings binding-folder warning, and FnR template stub-token
  warnings.
- Left queue progress on a direct long-lived `Notice('', 0)` because it is an
  updating progress notice, not a one-shot system message.
- Provider/API module migration was not touched.

Tests added:

- `test/unit/badges/serviceBadge.test.ts`
  - canonical badge vocabulary, labels, icons, and order;
  - hover descriptor behavior and `convert` queue-only rule;
  - FAB count descriptor behavior for queue and filters;
  - delete-vs-mutation contradiction detection.
- `test/unit/services/serviceMessage.test.ts`
  - info/success/warning/error emission through one presenter;
  - history ordering;
  - subscriber notification;
  - warning/error logging details.

Green checks:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/badges/serviceBadge.test.ts test/unit/services/serviceMessage.test.ts test/unit/services/badgeRegistry.test.ts --fileParallelism=false`
  passed with 19 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/badges/serviceBadge.test.ts test/unit/services/serviceMessage.test.ts test/unit/services/badgeRegistry.test.ts test/unit/services/serviceFnRTemplate.test.ts test/unit/services/serviceFnRTokenAllowlist.test.ts test/unit/services/serviceNodeBinding.test.ts --fileParallelism=false`
  passed with 63 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeHoverBadges.test.ts test/component/viewGridHoverBadges.test.ts test/component/navbarPillFabBadges.test.ts test/component/navbarQueueDoubleClickClear.test.ts test/component/navbarPillDoubleClickClear.test.ts test/component/settingsUI.test.ts --fileParallelism=false`
  passed with 23 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/badges/serviceBadge.test.ts test/unit/services/badgeRegistry.test.ts test/unit/services/serviceMessage.test.ts test/unit/services/serviceCMenu.test.ts test/unit/services/serviceQueueDeletePurge.test.ts test/unit/services/serviceQueueRace.test.ts test/unit/components/explorerProps.test.ts --fileParallelism=false`
  passed with 46 tests.
- Svelte autofixer reported no blocking issues for:
  - `src/components/layout/navbarPillFab.svelte`
  - `src/components/views/viewTree.svelte`
  - `src/components/views/ViewNodeGrid.svelte`
  - `src/components/settings/SettingsUI.svelte`
- `pnpm run check` passed with `svelte-check found 0 errors and 0 warnings`.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run build` passed after removing accidental dependency drift from the
  autofixer invocation. Build output:
  - `dist/vite/styles.css` 111.25 kB, gzip 15.97 kB.
  - `dist/vite/main.js` 484.57 kB, gzip 142.84 kB.

Continuation repair, 2026-05-08T10:46:49:

- The interrupted session still had accidental package-manager drift in the
  working tree: `package.json` had moved from `pnpm@10.29.2` to `pnpm@11.0.8`,
  dependency ranges had been refreshed, `pnpm-lock.yaml` had corresponding
  churn, and `pnpm-workspace.yaml` contained unresolved `allowBuilds`
  placeholders. This made normal `pnpm exec ...` commands fail before reaching
  Vaultman code. The continuation restored only `package.json`,
  `pnpm-lock.yaml`, and `pnpm-workspace.yaml` to the repo baseline; badge code
  changes were preserved.
- Full unit verification then exposed one real codebase error outside the badge
  module: `test/unit/services/serviceQueueFragility.test.ts` failed because
  `splitYamlBody` stopped at the first standalone `---` inside frontmatter-like
  comment content and returned empty frontmatter. `splitYamlBody` now tries
  delimiter candidates from the end toward the beginning, accepts object-shaped
  YAML before empty YAML, and tolerates `---` / `...` lines that are embedded
  between YAML comment lines.
- Fresh verification after the repair:
  - `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueueFragility.test.ts --fileParallelism=false`
    passed with 1 file and 3 tests.
  - `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts test/unit/services/serviceQueueFragility.test.ts test/unit/services/serviceQueueDeletePurge.test.ts test/unit/services/serviceQueueRace.test.ts --fileParallelism=false`
    passed with 4 files and 37 tests.
  - `pnpm run test:unit` passed with 69 files and 480 tests.
  - `pnpm run check` passed with `svelte-check found 0 errors and 0 warnings`.
  - `pnpm run lint` passed with 0 warnings and 0 errors.
  - `pnpm run build` passed and synced Vite+ build artifacts.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeHoverBadges.test.ts test/component/viewGridHoverBadges.test.ts test/component/panelExplorerBadgeCollision.test.ts test/component/viewTreeDecorations.test.ts test/component/navbarPillFabBadges.test.ts --fileParallelism=false`
    passed with 5 files and 19 tests.
