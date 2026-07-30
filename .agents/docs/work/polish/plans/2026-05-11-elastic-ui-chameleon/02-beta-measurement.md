---
title: BETA Measurement
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-engine|beta-engine]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - beta
created_by: codex
updated_by: codex
---

# BETA Measurement

## Task B1: Add Row Measurement Adapter

Create `src/services/serviceNodeRowMeasure.ts`:

```ts
import type { TextMeasureService, TextMeasureStyle } from './serviceTextMeasure';

export interface NodeRowMeasureInput {
	id: string;
	text: string;
	width: number;
	minHeight: number;
	paddingY: number;
	style: TextMeasureStyle;
	revision: string;
}

export class NodeRowMeasureService {
	private cache = new Map<string, number>();

	constructor(private readonly text: TextMeasureService) {}

	measure(input: NodeRowMeasureInput): number {
		const width = Math.max(1, Math.round(input.width));
		const key = [
			input.revision,
			input.id,
			width,
			input.text,
			input.style.font,
			input.style.lineHeight,
		].join('\u0001');
		const cached = this.cache.get(key);
		if (cached) return cached;
		const measured = this.text.measure(input.text, input.style, width);
		const height = Math.max(input.minHeight, Math.ceil(measured.height + input.paddingY * 2));
		this.cache.set(key, height);
		return height;
	}

	clear(): void {
		this.cache.clear();
		this.text.clear();
	}
}
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeRowMeasure.test.ts --fileParallelism=false
```

Expected: repeated same id/revision/width uses cache; changing width or revision recomputes; returned height never drops below `minHeight`.

## Task B5: Pretext And Fallback Policy

`serviceTextMeasure.ts` already uses `@chenglou/pretext` through `prepare` and `layout`. BETA must not import Pretext directly into views. Views receive `TextMeasureService` or `NodeRowMeasureService` props. Tests may inject `fallbackTextMeasureEngine`.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeRowMeasure.test.ts --fileParallelism=false
rg -n "@chenglou/pretext" src\\components src\\services
```

Expected: Pretext import appears in `src/services/serviceTextMeasure.ts` only.
