---
title: ALPHA Foundation
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - alpha
created_by: codex
updated_by: codex
---

# ALPHA Foundation

## Ownership

- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/pluginEntry.ts`
- Modify: `src/main.ts`
- Modify: `src/types/typeFrame.ts`
- Modify: `src/types/typeSettings.ts`
- Modify: `src/components/settings/SettingsUI.svelte`
- Modify: `src/main.scss`
- Modify: `src/styles/_tokens.scss`
- Create: `uno.config.ts`
- Create: `src/services/serviceTheme.svelte.ts`
- Create: `src/styles/_elastic.scss`
- Create: `test/unit/services/serviceTheme.test.ts`
- Create: `test/unit/styles/elasticThemeStyles.test.ts`
- Create: `test/component/settingsElasticUi.test.ts`

## Task A1: Install Style Dependencies

- [ ] Add dev dependencies:

```json
"@iconify-json/lucide": "latest",
"@unocss/preset-attributify": "latest",
"@unocss/preset-icons": "latest",
"@unocss/preset-uno": "latest",
"@unocss/vite": "latest",
"unocss": "latest"
```

- [ ] Do not install Tailwind preflight.
- [ ] Gate DaisyUI. Official DaisyUI 5 is Tailwind CSS 4 oriented. If ALPHA
  chooses direct DaisyUI, document the exact integration. Otherwise implement
  Daisy-style semantic classes as UnoCSS shortcuts named `vm-daisy-*`.

Verification:

```bash
pnpm install --lockfile-only
pnpm run check
```

Expected: lockfile resolves and TypeScript still checks.

## Task A2: Configure UnoCSS

Create `uno.config.ts`:

```ts
import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss';

export default defineConfig({
	preflights: [],
	presets: [
		presetUno({ preflight: false }),
		presetAttributify(),
		presetIcons({
			extraProperties: {
				display: 'inline-block',
				'vertical-align': 'middle',
			},
		}),
	],
	shortcuts: {
		'obsidian-mimic-file':
			'nav-file flex items-center min-w-0 rounded-[var(--radius-s)] text-[var(--text-normal)]',
		'obsidian-mimic-file-title':
			'nav-file-title min-w-0 flex-1 truncate text-[var(--text-normal)]',
		'obsidian-mimic-folder':
			'nav-folder flex min-w-0 flex-col text-[var(--text-normal)]',
		'obsidian-mimic-tree-item': 'tree-item min-w-0 text-[var(--text-normal)]',
		'obsidian-mimic-tree-self':
			'tree-item-self flex min-w-0 items-center rounded-[var(--radius-s)]',
		'obsidian-mimic-tree-inner': 'tree-item-inner min-w-0 truncate',
		'obsidian-mimic-btn':
			'clickable-icon inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-s)]',
		'obsidian-mimic-metadata-container': 'metadata-container min-w-0',
		'obsidian-mimic-metadata-property': 'metadata-property min-w-0',
		'obsidian-mimic-metadata-key': 'metadata-property-key text-[var(--text-muted)]',
		'vm-daisy-btn': 'btn inline-flex items-center justify-center gap-1.5',
		'vm-daisy-card': 'card rounded-[var(--radius-m)] bg-[var(--background-secondary)]',
		'vm-daisy-table': 'table w-full text-sm',
		'vm-icon-sm': 'h-4 w-4 shrink-0',
		'vm-icon-xs': 'h-3.5 w-3.5 shrink-0',
	},
	theme: {
		colors: {
			'vm-accent': 'var(--vm-accent)',
			'vm-text': 'var(--text-normal)',
			'vm-muted': 'var(--text-muted)',
			'vm-faint': 'var(--text-faint)',
			'vm-bg-primary': 'var(--background-primary)',
			'vm-bg-secondary': 'var(--background-secondary)',
			'vm-border': 'var(--background-modifier-border)',
		},
	},
});
```

Modify `vite.config.ts`:

```ts
import UnoCSS from '@unocss/vite';

plugins: [
	UnoCSS(),
	svelte({
		compilerOptions: { css: 'external' },
		preprocess: sveltePreprocess(),
	}),
],
```

Modify `src/pluginEntry.ts`:

```ts
import 'uno.css';
import './main.scss';

