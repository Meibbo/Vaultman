---
title: Phase 6 — Legacy cleanup
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 6 — Legacy Cleanup

Three tasks delete the legacy `serviceTheme.ts`, `applyVaultmanTheme` call, `updateGlassBlur` method, and the three legacy settings fields (`layoutTheme`, `glassBlurIntensity`, `islandBackdropBlur`). Then wire main.ts saveSettings + onunload.

## Task 13 — Delete `serviceTheme.ts` + remove call sites in `main.ts`

**Files:**
- Delete: `src/services/serviceTheme.ts`
- Delete: `test/unit/services/serviceTheme.test.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Confirm there are no remaining consumers**

Run: `grep -rn "applyVaultmanTheme\|normalizeLayoutTheme\|LAYOUT_THEME_OPTIONS" src/ test/ --include="*.ts" --include="*.svelte" | grep -v "src/services/serviceTheme.ts"`

Expected: only references in `src/main.ts` (the import at line 57 and the call inside `updateGlassBlur` at line 393).

If any other files reference `applyVaultmanTheme` or its helpers, they must be migrated first. (None expected per current audit.)

- [ ] **Step 2: Remove import and call in `main.ts`**

In `src/main.ts`:

- Remove line 57: `import { applyVaultmanTheme, normalizeLayoutTheme } from './services/serviceTheme';`
- Remove line 371: `this.settings.layoutTheme = normalizeLayoutTheme(saved.layoutTheme);`
- Remove the `updateGlassBlur()` method entirely (lines 388–394 in pre-0-B state).
  The method body was:
  ```typescript
  updateGlassBlur(): void {
    const intensity: number = this.settings.glassBlurIntensity ?? 60;
    const px = (intensity / 100) * 20;
    const body = activeDocument.body;
    body.style.setProperty('--vm-glass-blur', `${px}px`);
    applyVaultmanTheme(body, this.settings);
  }
  ```
  Delete it. Also delete the `this.updateGlassBlur();` call after hydrate (around line 147).

- [ ] **Step 3: Delete the file and its test**

Run:

```bash
git rm src/services/serviceTheme.ts test/unit/services/serviceTheme.test.ts
```

- [ ] **Step 4: Verify no stale references**

Run:

```bash
grep -rn "applyVaultmanTheme\|normalizeLayoutTheme\|LAYOUT_THEME_OPTIONS\|LayoutTheme" src/ test/ --include="*.ts" --include="*.svelte"
```

Expected: empty output.

Run:

```bash
grep -rn "updateGlassBlur" src/ test/ --include="*.ts" --include="*.svelte"
```

Expected: still has matches in `src/types/typeSettings.ts` (interface declaration), `src/components/settings/SettingsUI.svelte` (call site), and `test/component/settingsUI.test.ts` (mock). Those will be deleted in T14.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check` Expected: errors in `typeSettings.ts` about `LayoutTheme` import, `SettingsUI.svelte` calling `updateGlassBlur` on a no-longer-existing method, and `settingsUI.test.ts` mocking it. These are expected and fixed in T14.

For now, accept the broken state. Do not attempt to build (`pnpm verify` would fail). The Build pipeline is broken between T13 and T14;
that is acceptable for a single-engineer execution and the commit at the end of T13 captures the partial state.

If running this plan via subagent-driven development, **merge T13 and T14 into one branch checkpoint** — do not run a gate between them.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts
git commit -m "$(cat <<'EOF'
refactor(0-b): delete serviceTheme.ts and remove applyVaultmanTheme

Deletes the legacy class-list theme toggler. Removes the import, the
applyVaultmanTheme() call inside updateGlassBlur, the
normalizeLayoutTheme() normalization in loadSettings, the
updateGlassBlur() method entirely, and the post-hydrate call to
updateGlassBlur.

Build is intentionally broken at this commit — typeSettings.ts still
declares updateGlassBlur(): void in the interface, SettingsUI.svelte
still calls plugin.updateGlassBlur(), and settingsUI.test.ts still
mocks it. All three are repaired in T14.

