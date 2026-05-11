---
title: ALPHA Dependencies And UnoCSS
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

# ALPHA Dependencies And UnoCSS

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
