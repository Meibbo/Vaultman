// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	NODE_MOUSE_IGNORE_SELECTOR,
	DEFAULT_NODE_MOUSE_ACTIONS,
	LEGACY_NODE_MOUSE_ACTIONS,
	createMouseGestureService,
	isIgnoredMouseTarget,
	resolveNodeMouseActions,
	type MouseGestureConfig,
} from '../../../src/services/serviceMouse';

describe('serviceMouse gesture resolution', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('defers primary clicks when a surface reserves double click as secondary', () => {
		const service = createMouseGestureService();
		const handlers = gestureHandlers();
		const config: MouseGestureConfig = { primaryTiming: 'defer' };

		service.handleClick(target('fab:left'), click(), handlers, config);

		expect(handlers.primary).not.toHaveBeenCalled();
		vi.advanceTimersByTime(249);
		expect(handlers.primary).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(handlers.primary).toHaveBeenCalledTimes(1);
		expect(handlers.secondary).not.toHaveBeenCalled();
	});

	it('fires secondary only for two clicks inside the configured double-click window', () => {
		const service = createMouseGestureService();
		const handlers = gestureHandlers();
		const config: MouseGestureConfig = { primaryTiming: 'defer', doubleClickMs: 250 };

		service.handleClick(target('fab:left'), click(), handlers, config);
		vi.advanceTimersByTime(120);
		service.handleClick(target('fab:left'), click(), handlers, config);
		vi.advanceTimersByTime(300);

		expect(handlers.secondary).toHaveBeenCalledTimes(1);
		expect(handlers.primary).not.toHaveBeenCalled();
		expect(handlers.tertiary).not.toHaveBeenCalled();
	});

	it('treats slow repeated clicks as separate primary clicks, not as secondary', () => {
		const service = createMouseGestureService();
		const handlers = gestureHandlers();
		const config: MouseGestureConfig = { primaryTiming: 'defer', doubleClickMs: 250 };

		service.handleClick(target('fab:left'), click(), handlers, config);
		vi.advanceTimersByTime(260);
		service.handleClick(target('fab:left'), click(), handlers, config);
		vi.advanceTimersByTime(260);

		expect(handlers.primary).toHaveBeenCalledTimes(2);
		expect(handlers.secondary).not.toHaveBeenCalled();
	});

	it('keeps node primary selection immediate while still detecting quick secondary clicks', () => {
		const service = createMouseGestureService();
		const handlers = gestureHandlers();
		const config: MouseGestureConfig = { primaryTiming: 'immediate', doubleClickMs: 250 };

		service.handleClick(target('node:alpha'), click(), handlers, config);
		vi.advanceTimersByTime(100);
		service.handleClick(target('node:alpha'), click(), handlers, config);
		vi.advanceTimersByTime(300);

		expect(handlers.primary).toHaveBeenCalledTimes(1);
		expect(handlers.secondary).toHaveBeenCalledTimes(1);
		expect(handlers.tertiary).not.toHaveBeenCalled();
	});

	it('does not combine clicks from different targets into one secondary action', () => {
		const service = createMouseGestureService();
		const first = gestureHandlers();
		const second = gestureHandlers();
		const config: MouseGestureConfig = { primaryTiming: 'defer', doubleClickMs: 250 };

		service.handleClick(target('fab:left'), click(), first, config);
		vi.advanceTimersByTime(80);
		service.handleClick(target('fab:right'), click(), second, config);
		vi.advanceTimersByTime(300);

		expect(first.primary).toHaveBeenCalledTimes(1);
		expect(second.primary).toHaveBeenCalledTimes(1);
		expect(first.secondary).not.toHaveBeenCalled();
		expect(second.secondary).not.toHaveBeenCalled();
	});

	it('routes Alt+click as tertiary and cancels any pending primary', () => {
		const service = createMouseGestureService();
		const handlers = gestureHandlers();
		const config: MouseGestureConfig = { primaryTiming: 'defer', doubleClickMs: 250 };

		service.handleClick(target('fab:left'), click(), handlers, config);
		vi.advanceTimersByTime(80);
		service.handleClick(target('fab:left'), click({ altKey: true }), handlers, config);
		vi.advanceTimersByTime(300);

		expect(handlers.tertiary).toHaveBeenCalledTimes(1);
		expect(handlers.primary).not.toHaveBeenCalled();
		expect(handlers.secondary).not.toHaveBeenCalled();
	});

	it('routes middle button auxclick as tertiary', () => {
		const service = createMouseGestureService();
		const handlers = gestureHandlers();
		const event = click({ button: 1 });

		service.handleAuxClick(target('fab:left'), event, handlers);

		expect(handlers.tertiary).toHaveBeenCalledTimes(1);
		expect(handlers.primary).not.toHaveBeenCalled();
		expect(handlers.secondary).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(true);
	});

	it('recognizes SVG descendants inside node control zones as ignored targets', () => {
		const toggle = document.createElement('div');
		toggle.className = 'vm-tree-toggle';
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		toggle.appendChild(svg);

		expect(isIgnoredMouseTarget(svg, NODE_MOUSE_IGNORE_SELECTOR)).toBe(true);
	});

	it('normalizes node mouse action settings with explicit defaults', () => {
		expect(resolveNodeMouseActions(undefined)).toEqual(DEFAULT_NODE_MOUSE_ACTIONS);
		expect(resolveNodeMouseActions(undefined, LEGACY_NODE_MOUSE_ACTIONS)).toEqual(
			LEGACY_NODE_MOUSE_ACTIONS,
		);
		expect(
			resolveNodeMouseActions({
				primary: 'node-note',
				secondary: 'bogus' as never,
				tertiary: 'filter',
			}),
		).toEqual({
			primary: 'node-note',
			secondary: DEFAULT_NODE_MOUSE_ACTIONS.secondary,
			tertiary: 'filter',
		});
	});
});

function gestureHandlers() {
	return {
		primary: vi.fn(),
		secondary: vi.fn(),
		tertiary: vi.fn(),
	};
}

function target(key: string) {
	return { key };
}

function click(init: MouseEventInit = {}) {
	return new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		button: 0,
		...init,
	});
}
