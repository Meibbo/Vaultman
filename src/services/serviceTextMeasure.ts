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
		const text = typeof prepared === 'string' ? prepared : '';
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
		clear() {
			preparedCache.clear();
			layoutCache.clear();
		},
	};
}
