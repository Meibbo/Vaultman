---
title: Node card layout service
type: implementation-plan
status: done
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T00:55:00
tags:
  - agent/plan
  - initiative/polish
  - explorer/views
---

# Task 3: Node Card Layout Service

**Files:**

- Create: `src/services/serviceNodeCardLayout.ts`
- Test: `test/unit/services/serviceNodeCardLayout.test.ts`

## Steps

- [x] **Step 1: Write failing card layout tests**

Create `test/unit/services/serviceNodeCardLayout.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
	CARD_HEIGHT_BUCKETS,
	cardFieldsForNode,
	cardHeightBucketForLines,
	measureNodeCard,
	rowHeightForCards,
	type NodeCardMeasureStyle,
} from '../../../src/services/serviceNodeCardLayout';
import type { TextMeasureService } from '../../../src/services/serviceTextMeasure';
import type { ContentMeta, FileMeta, PropMeta, TagMeta, TreeNode } from '../../../src/types/typeNode';

const style: NodeCardMeasureStyle = {
	title: { font: '600 13px Inter', lineHeight: 18, letterSpacing: 0 },
	meta: { font: '12px Inter', lineHeight: 16, letterSpacing: 0 },
};

const measure: TextMeasureService = {
	measure: vi.fn((text: string, textStyle, width: number) => {
		const lineCount = Math.max(1, Math.ceil(text.length / Math.max(1, Math.floor(width / 24))));
		return { lineCount, height: lineCount * textStyle.lineHeight };
	}),
	clear: vi.fn(),
};

describe('serviceNodeCardLayout', () => {
	it('extracts file card fields from visible field ids', () => {
		const node: TreeNode<FileMeta> = {
			id: 'file:a',
			label: 'Alpha.md',
			icon: 'lucide-file',
			depth: 0,
			count: 3,
			meta: {
				file: {
					path: 'Projects/Alpha.md',
					stat: { size: 2048, mtime: 1700000000000 },
				} as unknown as FileMeta['file'],
				isFolder: false,
				folderPath: 'Projects',
			},
		};

		expect(cardFieldsForNode('files', node, ['name', 'path', 'size']).map((field) => field.id)).toEqual([
			'name',
			'path',
			'size',
		]);
		expect(cardFieldsForNode('files', node, ['name', 'path', 'size'])[1].text).toBe(
			'Projects/Alpha.md',
		);
	});

	it('extracts prop, tag, and content metadata fields', () => {
		const prop: TreeNode<PropMeta> = {
			id: 'prop:status',
			label: 'status',
			depth: 0,
			count: 4,
			meta: { propName: 'status', propType: 'text', isValueNode: false },
		};
		const tag: TreeNode<TagMeta> = {
			id: 'tag:alpha',
			label: '#alpha',
			depth: 0,
			count: 2,
			meta: { tagPath: 'alpha' },
		};
		const content: TreeNode<ContentMeta> = {
			id: 'content:1',
			label: 'match',
			depth: 0,
			meta: {
				kind: 'match',
				filePath: 'Notes/A.md',
				file: null,
				line: 4,
				before: 'before',
				match: 'needle',
				after: 'after',
			},
		};

		expect(cardFieldsForNode('props', prop, ['text', 'count', 'type']).map((f) => f.text)).toEqual([
			'status',
			'4',
			'text',
		]);
		expect(cardFieldsForNode('tags', tag, ['text', 'count']).map((f) => f.text)).toEqual([
			'#alpha',
			'2',
		]);
		expect(cardFieldsForNode('content', content, ['path', 'text']).map((f) => f.text)).toEqual([
			'Notes/A.md',
			'before needle after',
		]);
	});

	it('maps measured line counts to stable buckets', () => {
		expect(cardHeightBucketForLines(1)).toBe('compact');
		expect(cardHeightBucketForLines(3)).toBe('standard');
		expect(cardHeightBucketForLines(5)).toBe('tall');
		expect(cardHeightBucketForLines(8)).toBe('expanded');
	});

	it('measures visible card fields and returns a bucketed height', () => {
		const node: TreeNode = {
			id: 'n',
			label: 'Very long title that wraps',
			depth: 0,
			meta: {},
		};
		const layout = measureNodeCard({
			providerId: 'tags',
			node,
			visibleFields: ['text', 'count'],
			contentWidth: 80,
			style,
			measure,
		});

		expect(layout.nodeId).toBe('n');
		expect(layout.bucket).toBe('expanded');
		expect(layout.height).toBe(CARD_HEIGHT_BUCKETS.expanded);
	});

	it('uses the tallest card in a row as row height', () => {
		expect(rowHeightForCards([{ height: 72 }, { height: 136 }])).toBe(136);
	});
});
```

- [x] **Step 2: Run tests and verify they fail**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeCardLayout.test.ts
```

Expected: fail because `serviceNodeCardLayout.ts` does not exist.

- [x] **Step 3: Implement `serviceNodeCardLayout.ts`**

Create `src/services/serviceNodeCardLayout.ts` with:

```ts
import type { TextMeasureService, TextMeasureStyle } from './serviceTextMeasure';
import type { ContentMeta, FileMeta, PropMeta, TagMeta, TreeNode } from '../types/typeNode';

export type CardHeightBucket = 'compact' | 'standard' | 'tall' | 'expanded';

export const CARD_HEIGHT_BUCKETS: Record<CardHeightBucket, number> = {
	compact: 72,
	standard: 96,
	tall: 136,
	expanded: 184,
};

export interface NodeCardField {
	id: string;
	text: string;
	kind: 'title' | 'meta';
}

