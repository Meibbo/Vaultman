import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DeferredExplorerRender } from '../../src/logic/logicDeferredExplorerRender';

describe('DeferredExplorerRender (BT5-030)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('window', { clearTimeout, setTimeout });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('keeps repeated hidden invalidations dirty without rendering', () => {
		const render = vi.fn();
		const deferred = new DeferredExplorerRender(180);

		deferred.invalidate(false, render);
		deferred.invalidate(false, render);
		vi.runAllTimers();

		expect(render).not.toHaveBeenCalled();
		expect(deferred.isDirty).toBe(true);
	});

	it('coalesces visible invalidations into one trailing render', () => {
		const render = vi.fn();
		const deferred = new DeferredExplorerRender(180);

		deferred.invalidate(true, render);
		vi.advanceTimersByTime(100);
		deferred.invalidate(true, render);
		vi.advanceTimersByTime(179);

		expect(render).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(render).toHaveBeenCalledTimes(1);
		expect(deferred.isDirty).toBe(false);
	});

	it('cancels a pending visible render when the panel becomes hidden', () => {
		const render = vi.fn();
		const deferred = new DeferredExplorerRender(180);

		deferred.invalidate(true, render);
		vi.advanceTimersByTime(100);
		deferred.invalidate(false, render);
		vi.runAllTimers();

		expect(render).not.toHaveBeenCalled();
		expect(deferred.isDirty).toBe(true);
	});

	it('renders one dirty hidden state after activation and can be disposed', () => {
		const render = vi.fn();
		const deferred = new DeferredExplorerRender(180);

		deferred.invalidate(false, render);
		expect(deferred.activate(render)).toBe(true);
		expect(deferred.activate(render)).toBe(true);
		deferred.dispose();
		vi.runAllTimers();

		expect(render).not.toHaveBeenCalled();
		expect(deferred.isDirty).toBe(true);
	});

	it('does not schedule activation work when the model is clean', () => {
		const render = vi.fn();
		const deferred = new DeferredExplorerRender(180);

		expect(deferred.activate(render)).toBe(false);
		vi.runAllTimers();
		expect(render).not.toHaveBeenCalled();
	});

	it('cancels deferred work when another path already rendered the model', () => {
		const render = vi.fn();
		const deferred = new DeferredExplorerRender(180);

		deferred.invalidate(true, render);
		deferred.satisfy();
		vi.runAllTimers();

		expect(render).not.toHaveBeenCalled();
		expect(deferred.isDirty).toBe(false);
	});
});
