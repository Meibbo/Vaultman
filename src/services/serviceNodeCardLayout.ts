import type { TextMeasureService, TextMeasureStyle } from './serviceTextMeasure';
import type { TreeNode } from '../types/typeNode';
import { nodeFieldText } from './serviceNodeFieldVisibility';

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
		const text = nodeFieldText(providerId, node, id);
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
