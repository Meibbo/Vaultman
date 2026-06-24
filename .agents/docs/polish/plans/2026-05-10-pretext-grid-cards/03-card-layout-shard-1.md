---
title: "Node card layout service - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout|Node card layout service]]"
shard_source: ".agents/docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout.md"
shard_of: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout|Node card layout service]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# Node card layout service - continuation 1

Continua desde [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout|Node card layout service]].

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
