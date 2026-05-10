---
title: Verification and documentation
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T00:00:00
tags:
  - agent/plan
  - initiative/polish
  - verification
---

# Task 6: Verification And Documentation

**Files:**

- Modify: `.agents/docs/work/polish/specs/2026-05-10-pretext-grid-cards/index.md`
- Modify: `.agents/docs/work/polish/index.md` if plan status changes
- Modify: `.agents/docs/current/status.md` only if the implementation is
  completed in the executing session and current status needs a compact link

## Steps

- [ ] **Step 1: Run focused unit tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeCardLayout.test.ts
```

Expected: all focused unit tests pass.

- [ ] **Step 2: Run focused component tests**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts test/component/viewNodeCards.test.ts test/component/panelExplorerEmpty.test.ts test/component/panelExplorerSelection.test.ts test/component/virtualizerItemKeys.test.ts --fileParallelism=false
```

Expected: all focused component tests pass.

- [ ] **Step 3: Run type and Svelte checks**

Run:

```powershell
pnpm run check
```

Expected: command exits 0.

- [ ] **Step 4: Run lint**

Run:

```powershell
pnpm run lint
```

Expected: command exits 0.

- [ ] **Step 5: Run build**

Run:

```powershell
pnpm run build
```

Expected: command exits 0 and `styles.css` is regenerated if SCSS changed.

- [ ] **Step 6: Run scoped whitespace check**

Run:

```powershell
git diff --check -- src/types/typeSettings.ts src/services/serviceNodeFieldVisibility.ts src/services/serviceTextMeasure.ts src/services/serviceNodeCardLayout.ts src/components/layout/overlays/overlayViewMenu.svelte src/components/layout/navbarExplorer.svelte src/components/pages/pageFilters.svelte src/components/pages/tabFiles.svelte src/components/pages/tabProps.svelte src/components/pages/tabTags.svelte src/components/pages/tabContent.svelte src/components/containers/panelExplorer.svelte src/components/views/ViewNodeCards.svelte src/styles/data/_cards.scss src/main.scss test/unit/services/serviceNodeFieldVisibility.test.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeCardLayout.test.ts test/component/overlayViewMenu.test.ts test/component/viewNodeCards.test.ts test/component/panelExplorerEmpty.test.ts test/component/panelExplorerSelection.test.ts test/component/virtualizerItemKeys.test.ts package.json pnpm-lock.yaml
```

Expected: command exits 0.

- [ ] **Step 7: Update PKM-AI completion notes after implementation**

If implementation is completed, append a compact implementation status to
`.agents/docs/work/polish/specs/2026-05-10-pretext-grid-cards/index.md` with:

- files changed;
- verification commands and results;
- any deviations from the plan;
- deferred follow-up for exact CSS font snapshotting, `dnd-kit`, resize, and
  multiline table rows.

- [ ] **Step 8: Keep current docs compact**

If updating `.agents/docs/current/status.md`, add only a compact link to the
source record and next action. Keep implementation detail inside the polish
spec or a dedicated result note.
