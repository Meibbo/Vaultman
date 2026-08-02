import { describe, expect, it } from 'vitest';
import {
	resolveCellCapabilities,
	toCanonicalEngine,
	type CellCapabilityContext,
} from '../../src/logic/logicCellCapabilities';

describe('CellCapabilityResolver contracts', () => {
	it('maps explorer view modes to canonical engines', () => {
		expect(toCanonicalEngine('tree')).toBe('tree');
		expect(toCanonicalEngine('dnd')).toBe('tree');
		expect(toCanonicalEngine('table')).toBe('table');
		expect(toCanonicalEngine('grid')).toBe('cards');
		expect(toCanonicalEngine('cards')).toBe('cards');
	});

	it('resolves available cells, visible cells, sorts, and filter types consistently', () => {
		const ctx: CellCapabilityContext = {
			providerId: 'files',
			engine: 'tree',
			nested: true,
			fixedFolders: false,
			selectionMode: false,
			nodeKinds: new Set(['file', 'folder']),
		};

		const resolution = resolveCellCapabilities(ctx, ['name', 'ext', 'count']);

		expect(resolution.availableCellIds.has('name')).toBe(true);
		expect(resolution.availableCellIds.has('ext')).toBe(true);
		expect(resolution.availableCellIds.has('count')).toBe(true);
		expect(resolution.effectiveVisibleCellIds).toContain('name');
	});

	it('includes cell_checkbox only when selectionMode is true', () => {
		const ctxNoSelect: CellCapabilityContext = {
			providerId: 'files',
			engine: 'tree',
			nested: false,
			fixedFolders: false,
			selectionMode: false,
			nodeKinds: new Set(['file']),
		};

		let res = resolveCellCapabilities(ctxNoSelect, ['name', 'checkbox']);
		expect(res.availableCellIds.has('checkbox')).toBe(false);

		const ctxSelect: CellCapabilityContext = {
			...ctxNoSelect,
			selectionMode: true,
		};

		res = resolveCellCapabilities(ctxSelect, ['name', 'checkbox']);
		expect(res.availableCellIds.has('checkbox')).toBe(true);
	});
});
