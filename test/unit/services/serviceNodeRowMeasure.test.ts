import { describe, expect, it, vi } from 'vitest';
import {
	NodeRowMeasureService,
	type NodeRowMeasureInput,
} from '../../../src/services/serviceNodeRowMeasure';
import type { TextMeasureService, TextMeasureStyle } from '../../../src/services/serviceTextMeasure';

const style: TextMeasureStyle = {
	font: '13px Inter',
	lineHeight: 18,
	letterSpacing: 0,
	whiteSpace: 'normal',
	wordBreak: 'normal',
};

function input(overrides: Partial<NodeRowMeasureInput> = {}): NodeRowMeasureInput {
	return {
		id: 'row-a',
		text: 'A long adopted header label',
		width: 120.4,
		minHeight: 32,
		paddingBlock: 10,
		style,
		revision: 'r1',
		...overrides,
	};
}

function service(height = 41.25): { measure: TextMeasureService; row: NodeRowMeasureService } {
	const measure: TextMeasureService = {
		measure: vi.fn(() => ({ height, lineCount: 2 })),
		clear: vi.fn(),
	};
	return { measure, row: new NodeRowMeasureService(measure) };
}

describe('NodeRowMeasureService', () => {
	it('caches repeated measurements for the same id, text, width, style, and revision', () => {
		const { measure, row } = service();

		const first = row.measure(input());
		const second = row.measure(input());

		expect(first).toBe(51.25);
		expect(second).toBe(51.25);
		expect(measure.measure).toHaveBeenCalledTimes(1);
	});

	it('recomputes layout when width changes while preserving fractional height', () => {
		const { measure, row } = service(22.5);

		expect(row.measure(input({ width: 120.2 }))).toBe(32.5);
		expect(row.measure(input({ width: 180.2 }))).toBe(32.5);

		expect(measure.measure).toHaveBeenCalledTimes(2);
		expect(measure.measure).toHaveBeenLastCalledWith(input().text, style, 180);
	});

	it('recomputes when revision changes', () => {
		const { measure, row } = service();

		row.measure(input({ revision: 'r1' }));
		row.measure(input({ revision: 'r2' }));

		expect(measure.measure).toHaveBeenCalledTimes(2);
	});

	it('clamps only to the configured minimum height', () => {
		const { row } = service(12.25);

		expect(row.measure(input({ minHeight: 40, paddingBlock: 6 }))).toBe(40);
		expect(row.measure(input({ id: 'row-b', minHeight: 10, paddingBlock: 6 }))).toBe(18.25);
	});

	it('clears adapter and text measurement caches', () => {
		const { measure, row } = service();
		row.measure(input());

		row.clear();
		row.measure(input());

		expect(measure.clear).toHaveBeenCalledOnce();
		expect(measure.measure).toHaveBeenCalledTimes(2);
	});
});
