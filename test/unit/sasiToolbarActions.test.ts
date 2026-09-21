import { describe, expect, it } from 'vitest';

import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	TOOLBAR_FOCUS_SEARCH_ID,
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_SEARCHBOX_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
} from '../../src/logic/logicSasiToolbarActions';
import {
	SEARCH_CREATE_TARGET_ID,
	SEARCH_CYCLE_CATEGORY_ID,
} from '../../src/logic/logicSasiSearchActions';
import mainSource from '../../src/main.ts?raw';

describe('U130 toolbar actions in SASI', () => {
	it('registers toolbar, focus-search and searchbox actions on usable surfaces', () => {
		const { registry } = createVaultmanSasi();
		for (const id of [
			TOOLBAR_REVEAL_ACTIVE_FILE_ID,
			TOOLBAR_TOGGLE_EXPANSION_ID,
			TOOLBAR_SEARCHBOX_ID,
			TOOLBAR_FOCUS_SEARCH_ID,
			SEARCH_CYCLE_CATEGORY_ID,
			SEARCH_CREATE_TARGET_ID,
		]) {
			const resolved = registry.resolve(id);
			expect(resolved.available, id).toBe(true);
			expect(resolved.def?.supports.map((support) => support.surface)).toContain(
				'panelWidget',
			);
		}
	});

	it('publishes the bindeable toolbar/search commands by default', () => {
		expect(mainSource).toContain('TOOLBAR_REVEAL_ACTIVE_FILE_ID');
		expect(mainSource).toContain('TOOLBAR_TOGGLE_EXPANSION_ID');
		expect(mainSource).toContain('TOOLBAR_SEARCHBOX_ID');
		expect(mainSource).toContain('SEARCH_CYCLE_CATEGORY_ID');
		expect(mainSource).toContain('SEARCH_CREATE_TARGET_ID');
		expect(mainSource).toContain('setPublished(id, true)');
		expect(mainSource).toContain('invokeToolbarSasiAction(id)');
	});

	it('routes command ids to the active panel surface rather than no-op handlers', () => {
		expect(mainSource).toContain('private async invokeToolbarSasiAction');
		expect(mainSource).toContain('view.invokeToolbarSasiAction?.(actionId)');
	});
});
