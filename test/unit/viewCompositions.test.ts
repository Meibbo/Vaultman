import { describe, expect, it } from 'vitest';

import {
	BASIC_LIST_COMPOSITION,
	PREVIEW_COMPOSITION,
	defaultViewCompositions,
	seedDefaultViewCompositions,
} from '../../src/logic/logicViewCompositions';
import type { SavedLayout } from '../../src/types/typeSettings';
import mainSource from '../../src/main.ts?raw';

describe('default view compositions', () => {
	it('offers Basic list and Preview', () => {
		const names = defaultViewCompositions().map((layout) => layout.name);
		expect(names).toEqual([BASIC_LIST_COMPOSITION, PREVIEW_COMPOSITION]);
	});

	it('Basic list is a flat tree with no nested cell in any explorer', () => {
		const basic = defaultViewCompositions()[0];
		for (const tab of ['files', 'props', 'tags', 'snippets', 'plugins']) {
			const cfg = basic.config[tab];
			expect(cfg.viewMode).toBe('tree');
			expect(cfg.visibleCells).not.toContain('nested');
		}
		// Files identity is name + ext.
		expect(basic.config.files.visibleCells).toContain('name');
		expect(basic.config.files.visibleCells).toContain('ext');
	});

	it('Preview is a full tree with the floating index enabled', () => {
		const preview = defaultViewCompositions()[1];
		expect(preview.config.files.viewMode).toBe('tree');
		expect(preview.config.files.visibleCells).toContain('nested');
		expect(preview.floatingToc).toMatchObject({ enabled: true, kind: 'files' });
	});

	it('seeds without duplicating what already exists', () => {
		const existing: SavedLayout[] = [
			{ name: BASIC_LIST_COMPOSITION, summary: 'mine', config: {} },
		];
		const merged = seedDefaultViewCompositions(existing);
		expect(merged.map((layout) => layout.name)).toEqual([
			BASIC_LIST_COMPOSITION,
			PREVIEW_COMPOSITION,
		]);
		// A second pass is a no-op.
		expect(seedDefaultViewCompositions(merged)).toHaveLength(2);
		// An empty vault gets both.
		expect(seedDefaultViewCompositions([])).toHaveLength(2);
	});

	it('seeds once behind a flag so deletion sticks', () => {
		expect(mainSource).toContain('saved.viewCompositionsSeeded !== true');
		expect(mainSource).toContain('seedDefaultViewCompositions(');
		expect(mainSource).toContain('this.settings.viewCompositionsSeeded = true');
	});
});
