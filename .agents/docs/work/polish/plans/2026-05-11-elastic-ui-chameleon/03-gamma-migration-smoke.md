---
title: GAMMA Migration And Smoke
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-gamma-overlays|gamma-overlays]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - gamma
created_by: codex
updated_by: codex
---

# GAMMA Migration And Smoke

## Task G5: Migrate layoutOverlay

Modify `src/components/layout/overlays/layoutOverlay.svelte`:

- Replace manual `role="dialog"` root with `VmDialog`.
- Use `plugin.themeService` for portal target.
- Keep existing child popup components and close callbacks.
- Preserve `.vm-popup-overlay`, `.vm-popup-content`, and `.vm-popup-island` classes so SCSS remains valid.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlaySortMenu.test.ts test/component/overlayViewMenu.test.ts test/component/popupIsland.test.ts --fileParallelism=false
obsidian vault=plugin-dev eval code="(() => Array.from(activeDocument.querySelectorAll('.vm-popup-content,.vm-dialog-content')).every(el => el.closest('.vm-root')))()"
```

Expected: tests pass and eval returns `true` after opening an overlay.

## Task G6: Multi-Window Safety Test

Add a component test that creates two documents:

- main jsdom document
- synthetic pop-out document with its own `.vm-root`

Bind `ThemeService` to the pop-out root, open a dialog, and assert:

```ts
expect(popoutRoot.querySelector('.vm-dialog-content')).toBeTruthy();
expect(document.body.querySelector('.vm-dialog-content')).toBeFalsy();
```

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayPortalTarget.test.ts --fileParallelism=false
```

Expected: pop-out isolation passes.

## Task G7: Obsidian Smoke

```bash
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => { const root=activeDocument.querySelector('.vm-root'); return !!root && !activeDocument.body.matches('.vm-dialog-content,.vm-popover-content'); })()"
obsidian vault=plugin-dev dev:errors
```

Expected: eval returns `true`; no Vaultman stack appears in dev errors.
