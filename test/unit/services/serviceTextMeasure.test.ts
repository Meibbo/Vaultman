import { describe, expect, it, vi } from 'vitest';
import {
	createTextMeasureService,
	fallbackTextMeasureEngine,
	type TextMeasureEngine,
	type TextMeasureStyle,
} from '../../../src/services/serviceTextMeasure';

const style: TextMeasureStyle = {
	font: '12px Inter',
	lineHeight: 16,
	letterSpacing: 0,
	whiteSpace: 'normal',
};

describe('serviceTextMeasure', () => {
	it('uses fallback measurement for empty text', () => {
		const service = createTextMeasureService({ engine: fallbackTextMeasureEngine });
		expect(service.measure('', style, 120)).toEqual({ height: 0, lineCount: 0 });
	});

	it('caches prepare work by text and style', () => {
		const prepare = vi.fn((text: string) => ({ text }));
		const layout = vi.fn((_prepared: unknown, _width: number, lineHeight: number) => ({
			height: lineHeight * 2,
			lineCount: 2,
		}));
		const engine: TextMeasureEngine = { prepare, layout };
		const service = createTextMeasureService({ engine });

		expect(service.measure('alpha beta', style, 80)).toEqual({ height: 32, lineCount: 2 });
		expect(service.measure('alpha beta', style, 120)).toEqual({ height: 32, lineCount: 2 });

		expect(prepare).toHaveBeenCalledOnce();
		expect(layout).toHaveBeenCalledTimes(2);
	});

	it('separates layout cache by width and line height', () => {
		const prepare = vi.fn((text: string) => ({ text }));
		const layout = vi.fn((_prepared: unknown, width: number, lineHeight: number) => ({
			height: width > 100 ? lineHeight : lineHeight * 3,
			lineCount: width > 100 ? 1 : 3,
		}));
		const service = createTextMeasureService({ engine: { prepare, layout } });

		expect(service.measure('long text', style, 80).lineCount).toBe(3);
		expect(service.measure('long text', style, 140).lineCount).toBe(1);
		expect(service.measure('long text', { ...style, lineHeight: 18 }, 140).height).toBe(18);
		expect(layout).toHaveBeenCalledTimes(3);
	});

	it('clears caches explicitly', () => {
		const prepare = vi.fn((text: string) => ({ text }));
		const layout = vi.fn((_prepared: unknown, _width: number, lineHeight: number) => ({
			height: lineHeight,
			lineCount: 1,
		}));
		const service = createTextMeasureService({ engine: { prepare, layout } });

		service.measure('alpha', style, 80);
		service.clear();
		service.measure('alpha', style, 80);

		expect(prepare).toHaveBeenCalledTimes(2);
	});
});
