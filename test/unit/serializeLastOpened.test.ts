import { afterEach, describe, expect, it, vi } from 'vitest';
import { serializeLastOpened } from '../../src/logic/logicSerializeLastOpened';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('cooperative last-opened serialization', () => {
	it('preserves timestamps and escaped paths as valid JSON', async () => {
		// Given: paths that cannot be interpolated into JSON without escaping.
		const record = { 'a"b\\c.md': 100, '日本語.md': 200 };
		// When: serializing a snapshot.
		const result = await serializeLastOpened(record);
		// Then: the durable shape is unchanged, including an empty record.
		expect(JSON.parse(result)).toEqual(record);
		expect(await serializeLastOpened({})).toBe('{}');
	});

	it('yields to the event loop when its work budget is exhausted', async () => {
		// Given: a clock that exhausts each turn's budget.
		vi.useFakeTimers();
		let clock = 0;
		vi.spyOn(performance, 'now').mockImplementation(() => clock += 5);
		// When: serialization crosses the work budget.
		const result = serializeLastOpened({ 'a.md': 100, 'b.md': 200 });
		// Then: it has scheduled a yield, and still produces the complete record.
		expect(vi.getTimerCount()).toBeGreaterThan(0);
		await vi.runAllTimersAsync();
		expect(JSON.parse(await result)).toEqual({ 'a.md': 100, 'b.md': 200 });
	});
});
