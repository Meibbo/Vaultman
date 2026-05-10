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
	if (providerId === 'content') return contentFieldText(node, id);
	if (id === 'text' || id === 'name') return node.label;
	if (id === 'count') return node.countLabel ?? (node.count == null ? '' : String(node.count));
	if (providerId === 'files') return fileFieldText(node, id);
	if (providerId === 'props') return propFieldText(node, id);
	if (providerId === 'tags') return tagFieldText(node, id);
	return '';
}

function fileFieldText(node: TreeNode, id: string): string {
	const meta = node.meta as Partial<FileMeta> | undefined;
	const file = meta?.file as
		| {
				path?: string;
				extension?: string;
				stat?: { size?: number; mtime?: number };
		  }
		| null
		| undefined;
	if (id === 'path') return file?.path ?? meta?.folderPath ?? '';
	if (id === 'ext') return file?.extension ?? '';
	if (id === 'size') return typeof file?.stat?.size === 'number' ? `${file.stat.size} B` : '';
	if (id === 'date') {
		return typeof file?.stat?.mtime === 'number' ? new Date(file.stat.mtime).toLocaleDateString() : '';
	}
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
