---
title: U121-010 plan — Pure contract
type: plan
status: active
parent: "[[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/index|U121-010 plan]]"
created: 2026-07-30T00:00:00
updated: 2026-07-30T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - glyph-color
---

# Pure contract

### Task 2: Add the pure Explorer projection contract

**Files:**

- Modify: `test/unit/glyphColor.test.ts`
- Modify: `src/logic/logicGlyphColor.ts`

- [ ] **Step 1: Write failing pure tests**

Add these imports:

```ts
import {
	explorerRainbowGlyphColor,
	resolveExplorerGlyphColor,
	resolveExplorerGlyphDecoration,
} from '../../src/logic/logicGlyphColor';
```

Add the following tests inside the existing describe:

```ts
it('maps Explorer rainbow positions to the ten-slot snippet order', () => {
	expect(explorerRainbowGlyphColor(0)).toContain('--color-rainbow-10');
	expect(explorerRainbowGlyphColor(1)).toContain('--color-rainbow-1');
	expect(explorerRainbowGlyphColor(9)).toContain('--color-rainbow-9');
	expect(explorerRainbowGlyphColor(10)).toContain('--color-rainbow-10');
	expect(explorerRainbowGlyphColor(-1)).toContain('--color-rainbow-9');
});

it('applies Explorer glyph color only inside the configured scope', () => {
	const base = {
		choice: 'accent' as const,
		customColor: '#123456',
		position: 0,
	};
	expect(
		resolveExplorerGlyphColor({
			...base,
			scope: 'files',
			kind: 'file',
		}),
	).toBe('var(--interactive-accent)');
	expect(
		resolveExplorerGlyphColor({
			...base,
			scope: 'files',
			kind: 'folder',
		}),
	).toBeNull();
	expect(
		resolveExplorerGlyphColor({
			...base,
			scope: 'folders',
			kind: 'file',
		}),
	).toBeNull();
	expect(
		resolveExplorerGlyphColor({
			...base,
			scope: 'both',
			kind: 'folder',
		}),
	).toBe('var(--interactive-accent)');
});

it('inherits a branch rainbow and keeps Iconic precedence on cell_icon', () => {
	const inherited = 'var(--color-rainbow-4, #22c55e)';
	const glyphColor = resolveExplorerGlyphColor({
		choice: 'rainbow',
		customColor: '#123456',
		scope: 'files',
		kind: 'file',
		position: 7,
		inheritedRainbowColor: inherited,
	});
	expect(glyphColor).toBe(inherited);
	expect(
		resolveExplorerGlyphDecoration(glyphColor, '#abcdef'),
	).toEqual({
		iconColor: '#abcdef',
		labelColor: inherited,
	});
	expect(resolveExplorerGlyphDecoration(glyphColor, null)).toEqual({
		iconColor: inherited,
		labelColor: inherited,
	});
	expect(resolveExplorerGlyphDecoration(null, null)).toEqual({
		iconColor: undefined,
		labelColor: undefined,
	});
});
```

- [ ] **Step 2: Run RED**

Run:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/glyphColor.test.ts
```

Expected: FAIL because the three Explorer-specific exports do not exist.

- [ ] **Step 3: Add the minimal production contract**

Keep `RAINBOW_PASTEL_FALLBACK` and `rainbowGlyphColor()` unchanged. Add:

```ts
const EXPLORER_RAINBOW_FALLBACK = [
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#14b8a6',
	'#06b6d4',
	'#3b82f6',
	'#8b5cf6',
	'#d946ef',
	'#ec4899',
] as const;

export type ExplorerGlyphNodeKind = 'folder' | 'file';

export interface ExplorerGlyphColorInput {
	choice: GlyphColorChoice;
	customColor: string;
	scope: GlyphColorScope;
	kind: ExplorerGlyphNodeKind;
	position: number;
	inheritedRainbowColor?: string | null;
}

export interface ExplorerGlyphDecoration {
	iconColor: string | undefined;
	labelColor: string | undefined;
}

export function explorerRainbowGlyphColor(position: number): string {
	const count = EXPLORER_RAINBOW_FALLBACK.length;
	const slot = ((position + count - 1) % count + count) % count;
	return `var(--color-rainbow-${slot + 1}, ${EXPLORER_RAINBOW_FALLBACK[slot]})`;
}

export function resolveExplorerGlyphColor({
	choice,
	customColor,
	scope,
	kind,
	position,
	inheritedRainbowColor,
}: ExplorerGlyphColorInput): string | null {
	const inScope =
		scope === 'both' ||
		(scope === 'folders' && kind === 'folder') ||
		(scope === 'files' && kind === 'file');
	if (!inScope || choice === 'default') return null;
	if (choice === 'rainbow') {
		return inheritedRainbowColor ?? explorerRainbowGlyphColor(position);
	}
	return resolveGlyphColorCss(choice, customColor) || null;
}

export function resolveExplorerGlyphDecoration(
	glyphColor: string | null,
	explicitIconColor: string | null | undefined,
): ExplorerGlyphDecoration {
	return {
		iconColor: explicitIconColor ?? glyphColor ?? undefined,
		labelColor: glyphColor ?? undefined,
	};
}
```

Place `GlyphColorScope` before `ExplorerGlyphColorInput` so the interface never
references a later declaration. Preserve the existing normalization fallback
to `folders`.

- [ ] **Step 4: Run GREEN and the Floating Index regression**

Run:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/glyphColor.test.ts test/unit/floatingTocSource.test.ts
```

Expected: both files PASS; the existing test still sees shared
`rainbowGlyphColor(0, 8)` use `--color-rainbow-1`.

- [ ] **Step 5: Commit the pure contract**

```powershell
git add -- src/logic/logicGlyphColor.ts test/unit/glyphColor.test.ts
git commit -m "feat(explorer): add Files glyph projection contract"
```
