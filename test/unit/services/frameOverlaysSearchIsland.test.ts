import { describe, expect, it } from 'vitest';
import { FrameOverlayController } from '../../../src/components/frame/frameOverlays.svelte';
import { OverlayStateService } from '../../../src/services/serviceOverlayState.svelte';

function makePlugin() {
	return {
		overlayState: new OverlayStateService(),
		settings: { islandDismissOnOutsideClick: true },
	} as unknown as ConstructorParameters<typeof FrameOverlayController>[0];
}

describe('FrameOverlayController search island', () => {
	it('opens and closes search island independently of stack islands', () => {
		const plugin = makePlugin();
		const c = new FrameOverlayController(plugin, {}, {});
		c.openSearchIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('queue')).toBe(false);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(false);
		c.openQueueIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
		c.closeSearchIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(false);
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
	});

	it('keeps filters↔queue mutually exclusive while search stays open', () => {
		const plugin = makePlugin();
		const c = new FrameOverlayController(plugin, {}, {});
		c.openSearchIsland();
		c.openFiltersIsland();
		c.openQueueIsland();
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(false);
	});

	it('toggleSearchIsland flips state without touching stack islands', () => {
		const plugin = makePlugin();
		const c = new FrameOverlayController(plugin, {}, {});
		c.openFiltersIsland();
		c.toggleSearchIsland({});
		expect(plugin.overlayState.isOpen('search-island')).toBe(true);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);
		c.toggleSearchIsland({});
		expect(plugin.overlayState.isOpen('search-island')).toBe(false);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);
	});
});