export interface NodeCardMeasureStyle {
	title: TextMeasureStyle;
	meta: TextMeasureStyle;
}

export interface NodeCardLayout {
	nodeId: string;
	fields: readonly NodeCardField[];
	lineCount: number;
	bucket: CardHeightBucket;
	height: number;
}

export function cardFieldsForNode(
	providerId: string,
	node: TreeNode,
	visibleFields: readonly string[],
): NodeCardField[] {
	const fields: NodeCardField[] = [];
	for (const id of visibleFields) {
		const text = fieldText(providerId, node, id);
		if (!text) continue;
		fields.push({ id, text, kind: id === 'name' || id === 'text' ? 'title' : 'meta' });
	}
	return fields;
}

export function cardHeightBucketForLines(lineCount: number): CardHeightBucket {
	if (lineCount <= 1) return 'compact';
	if (lineCount <= 3) return 'standard';
	if (lineCount <= 5) return 'tall';
	return 'expanded';
}

export function measureNodeCard({
	providerId,
	node,
	visibleFields,
	contentWidth,
	style,
	measure,
}: {
	providerId: string;
	node: TreeNode;
	visibleFields: readonly string[];
	contentWidth: number;
	style: NodeCardMeasureStyle;
	measure: TextMeasureService;
}): NodeCardLayout {
	const fields = cardFieldsForNode(providerId, node, visibleFields);
	const lineCount = fields.reduce((total, field) => {
		const textStyle = field.kind === 'title' ? style.title : style.meta;
		return total + measure.measure(field.text, textStyle, contentWidth).lineCount;
	}, 0);
	const bucket = cardHeightBucketForLines(lineCount);
	return {
		nodeId: node.id,
		fields,
		lineCount,
		bucket,
		height: CARD_HEIGHT_BUCKETS[bucket],
	};
}

export function rowHeightForCards(cards: readonly { height: number }[]): number {
	return cards.reduce((height, card) => Math.max(height, card.height), CARD_HEIGHT_BUCKETS.compact);
}

function fieldText(providerId: string, node: TreeNode, id: string): string {
	if (id === 'icon') return '';
	if (id === 'text' || id === 'name') return node.label;
	if (id === 'count') return node.countLabel ?? (node.count == null ? '' : String(node.count));
	if (providerId === 'files') return fileFieldText(node, id);
	if (providerId === 'props') return propFieldText(node, id);
	if (providerId === 'tags') return tagFieldText(node, id);
	if (providerId === 'content') return contentFieldText(node, id);
	return '';
}

function fileFieldText(node: TreeNode, id: string): string {
	const meta = node.meta as Partial<FileMeta> | undefined;
	const file = meta?.file as { path?: string; extension?: string; stat?: { size?: number; mtime?: number } } | null;
	if (id === 'path') return file?.path ?? meta?.folderPath ?? '';
	if (id === 'ext') return file?.extension ?? '';
	if (id === 'size') return typeof file?.stat?.size === 'number' ? `${file.stat.size} B` : '';
	if (id === 'date') return typeof file?.stat?.mtime === 'number' ? new Date(file.stat.mtime).toLocaleDateString() : '';
	if (id === 'tags') return '';
	return '';
}

function propFieldText(node: TreeNode, id: string): string {
	const meta = node.meta as Partial<PropMeta> | undefined;
	if (id === 'type') return meta?.propType ?? '';
	if (id === 'values') return meta?.rawValue ?? '';
	if (id === 'date') return '';
	return '';
}

function tagFieldText(node: TreeNode, id: string): string {
	const meta = node.meta as Partial<TagMeta> | undefined;
	if (id === 'files') return node.countLabel ?? (node.count == null ? '' : String(node.count));
	if (id === 'nested') return meta?.tagPath ?? '';
	if (id === 'date') return '';
	return '';
}

function contentFieldText(node: TreeNode, id: string): string {
	const meta = node.meta as Partial<ContentMeta> | undefined;
	if (id === 'path') return meta?.filePath ?? '';
	if (id === 'text') return [meta?.before, meta?.match, meta?.after].filter(Boolean).join(' ');
	if (id === 'date') return '';
	return '';
}
```

- [x] **Step 4: Run focused unit tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeCardLayout.test.ts
```

Expected: all tests pass.

## Completion Notes

- Created `src/services/serviceNodeCardLayout.ts` as a pure service that:
  - extracts visible card fields from provider-specific `TreeNode` metadata;
  - maps measured text line counts to fixed card height buckets;
  - measures cards through the injected `TextMeasureService`;
  - derives row height from the tallest card in the row.
- Created `test/unit/services/serviceNodeCardLayout.test.ts` covering file,
  prop, tag, and content field extraction, bucket selection, card measurement,
  and row-height aggregation.
- Corrected one pseudocode ordering issue during GREEN: `content:text` must use
  the content snippet (`before` + `match` + `after`) instead of the generic
  `node.label` fallback.

## Verification

- RED:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeCardLayout.test.ts`
  failed because `serviceNodeCardLayout.ts` did not exist.
- Focused GREEN:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeCardLayout.test.ts`
  passed with 1 file / 5 tests.
- Broad checks:
  - `pnpm run check` passed with 0 errors and 0 warnings.
  - `pnpm run lint` timed out once under CodeQL language-server CPU load, then
    passed with 0 warnings and 0 errors after stopping CodeQL/Java workers.
  - `pnpm run build` passed.
  - `pnpm run test:unit` passed with 80 files / 546 tests after stopping
    CodeQL/Java workers before the run.
