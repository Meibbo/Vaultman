import type { NodeCardMeasureStyle } from './serviceNodeCardLayout';
import type { TextMeasureStyle } from './serviceTextMeasure';

export const DEFAULT_NODE_CARD_MEASURE_STYLE: NodeCardMeasureStyle = {
	title: { font: '600 13px Inter', lineHeight: 18, letterSpacing: 0 },
	meta: { font: '12px Inter', lineHeight: 16, letterSpacing: 0 },
};

export interface ResolveNodeCardMeasureStyleOptions {
	getComputedStyle?: (element: Element) => CSSStyleDeclaration;
}

export function resolveNodeCardMeasureStyle(
	root: Element | null | undefined,
	fallback: NodeCardMeasureStyle = DEFAULT_NODE_CARD_MEASURE_STYLE,
	options: ResolveNodeCardMeasureStyleOptions = {},
): NodeCardMeasureStyle {
	if (!root) return fallback;
	const getStyle =
		options.getComputedStyle ??
		(typeof activeWindow === 'undefined'
			? undefined
			: activeWindow.getComputedStyle.bind(activeWindow));
	if (!getStyle) return fallback;
	const titleElement = root.querySelector('.vm-node-card-field.is-title');
	const metaElement = root.querySelector('.vm-node-card-field.is-meta');
	return {
		title: styleFromElement(titleElement, fallback.title, getStyle),
		meta: styleFromElement(metaElement, fallback.meta, getStyle),
	};
}

export function nodeCardMeasureStyleKey(style: NodeCardMeasureStyle): string {
	return [textMeasureStyleKey(style.title), textMeasureStyleKey(style.meta)].join('\u0002');
}

function styleFromElement(
	element: Element | null,
	fallback: TextMeasureStyle,
	getStyle: (element: Element) => CSSStyleDeclaration,
): TextMeasureStyle {
	if (!element) return fallback;
	const computed = getStyle(element);
	return {
		font: computedFont(computed, fallback.font),
		lineHeight: cssPx(computed.lineHeight) ?? fallback.lineHeight,
		letterSpacing: cssPxOrNormal(computed.letterSpacing) ?? fallback.letterSpacing ?? 0,
		whiteSpace: computed.whiteSpace === 'pre-wrap' ? 'pre-wrap' : fallback.whiteSpace,
		wordBreak: computed.wordBreak === 'keep-all' ? 'keep-all' : fallback.wordBreak,
	};
}

function computedFont(computed: CSSStyleDeclaration, fallback: string): string {
	if (computed.font && computed.font.includes('px')) return computed.font;
	const size = computed.fontSize || fontSizeFromFont(fallback);
	const family = computed.fontFamily || fontFamilyFromFont(fallback);
	if (!size || !family) return fallback;
	return [
		computed.fontStyle && computed.fontStyle !== 'normal' ? computed.fontStyle : '',
		computed.fontVariant && computed.fontVariant !== 'normal' ? computed.fontVariant : '',
		computed.fontWeight && computed.fontWeight !== 'normal' ? computed.fontWeight : '',
		size,
		family,
	]
		.filter(Boolean)
		.join(' ');
}

function cssPx(value: string): number | null {
	if (!value || value === 'normal') return null;
	const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());
	return match ? Number(match[1]) : null;
}

function cssPxOrNormal(value: string): number | null {
	if (!value || value === 'normal') return 0;
	return cssPx(value);
}

function fontSizeFromFont(font: string): string {
	return font.split(/\s+/).find((part) => part.endsWith('px')) ?? '';
}

function fontFamilyFromFont(font: string): string {
	const size = fontSizeFromFont(font);
	if (!size) return '';
	const index = font.indexOf(size);
	return index >= 0 ? font.slice(index + size.length).trim() : '';
}

function textMeasureStyleKey(style: TextMeasureStyle): string {
	return [
		style.font,
		style.lineHeight,
		style.letterSpacing ?? 0,
		style.whiteSpace ?? 'normal',
		style.wordBreak ?? 'normal',
	].join('\u0001');
}
