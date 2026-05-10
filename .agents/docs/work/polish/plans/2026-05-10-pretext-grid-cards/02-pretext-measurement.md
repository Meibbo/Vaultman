---
title: Pretext measurement service
type: implementation-plan
status: done
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T00:35:00
tags:
  - agent/plan
  - initiative/polish
  - performance
---


# Task 2: Pretext Measurement Service

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/services/serviceTextMeasure.ts`
- Test: `test/unit/services/serviceTextMeasure.test.ts`

## Steps

- [x] **Step 1: Add the dependency**

Run:

```powershell
pnpm add @chenglou/pretext
```

Expected: `package.json` gains `@chenglou/pretext` under `dependencies`, and
`pnpm-lock.yaml` is updated.

- [x] **Step 2: Write failing text measurement tests**

Create `test/unit/services/serviceTextMeasure.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
	createTextMeasureService,
	fallbackTextMeasureEngine,
	type TextMeasureEngine,
	type TextMeasureStyle,
} from '../../../src/services/serviceTextMeasure';

const style: TextMeasureStyle = {
	font: '12px Inter',
	lineHeight: 16,
	letterSpacing: 0,
	whiteSpace: 'normal',
};

describe('serviceTextMeasure', () => {
	it('uses fallback measurement for empty text', () => {
		const service = createTextMeasureService({ engine: fallbackTextMeasureEngine });
		expect(service.measure('', style, 120)).toEqual({ height: 0, lineCount: 0 });
	});

	it('caches prepare work by text and style', () => {
		const prepare = vi.fn((text: string) => ({ text }));
		const layout = vi.fn((_prepared: unknown, _width: number, lineHeight: number) => ({
			height: lineHeight * 2,
			lineCount: 2,
		}));
		const engine: TextMeasureEngine = { prepare, layout };
		const service = createTextMeasureService({ engine });

		expect(service.measure('alpha beta', style, 80)).toEqual({ height: 32, lineCount: 2 });
		expect(service.measure('alpha beta', style, 120)).toEqual({ height: 32, lineCount: 2 });

		expect(prepare).toHaveBeenCalledOnce();
		expect(layout).toHaveBeenCalledTimes(2);
	});

	it('separates layout cache by width and line height', () => {
		const prepare = vi.fn((text: string) => ({ text }));
		const layout = vi.fn((_prepared: unknown, width: number, lineHeight: number) => ({
			height: width > 100 ? lineHeight : lineHeight * 3,
			lineCount: width > 100 ? 1 : 3,
		}));
		const service = createTextMeasureService({ engine: { prepare, layout } });

		expect(service.measure('long text', style, 80).lineCount).toBe(3);
		expect(service.measure('long text', style, 140).lineCount).toBe(1);
		expect(service.measure('long text', { ...style, lineHeight: 18 }, 140).height).toBe(18);
		expect(layout).toHaveBeenCalledTimes(3);
	});

	it('clears caches explicitly', () => {
		const prepare = vi.fn((text: string) => ({ text }));
		const layout = vi.fn((_prepared: unknown, _width: number, lineHeight: number) => ({
			height: lineHeight,
			lineCount: 1,
		}));
		const service = createTextMeasureService({ engine: { prepare, layout } });

		service.measure('alpha', style, 80);
		service.clear();
		service.measure('alpha', style, 80);

		expect(prepare).toHaveBeenCalledTimes(2);
	});
});
```

- [x] **Step 3: Run the tests and verify they fail**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts
```

Expected: fail because `serviceTextMeasure.ts` does not exist.

- [x] **Step 4: Implement `serviceTextMeasure.ts`**

Create `src/services/serviceTextMeasure.ts`:

```ts
import { layout as pretextLayout, prepare as pretextPrepare } from '@chenglou/pretext';

export interface TextMeasureStyle {
	font: string;
	lineHeight: number;
	letterSpacing?: number;
	whiteSpace?: 'normal' | 'pre-wrap';
	wordBreak?: 'normal' | 'keep-all';
}

export interface TextMeasureResult {
	height: number;
	lineCount: number;
}

export interface TextMeasureEngine {
	prepare(text: string, font: string, options?: Record<string, unknown>): unknown;
	layout(prepared: unknown, width: number, lineHeight: number): TextMeasureResult;
}

export interface TextMeasureService {
	measure(text: string, style: TextMeasureStyle, width: number): TextMeasureResult;
	clear(): void;
}

export const pretextTextMeasureEngine: TextMeasureEngine = {
	prepare: (text, font, options) => pretextPrepare(text, font, options),
	layout: (prepared, width, lineHeight) =>
		pretextLayout(prepared as Parameters<typeof pretextLayout>[0], width, lineHeight),
};

export const fallbackTextMeasureEngine: TextMeasureEngine = {
	prepare: (text) => text,
	layout: (prepared, width, lineHeight) => {
		const text = String(prepared ?? '');
		if (!text) return { height: 0, lineCount: 0 };
		const approxCharsPerLine = Math.max(1, Math.floor(width / 8));
		const lineCount = Math.max(1, Math.ceil(text.length / approxCharsPerLine));
		return { height: lineCount * lineHeight, lineCount };
	},
};

export function createTextMeasureService({
	engine = pretextTextMeasureEngine,
}: {
	engine?: TextMeasureEngine;
} = {}): TextMeasureService {
	const preparedCache = new Map<string, unknown>();
	const layoutCache = new Map<string, TextMeasureResult>();

	function styleKey(style: TextMeasureStyle): string {
		return [
			style.font,
			style.lineHeight,
			style.letterSpacing ?? 0,
			style.whiteSpace ?? 'normal',
			style.wordBreak ?? 'normal',
		].join('\u0001');
	}

	function prepareOptions(style: TextMeasureStyle): Record<string, unknown> {
		return {
			whiteSpace: style.whiteSpace ?? 'normal',
			wordBreak: style.wordBreak ?? 'normal',
			letterSpacing: style.letterSpacing ?? 0,
		};
	}

	return {
		measure(text, style, width) {
			if (!text || width <= 0 || style.lineHeight <= 0) return { height: 0, lineCount: 0 };
			const roundedWidth = Math.max(1, Math.round(width));
			const key = `${text}\u0000${styleKey(style)}`;
			let prepared = preparedCache.get(key);

Continua en [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement-shard-1|continuacion 1]].