If running subagent-driven, do not gate between T13 and T14.
EOF
)"
```

## Task 14 — Remove legacy settings fields + UI controls

**Files:**
- Modify: `src/types/typeSettings.ts`
- Modify: `src/components/settings/SettingsUI.svelte`
- Modify: `test/component/settingsUI.test.ts`

- [ ] **Step 1: Update `typeSettings.ts`**

Open `src/types/typeSettings.ts`. Make these edits:

- Remove the import of `LayoutTheme` at line 8.
- Remove the field `layoutTheme: LayoutTheme;` (line ~16).
- Remove the field `islandBackdropBlur: boolean;` (line ~24).
- Remove the field `glassBlurIntensity: number;` (line ~26).
- Remove the method declaration `updateGlassBlur(): void;` (line ~141).
- Change `elasticUi?: ElasticUiSettings;` to `elasticUi: ElasticUiSettings;` (drop the `?`).
- In `DEFAULT_SETTINGS`, remove these lines:
  - `layoutTheme: 'default',`
  - `islandBackdropBlur: false,`
  - `glassBlurIntensity: 15,`
- Keep `elasticUi: { ...DEFAULT_ELASTIC_UI_SETTINGS }` (already a default).

- [ ] **Step 2: Update `SettingsUI.svelte`**

Open `src/components/settings/SettingsUI.svelte`. Find:

- The `layoutTheme` dropdown (uses `LAYOUT_THEME_OPTIONS` and binds `settings.layoutTheme`). Delete the entire JSX/template block.
- The glass blur slider (binds `settings.glassBlurIntensity`, invokes `plugin.updateGlassBlur()` on input). Delete entire block.
- The island backdrop toggle (binds `settings.islandBackdropBlur`).
  Delete entire block.

Remove any now-unused imports related to these controls. If a container/section that hosted these controls becomes empty, decide whether to delete the section or leave a placeholder comment for the future Settings UI refresh sub-system to repopulate.

- [ ] **Step 3: Update `test/component/settingsUI.test.ts`**

Open the test file. Find:

- The mock object passed as `plugin` — remove the `updateGlassBlur: vi.fn()` entry.
- Any individual test that exercised the deleted UI controls (e.g.
  "shows layout theme dropdown", "glass blur slider calls updateGlassBlur") — delete those tests entirely.

Keep the rest of the test file intact.

- [ ] **Step 4: Run `pnpm check`**

Run: `pnpm check` Expected: 0 errors. If errors persist, the deletion in T13 + T14 missed a consumer. Search for the remaining symbol and clean up.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts test/unit/types/typeThemePreset.test.ts test/unit/types/typeElasticUi.test.ts test/unit/config/themePresetsBuiltin.test.ts
pnpm exec vitest run --project component --config vitest.config.ts test/component/themeServiceCustomStyleInjection.test.ts test/component/settingsUI.test.ts --fileParallelism=false
```

Expected: PASS for all.

- [ ] **Step 6: `pnpm run build:plugin`**

Run: `pnpm run build:plugin` Expected: build passes.

- [ ] **Step 7: Commit**

```bash
git add src/types/typeSettings.ts \
        src/components/settings/SettingsUI.svelte \
        test/component/settingsUI.test.ts
git commit -m "$(cat <<'EOF'
refactor(0-b): remove legacy theme settings + UI controls

Deletes three settings fields (layoutTheme, glassBlurIntensity,
islandBackdropBlur) from typeSettings.ts and DEFAULT_SETTINGS. Also
deletes the updateGlassBlur() method declaration from the plugin
interface — its body was removed in T13. Makes elasticUi required
(was optional).

In SettingsUI.svelte: removes the layoutTheme dropdown, the glass
blur slider, and the island backdrop toggle. The Settings panel
loses three controls; replacement preset selector lives in future
sub-system "Settings UI refresh."

settingsUI.test.ts loses the updateGlassBlur mock and any test that
exercised the deleted UI.
EOF
)"
```

## Task 15 — `main.ts` saveSettings sync + onunload dispose

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update `saveSettings`**

Find `saveSettings()` in `src/main.ts`. Update:

```typescript
async saveSettings(): Promise<void> {
  if (this.themeService) {
    this.settings.elasticUi.themePresetId = this.themeService.activePresetId;
    this.settings.elasticUi.customPresets = [...this.themeService.customPresets];
  }
  await this.saveData(this.settings);
}
```

If `saveSettings` was a one-liner before (`await this.saveData(this.settings);`), this is a behavioral expansion. The sync happens here so any preset mutation made via the service propagates to disk on next save.

- [ ] **Step 2: Update `onunload`**

Find `onunload()` (or the equivalent — Obsidian's `onunload` is synchronous; check existing return type). Add at the top:

```typescript
async onunload(): Promise<void> {
  this.themeService?.dispose();
  // ... rest of existing onunload body ...
}
```

If `onunload` does not currently exist, add a minimal one:

```typescript
onunload(): void {
  this.themeService?.dispose();
}
```

- [ ] **Step 3: Run `pnpm check`**

Run: `pnpm check` Expected: 0 errors.

- [ ] **Step 4: Run full unit + component tests**

Run: `pnpm run test:unit && pnpm run test:component` Expected: all pass. Note recorded baselines: pre-0-B at 129 unit / ~800 tests and 68 component / ~355 tests. Post-0-B counts may differ slightly because of T13 test deletion and T14 SettingsUI test deletion plus the new tests added in Phases 1–4. Compare with expected delta:

- Deleted: `serviceTheme.test.ts` (~5 tests).
- Deleted: a few `settingsUI.test.ts` cases.
- Added: ~10 in `typeThemePreset.test.ts`, ~10 in `themePresetsBuiltin.test.ts`, ~13 expanded in `serviceThemeRunes.test.ts`, ~10 in `themeServiceCustomStyleInjection.test.ts`.
- Net: positive growth around +30 tests overall.

If a non-target test fails, investigate before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "$(cat <<'EOF'
feat(0-b): wire main.ts saveSettings sync + onunload dispose

saveSettings now syncs themeService.activePresetId and
themeService.customPresets back into settings.elasticUi before
saveData(). User preset mutations via setPreset() / register /
unregister / update persist on next save.

onunload calls themeService.dispose() to remove the runtime <style>
element injected by #syncCustomStyles. Prevents stale style nodes
across plugin reload cycles.
EOF
)"
```

When Phase 6 is complete, proceed to [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-7-tests-and-gates|Phase 7]].
