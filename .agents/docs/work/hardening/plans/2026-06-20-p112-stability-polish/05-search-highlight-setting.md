---
title: P112 Task 5 Search Highlight Setting
type: implementation-plan-task
status: active
lifecycle: active
parent: "[[docs/work/hardening/plans/2026-06-20-p112-stability-polish/index|P112 Stability Polish plan]]"
created: 2026-06-20T02:18:00
updated: 2026-06-20T02:18:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/plan
---

# Task 5: Explorer Search Highlight Setting

**Files:**
- Modify: `src/types/typeSettings.ts`
- Modify: `src/VaultmanSettings.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/components/containers/explorerTags.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Test: `test/unit/settingsDefaults.test.ts`
- Test: `test/unit/searchHighlightFlickerSource.test.ts`
- Test: `test/unit/searchHighlightStabilitySource.test.ts`

- [ ] **Step 1: Add RED default-setting test**

In `test/unit/settingsDefaults.test.ts`, add:

```ts
it('keeps explorer search highlights disabled by default', () => {
	expect(DEFAULT_SETTINGS.explorerSearchHighlights).toBe(false);
});
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/settingsDefaults.test.ts --config vitest.unit.config.mts
```

Expected: FAIL because the setting does not exist.

- [ ] **Step 2: Add RED source guards for settings UI and explorer gating**

In search-highlight source tests, add raw imports if missing:

```ts
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
```

Assert:

```ts
expect(settingsSource).toContain("translate('settings.search_highlights')");
expect(propsSource).toContain('this.plugin.settings?.explorerSearchHighlights');
expect(tagsSource).toContain('this.plugin.settings?.explorerSearchHighlights');
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/searchHighlightFlickerSource.test.ts test/unit/searchHighlightStabilitySource.test.ts --config vitest.unit.config.mts
```

Expected: FAIL.

- [ ] **Step 3: Add setting type and default**

In `src/types/typeSettings.ts`, add to `VaultmanSettings` near explorer settings:

```ts
/** Highlight explorer rows/cards that match the current explorer search */
explorerSearchHighlights: boolean;
```

Add to `DEFAULT_SETTINGS`:

```ts
explorerSearchHighlights: false,
```

- [ ] **Step 4: Add settings toggle**

In `src/VaultmanSettings.ts`, after `minimalStyle` or before badge color settings:

```ts
new Setting(containerEl)
	.setName(translate('settings.search_highlights'))
	.setDesc(translate('settings.search_highlights.desc'))
	.addToggle((toggle) =>
		toggle
			.setValue(this.plugin.settings.explorerSearchHighlights)
			.onChange(async (value) => {
				this.plugin.settings.explorerSearchHighlights = value;
				await this.plugin.saveSettings();
			}),
	);
```

Add i18n keys:

```ts
'settings.search_highlights': 'Explorer search highlights',
'settings.search_highlights.desc': 'Highlight explorer rows that match the current search.',
```

Spanish:

```ts
'settings.search_highlights': 'Highlights de busqueda en explorers',
'settings.search_highlights.desc': 'Resalta filas de explorers que coinciden con la busqueda actual.',
```

- [ ] **Step 5: Gate Props and Tags highlight IDs**

In `src/components/containers/explorerProps.ts` and `src/components/containers/explorerTags.ts`, where `highlightIds` is computed or passed, wrap it:

```ts
const highlightIds = this.plugin.settings?.explorerSearchHighlights
	? this._highlightIdsForSearch(...)
	: new Set<string>();
```

If the current code computes inline, preserve the helper and gate the final `searchHighlightIds` prop:

```ts
searchHighlightIds: this.plugin.settings?.explorerSearchHighlights ? highlightIds : new Set<string>(),
```

Do not add highlight state to row signatures in `viewTree.ts` or `viewNodeTable.ts`.

- [ ] **Step 6: Run focused GREEN gate**

```powershell
corepack pnpm exec vitest run test/unit/settingsDefaults.test.ts test/unit/searchHighlightFlickerSource.test.ts test/unit/searchHighlightStabilitySource.test.ts --config vitest.unit.config.mts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/types/typeSettings.ts src/VaultmanSettings.ts src/components/containers/explorerProps.ts src/components/containers/explorerTags.ts src/i18n/en.ts src/i18n/es.ts test/unit/settingsDefaults.test.ts test/unit/searchHighlightFlickerSource.test.ts test/unit/searchHighlightStabilitySource.test.ts
git commit -m "feat(settings): gate explorer search highlights"
```
