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


Continua en [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout-shard-1|continuacion 1]].