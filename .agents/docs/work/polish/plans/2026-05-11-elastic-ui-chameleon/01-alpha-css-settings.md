---
title: ALPHA CSS And Settings
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/01-alpha-foundation|alpha-foundation]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - alpha
created_by: codex
updated_by: codex
---

# ALPHA CSS And Settings

## Task A5: Add Elastic CSS Variables

Create `src/styles/_elastic.scss` and import it from `src/main.scss` after
tokens and before component SCSS:

```scss
.vm-root {
	--vm-accent: var(--text-accent);
	--vm-accent-hover: var(--interactive-accent-hover);
	--vm-text: var(--text-normal);
	--vm-text-muted: var(--text-muted);
	--vm-text-faint: var(--text-faint);
	--vm-surface: var(--background-primary);
	--vm-surface-muted: var(--background-secondary);
	--vm-border: var(--background-modifier-border);
	--vm-transition-speed: 160ms;
	--vm-active-opacity: 1;
}

.vm-root.is-vm-unfocused {
	--vm-accent: var(--text-faint);
	--vm-accent-hover: var(--text-muted);
	--vm-active-opacity: 0.72;
}

.vm-root.vm-reduced-motion {
	--vm-transition-speed: 0ms;
}

.vm-root .vm-accent {
	color: var(--vm-accent);
	transition: color var(--vm-transition-speed) ease;
}
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/elasticThemeStyles.test.ts --fileParallelism=false
pnpm run build:plugin
```

Expected: style tests find `.vm-root`, `.is-vm-unfocused`, and
`--vm-accent`; build exits 0.

## Task A6: Settings UI Controls

Add controls to `src/components/settings/SettingsUI.svelte` using existing
`Dropdown` and `Toggle` primitives:

```svelte
<Dropdown
	label="Elastic UI mode"
	value={s.elasticUi.mode}
	onChange={(value) => {
		s.elasticUi = { ...s.elasticUi, mode: value as VaultmanUiMode };
		persistSettings();
	}}
	options={[
		{ value: 'thin', label: 'Thin' },
		{ value: 'balanced', label: 'Balanced' },
		{ value: 'thick', label: 'Thick' },
	]}
/>
```

After persistence, call:

```ts
plugin.themeService?.applySettings(s.elasticUi);
```

Also add identity, Faint Mode, and reduced motion controls with the same
immutable assignment shape:

```ts
s.elasticUi = { ...s.elasticUi, identity: value as VaultmanUiIdentity };
s.elasticUi = { ...s.elasticUi, faintModeEnabled: checked };
s.elasticUi = { ...s.elasticUi, reducedMotion: checked };
```

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts --fileParallelism=false
pnpm run check
```

Expected: changing mode writes `plugin.settings.elasticUi.mode`, calls
`saveSettings()`, and updates root classes through `themeService`.
