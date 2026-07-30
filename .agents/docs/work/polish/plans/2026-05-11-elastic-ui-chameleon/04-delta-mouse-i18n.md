---
title: DELTA Mouse And i18n
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-interaction|delta-interaction]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - delta
created_by: codex
updated_by: codex
---

# DELTA Mouse And i18n

## Task D1: Update Mouse Ignore Selectors

Modify `NODE_MOUSE_IGNORE_SELECTOR` in `src/services/serviceMouse.ts`:

```ts
export const NODE_MOUSE_IGNORE_SELECTOR = [
	'input',
	'textarea',
	'select',
	'button',
	'a',
	'.vm-tree-toggle',
	'.vm-node-grid-toggle',
	'.vm-badge',
	'.vm-tree-child-badge-indicator',
	'[role="button"]',
	'[data-bits-button-root]',
	'[data-bits-menu-item]',
	'[data-bits-dropdown-menu-item]',
	'[data-bits-popover-trigger]',
	'[data-vm-interactive]',
].join(', ');
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceMouse.test.ts --fileParallelism=false
```

Expected: clicking inside a Bits menu item returns `ignored`; normal node row click still resolves primary/secondary/tertiary gestures.

## Task D2: i18n Attribute Bridge

Create `src/services/serviceI18nAttrs.ts`:

```ts
import { translate } from '../index/i18n/lang';

export interface I18nAttrsInput {
	labelKey?: string;
	titleKey?: string;
	placeholderKey?: string;
	fallback?: string;
}

export interface I18nAttrs {
	'aria-label'?: string;
	title?: string;
	placeholder?: string;
}

export function i18nAttrs(input: I18nAttrsInput): I18nAttrs {
	return {
		'aria-label': text(input.labelKey, input.fallback),
		title: text(input.titleKey),
		placeholder: text(input.placeholderKey),
	};
}

function text(key: string | undefined, fallback = ''): string | undefined {
	if (!key) return fallback || undefined;
	const value = translate(key);
	return value || fallback || undefined;
}
```

Usage in Svelte:

```svelte
<button
	type="button"
	class="vm-node-action obsidian-mimic-btn"
	{...i18nAttrs({ labelKey: 'cmenu.binding_note.create_or_open' })}
	onclick={(event) => mouse.handleClick({ key: node.id }, event, handlers)}
>
	<span class="i-lucide-notebook vm-icon-sm" aria-hidden="true"></span>
</button>
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceI18nAttrs.test.ts --fileParallelism=false
pnpm run check
```

Expected: bridge returns translated `aria-label`, `title`, and `placeholder` without forcing components to import translation keys repeatedly.
