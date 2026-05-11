import type { TextMeasureStyle } from './serviceTextMeasure';

export const DEFAULT_NODE_ROW_MEASURE_STYLE = {
	font: '13px var(--font-interface)',
	lineHeight: 20,
	letterSpacing: 0,
	whiteSpace: 'normal',
	wordBreak: 'normal',
} satisfies TextMeasureStyle;

export interface ResolveNodeRowMeasureStyleOptions {
	getComputedStyle?: (element: Element) => CSSStyleDeclaration;
}

export function resolveNodeRowMeasureStyle(
	root: Element | null | undefined,
	selector = '.vm-node-table-primary',
	fallback: TextMeasureStyle = DEFAULT_NODE_ROW_MEASURE_STYLE,
	options: ResolveNodeRowMeasureStyleOptions = {},
): TextMeasureStyle {
	if (!root) return fallback;
	const getStyle =
		options.getComputedStyle ??
		(typeof activeWindow === 'undefined'
			? undefined
			: activeWindow.getComputedStyle.bind(activeWindow));
	if (!getStyle) return fallback;
	const rootFallback = styleFromRoot(root, fallback, getStyle);
	const element = root.querySelector(selector);
	return styleFromElement(element, rootFallback, getStyle);
}

export function nodeRowMeasureStyleKey(style: TextMeasureStyle): string {
	return [
		style.font,
		style.lineHeight,
		style.letterSpacing ?? 0,
		style.whiteSpace ?? 'normal',
		style.wordBreak ?? 'normal',
	].join('\u0001');
}

function styleFromRoot(
	root: Element,
	fallback: TextMeasureStyle,
	getStyle: (element: Element) => CSSStyleDeclaration,
): TextMeasureStyle {
	const computed = getStyle(root);
	const interfaceFont = computed.getPropertyValue('--font-interface').trim();
	const navItemSize = cssPx(computed.getPropertyValue('--nav-item-size'));
	return {
		...fallback,
		font: interfaceFont ? `${fontSizeFromFont(fallback.font) || '13px'} ${interfaceFont}` : fallback.font,
		lineHeight: navItemSize ?? fallback.lineHeight,
	};
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
	if (!value || value.trim() === 'normal') return null;
	const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());
	return match ? Number(match[1]) : null;
}

function cssPxOrNormal(value: string): number | null {
	if (!value || value.trim() === 'normal') return 0;
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
