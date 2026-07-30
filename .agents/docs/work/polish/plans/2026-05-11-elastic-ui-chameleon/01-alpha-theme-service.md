---
title: ALPHA Theme Service
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

# ALPHA Theme Service

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

Expected: binding a root adds `vm-root`; blur toggles `is-vm-unfocused` only when `faintModeEnabled` is true; `unbindRoot` removes root-specific classes.

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
