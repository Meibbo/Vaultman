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

describe('reveal narrows capability to one file', () => {
	const base: CellCapabilityContext = {
		providerId: 'files',
		engine: 'tree',
		nested: true,
		fixedFolders: false,
		selectionMode: false,
		nodeKinds: new Set(['file', 'folder']),
	};

	it('offers the vault-wide count outside reveal', () => {
		const resolution = resolveCellCapabilities({ ...base, reveal: false }, [
			'count',
		]);
		expect(resolution.availableCellIds.has('count')).toBe(true);
		expect(resolution.effectiveVisibleCellIds.has('count')).toBe(true);
	});

	it('withdraws the vault-wide count inside reveal', () => {
		// One file's projection has no vault-wide count. Rendering a zero would
		// be a number that means nothing, which is worse than no Cell.
		const resolution = resolveCellCapabilities({ ...base, reveal: true }, [
			'count',
		]);
		expect(resolution.availableCellIds.has('count')).toBe(false);
		expect(resolution.effectiveVisibleCellIds.has('count')).toBe(false);
		expect(resolution.availableSortIds.has('count')).toBe(false);
	});

	it('falls back deterministically when the saved sort is count', () => {
		const resolution = resolveCellCapabilities(
			{ ...base, reveal: true },
			['name'],
			{ sortBy: 'count', direction: 'desc' },
		);
		expect(resolution.effectiveSort).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
	});

	it('treats an absent reveal flag as not revealing', () => {
		const resolution = resolveCellCapabilities(base, ['count']);
		expect(resolution.availableCellIds.has('count')).toBe(true);
	});
});
