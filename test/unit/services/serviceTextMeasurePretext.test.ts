import { describe, expect, it, vi } from 'vitest';
import {
	createTextMeasureService,
	type TextMeasureEngine,
	type TextMeasureStyle,
} from '../../../src/services/serviceTextMeasure';

const style: TextMeasureStyle = {
	font: '14px Inter',
	lineHeight: 18,
	letterSpacing: 0,
	whiteSpace: 'normal',
	wordBreak: 'normal',
};

function wrappingEngine(): TextMeasureEngine {
	return {
		prepare: vi.fn((text: string) => text),
		layout: vi.fn((prepared: unknown, width: number, lineHeight: number) => {
			const text = typeof prepared === 'string' ? prepared : '';
			const charsPerLine = Math.max(1, Math.floor(width / 10));
			const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
			return { height: lineCount * lineHeight, lineCount };
		}),
	};
}

describe('TextMeasureService Pretext heightmap', () => {
	it('returns a padded number for measureRowHeight', () => {
		const service = createTextMeasureService({ engine: wrappingEngine() });

		const height = service.measureRowHeight('Short label', { width: 240, style });

		expect(typeof height).toBe('number');
		expect(height).toBeGreaterThan(18);
	});

	it('returns greater height for wrapped multi-line labels at narrow widths', () => {
		const service = createTextMeasureService({ engine: wrappingEngine() });
		const label = 'A label '.repeat(40);

		const wide = service.measureRowHeight(label, { width: 1000, style });
		const narrow = service.measureRowHeight(label, { width: 120, style });

		expect(narrow).toBeGreaterThan(wide);
	});

	it('caches row heights by label, width, and style', () => {
		const service = createTextMeasureService({ engine: wrappingEngine() });
		const before = service.cacheMisses;

		service.measureRowHeight('Cached label', { width: 240, style });
		service.measureRowHeight('Cached label', { width: 240, style });

		expect(service.cacheMisses - before).toBe(1);
	});

	it('clears cached row heights for one label on invalidate(label)', () => {
		const service = createTextMeasureService({ engine: wrappingEngine() });
		service.measureRowHeight('Key label', { width: 240, style });
		const before = service.cacheMisses;

		service.invalidate('Key label');
		service.measureRowHeight('Key label', { width: 240, style });

		expect(service.cacheMisses - before).toBe(1);
	});
});
