import { describe, expect, it, vi } from 'vitest';
import { FrameNavReorderController } from '../../src/components/frame/frameNavReorder.svelte';

function makeOptions() {
	return {
		getPageOrder: vi.fn(() => ['ops', 'statistics', 'filters']),
		setPageOrder: vi.fn(),
		incrementRenderKey: vi.fn(),
		saveOrder: vi.fn(),
	};
}

describe('FrameNavReorderController — drawerOpen (Sub-system O)', () => {
	it('drawerOpen defaults to false', () => {
		const controller = new FrameNavReorderController(makeOptions());
		expect(controller.drawerOpen).toBe(false);
	});

	it('drawerOpen is writable', () => {
		const controller = new FrameNavReorderController(makeOptions());
		controller.drawerOpen = true;
		expect(controller.drawerOpen).toBe(true);
		controller.drawerOpen = false;
		expect(controller.drawerOpen).toBe(false);
	});
});
