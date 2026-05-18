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

export interface MeasureRowHeightOptions {
	width: number;
	style?: TextMeasureStyle;
	lineHeight?: number;
	padding?: number;
	minHeight?: number;
}

export interface TextMeasureEngine {
	prepare(text: string, font: string, options?: Record<string, unknown>): unknown;
	layout(prepared: unknown, width: number, lineHeight: number): TextMeasureResult;
}

export interface TextMeasureService {
	readonly cacheMisses: number;
	measure(text: string, style: TextMeasureStyle, width: number): TextMeasureResult;
	measureRowHeight(text: string, options: MeasureRowHeightOptions): number;
	invalidate(text: string): void;
	invalidateAll(): void;
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
		const text = typeof prepared === 'string' ? prepared : '';
		if (!text) return { height: 0, lineCount: 0 };
		const approxCharsPerLine = Math.max(1, Math.floor(width / 8));
		const lineCount = Math.max(1, Math.ceil(text.length / approxCharsPerLine));
		return { height: lineCount * lineHeight, lineCount };
	},
};

const DEFAULT_ROW_MEASURE_STYLE: TextMeasureStyle = {
	font: '14px var(--font-interface)',
	lineHeight: 18,
	letterSpacing: 0,
	whiteSpace: 'normal',
	wordBreak: 'normal',
};

export function createTextMeasureService({
	engine = pretextTextMeasureEngine,
}: {
	engine?: TextMeasureEngine;
} = {}): TextMeasureService {
	const preparedCache = new Map<string, unknown>();
	const layoutCache = new Map<string, TextMeasureResult>();
	const rowHeightCache = new Map<string, { text: string; height: number }>();
	let cacheMisses = 0;

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

	function resolvedRowStyle(options: MeasureRowHeightOptions): TextMeasureStyle {
		const base = options.style ?? DEFAULT_ROW_MEASURE_STYLE;
		return {
			...base,
			lineHeight: options.lineHeight ?? base.lineHeight,
		};
	}

	function rowHeightKey(text: string, style: TextMeasureStyle, width: number): string {
		return `${text}\u0002${styleKey(style)}\u0002${Math.max(1, Math.round(width))}`;
	}

	function invalidatePreparedAndLayout(text: string): void {
		const prefix = `${text}\u0000`;
		for (const key of preparedCache.keys()) {
			if (key.startsWith(prefix)) preparedCache.delete(key);
		}
		for (const key of layoutCache.keys()) {
			if (key.startsWith(prefix)) layoutCache.delete(key);
		}
	}

	const service: TextMeasureService = {
		get cacheMisses() {
			return cacheMisses;
		},
		measure(text, style, width) {
			if (!text || width <= 0 || style.lineHeight <= 0) return { height: 0, lineCount: 0 };
			const roundedWidth = Math.max(1, Math.round(width));
			const key = `${text}\u0000${styleKey(style)}`;
			let prepared = preparedCache.get(key);
			if (!prepared) {
				prepared = engine.prepare(text, style.font, prepareOptions(style));
				preparedCache.set(key, prepared);
			}
			const layoutKey = `${key}\u0000${roundedWidth}`;
			const cached = layoutCache.get(layoutKey);
			if (cached) return cached;
			const result = engine.layout(prepared, roundedWidth, style.lineHeight);
			layoutCache.set(layoutKey, result);
			return result;
		},
		measureRowHeight(text, options) {
			const style = resolvedRowStyle(options);
			const roundedWidth = Math.max(1, Math.round(options.width));
			const minHeight = options.minHeight ?? 32;
			if (!text || roundedWidth <= 0 || style.lineHeight <= 0) return minHeight;
			const key = rowHeightKey(text, style, roundedWidth);
			const cached = rowHeightCache.get(key);
			if (cached) return cached.height;
			cacheMisses += 1;
			const padding = options.padding ?? 10;
			const measured = service.measure(text, style, roundedWidth);
			const height = Math.ceil(Math.max(minHeight, measured.height + padding));
			rowHeightCache.set(key, { text, height });
			return height;
		},
		invalidate(text) {
			for (const [key, entry] of rowHeightCache.entries()) {
				if (entry.text === text) rowHeightCache.delete(key);
			}
			invalidatePreparedAndLayout(text);
		},
		invalidateAll() {
			preparedCache.clear();
			layoutCache.clear();
			rowHeightCache.clear();
		},
		clear() {
			service.invalidateAll();
		},
	};
	return service;
}