export { default } from './main';
```

Verification:

```bash
pnpm run build:plugin
node -e "const fs=require('fs'); const css=fs.readFileSync('dist/vite/styles.css','utf8'); console.log(/obsidian-mimic-file/.test(css), /--vm-accent/.test(css))"
```

Expected: build exits 0 and the node command prints `true true`.

## Task A3: Create ThemeService

Create `src/services/serviceTheme.svelte.ts`:

```ts
import type { ElasticUiSettings, VaultmanUiIdentity, VaultmanUiMode } from '../types/typeElasticUi';

export class ThemeService {
	mode: VaultmanUiMode = $state('thin');
	identity: VaultmanUiIdentity = $state('native');
	isWindowFocused = $state(true);
	reducedMotion = $state(false);
	faintModeEnabled = $state(false);
	private root: HTMLElement | null = null;
	private cleanup: (() => void) | null = null;

	get useUtilities(): boolean {
		return this.mode !== 'thin';
	}

	get useNativeDom(): boolean {
		return this.mode === 'thin' && this.identity === 'native';
	}

	get portalTarget(): HTMLElement | null {
		return this.root;
	}

	applySettings(settings: ElasticUiSettings): void {
		this.mode = settings.mode;
		this.identity = settings.identity;
		this.faintModeEnabled = settings.faintModeEnabled;
		this.reducedMotion = settings.reducedMotion;
		this.syncRootClasses();
	}

	bindRoot(root: HTMLElement): void {
		this.cleanup?.();
		this.root = root;
		const win = root.ownerDocument.defaultView ?? window;
		const onFocus = () => this.setWindowFocused(true);
		const onBlur = () => this.setWindowFocused(false);
		win.addEventListener('focus', onFocus);
		win.addEventListener('blur', onBlur);
		this.cleanup = () => {
			win.removeEventListener('focus', onFocus);
			win.removeEventListener('blur', onBlur);
		};
		root.addClass('vm-root');
		this.isWindowFocused = win.document.hasFocus();
		this.syncRootClasses();
	}

	unbindRoot(root: HTMLElement): void {
		if (this.root !== root) return;
		this.cleanup?.();
		this.cleanup = null;
		root.removeClass('vm-root');
		root.removeClass('is-vm-unfocused');
		this.root = null;
	}

	private setWindowFocused(focused: boolean): void {
		this.isWindowFocused = focused;
		this.syncRootClasses();
	}

	private syncRootClasses(): void {
		const root = this.root;
		if (!root) return;
		root.toggleClass('is-vm-unfocused', this.faintModeEnabled && !this.isWindowFocused);
		root.toggleClass('vm-mode-thin', this.mode === 'thin');
		root.toggleClass('vm-mode-balanced', this.mode === 'balanced');
		root.toggleClass('vm-mode-thick', this.mode === 'thick');
		root.toggleClass('vm-id-native', this.identity === 'native');
		root.toggleClass('vm-id-bases', this.identity === 'bases');
		root.toggleClass('vm-id-outline', this.identity === 'outline');
		root.toggleClass('vm-id-bookmarks', this.identity === 'bookmarks');
		root.toggleClass('vm-reduced-motion', this.reducedMotion);
	}
}
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts --fileParallelism=false
```

Expected: binding a root adds `vm-root`; blur toggles `is-vm-unfocused` only
when `faintModeEnabled` is true; `unbindRoot` removes root-specific classes.

## Task A4: Bind ThemeService To Plugin Root

Modify `src/main.ts`:

```ts
import { ThemeService } from './services/serviceTheme.svelte';
import { normalizeElasticUiSettings } from './types/typeElasticUi';

themeService!: ThemeService;

this.themeService = new ThemeService();
this.themeService.applySettings(normalizeElasticUiSettings(this.settings.elasticUi));
```

Modify `src/types/typeFrame.ts`:

```ts
contentEl.addClass('vm-frame');
this.plugin.themeService.bindRoot(contentEl);

// in onClose before empty()
this.plugin.themeService.unbindRoot(this.contentEl);
```

Verification:

```bash
pnpm exec vp test run --project integration --config vitest.config.ts test/integration/plugin.test.ts --fileParallelism=false
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('.vm-root.vm-mode-thin.vm-id-native'))()"
```

Expected: integration test passes and Obsidian eval returns `true`.

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

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts --fileParallelism=false
pnpm run check
```

Expected: changing mode writes `plugin.settings.elasticUi.mode`, calls
`saveSettings()`, and updates root classes through `themeService`.
