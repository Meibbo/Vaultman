---
title: FTC-008 — Toolbar Tools menu and Settings order
type: plan
status: completed
created: 2026-07-15
updated: 2026-07-15
---

# FTC-008 — Toolbar Tools menu and Settings order

**Goal:** provide an opt-in five-node Files toolbar and make Settings taxonomy match the release vocabulary.

**Architecture:** keep the menu in `navbarFilters.svelte`, beside the commands it invokes; pass one setting-derived boolean through `pageFilters.svelte`; preserve the existing six-node toolbar when disabled and leave Props/Tags behavior unchanged.

## Task 1 — Lock the setting and Settings taxonomy

**Files**

- Modify `test/unit/settingsDefaults.test.ts`
- Add `test/unit/settingsLayoutSource.test.ts`
- Modify `src/types/typeSettings.ts`
- Modify `src/VaultmanSettings.ts`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/es.ts`

1. Add failing tests that assert:
   - `DEFAULT_SETTINGS.toolbarToolsMenu === false`;
   - the Action Presets heading translates to “Operations Presets” / “Presets de operaciones”;
   - the complete View Config block begins after the final operations-preset control and before the Style Config heading;
   - a “Condense Files tools” toggle exists in Style Config.
2. Run:

   ```powershell
   pnpm exec vitest run --config vitest.unit.config.mts test/unit/settingsDefaults.test.ts test/unit/settingsLayoutSource.test.ts
   ```

   Confirm RED on the missing setting and ordering/copy.
3. Add `toolbarToolsMenu: boolean` to `VaultmanSettings` and `false` to defaults.
4. Rename only the user-facing Action Presets heading. Preserve all preset storage keys, queue template data, and menu ids.
5. Move the entire existing View Config construction block immediately after the operations-preset list and before Style Config. This is literal `Setting` creation order inside `VaultmanSettingsTab.display()`; there are no routed Settings pages.
6. Add the opt-in toggle immediately after “Show toolbar” in Style Config and persist via the existing save/notify path.
7. Re-run focused tests and confirm GREEN.

## Task 2 — Implement the five-node Files toolbar

**Files**

- Modify `test/unit/navbarFiltersSource.test.ts`
- Modify `test/unit/pageFiltersSource.test.ts`
- Modify `src/components/pages/pageFilters.svelte`
- Modify `src/components/layout/navbarFilters.svelte`

1. Add failing source guards for the exact compact Files order:

   ```text
   tabs → view → sort → search → tools
   ```

   Assert that compact mode is conditional on `activeSectionTab === 'files'` and the new setting; disabled Files retains auto-reveal plus expansion as distinct nodes;
   Props/Tags still expose their current five nodes.
2. Add a failing assertion that `pageFilters.svelte` derives the setting reactively and passes it into `NavbarFilters`.
3. Run the two focused tests and confirm RED.
4. Add `toolbarToolsMenu` to `NavbarFilters` props and pass the settings value from `pageFilters.svelte`.
5. Import/use Obsidian's native `Menu` and add `openToolsMenu(event)`:
   - first item: Auto-reveal active file, invoking the existing handler;
   - second dynamic item: Expand all or Collapse all, invoking `toggleExplorerExpansion()`;
   - later actions, if introduced, append after these items.
6. In minimal Files markup, conditionally replace only the auto-reveal and expansion buttons with a Tools button (`lucide-wrench`) after Search. Do not change desktop non-minimal markup, Content, Props, or Tags.
7. Run the Svelte autofixer on both edited components.
8. Run:

   ```powershell
   pnpm exec vitest run --config vitest.unit.config.mts test/unit/navbarFiltersSource.test.ts test/unit/pageFiltersSource.test.ts test/unit/settingsDefaults.test.ts test/unit/settingsLayoutSource.test.ts
   pnpm run check
   git diff --check
   ```

9. Commit code only:

   ```powershell
   git add src test
   git commit -m "feat(explorer): add condensed toolbar tools menu"
   ```

## FTC-008 acceptance

- Default behavior remains the current toolbar.
- Enabled Files minimal toolbar never exceeds five first-class nodes.
- Tools uses the native context menu and preserves Auto-reveal and Expand/Collapse.
- Props/Tags remain at their current five nodes.
- View Config is directly below Operations Presets and above Style Config.
