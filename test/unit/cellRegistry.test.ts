import { describe, expect, it } from 'vitest';

import {
	EXPLORER_CELL_DEFS,
	cellDef,
	cellsForExplorer,
	createExplorerCellRegistry,
	defaultVisibleCells,
	fileHoverEntries,
	isIdentityCell,
	mergeFileHoverOrder,
	normalizeFileHoverEnabled,
	normalizeVisibleCellIds,
	reorderFileHoverEntries,
	resolveFileHoverEntries,
	viewMenuCells,
} from '../../src/logic/logicCellRegistry';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupView.svelte?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';

describe('shared explorer cell registry', () => {
	it('preserves the current visible-cell defaults exactly', () => {
		expect(defaultVisibleCells('props', 'tree')).toEqual([
			'icon',
			'text',
			'count',
			'nested',
		]);
		expect(defaultVisibleCells('tags', 'tree')).toEqual([
			'icon',
			'text',
			'count',
			'nested',
		]);
		expect(defaultVisibleCells('files', 'tree')).toEqual([
			'name',
			'ext',
			'nested',
		]);
		expect(defaultVisibleCells('snippets', 'tree')).toEqual([
			'icon',
			'text',
			'state',
		]);
		expect(defaultVisibleCells('plugins', 'tree')).toEqual([
			'icon',
			'text',
			'state',
			'config',
		]);
	});

	it('expresses semantic roles and contextual fixed order without UI imports', () => {
		expect(cellDef('path')?.role).toBe('label-projection');
		expect(cellDef('nested')?.role).toBe('topology');
		expect(cellDef('state')?.role).toBe('control');
		expect(isIdentityCell('files', 'name', 'tree')).toBe(true);
		expect(isIdentityCell('files', 'count', 'tree')).toBe(false);

		expect(
			cellsForExplorer('files', 'tree').map((definition) => definition.id),
		).toEqual([
			'icon',
			'name',
			'path',
			'ext',
			'mtime',
			'ctime',
			'words',
			'tasks',
			'count',
			'nested',
		]);
		expect(
			cellsForExplorer('files', 'table').map((definition) => definition.id),
		).toEqual([
			'icon',
			'name',
			'count',
			'words',
			'ext',
			'mtime',
			'ctime',
			'path',
			'nested',
		]);
		expect(
			viewMenuCells('files', 'tree').map((definition) => definition.id),
		).toEqual([
			'icon',
			'name',
			'ext',
			'mtime',
			'ctime',
			'words',
			'tasks',
			'count',
		]);
	});

	it('makes one injected definition available to compatible menus and hover', () => {
		const registry = createExplorerCellRegistry([
			...EXPLORER_CELL_DEFS,
			{
				id: 'future-score',
				role: 'value',
				labelKey: 'viewmode.pill.future_score',
				icon: 'lucide-sparkles',
				hoverId: 'future-score',
				sortId: 'future-score',
				supports: [
					{
						explorer: 'files',
						viewModes: ['tree'],
						fixedRank: 75,
						defaultOn: false,
					},
				],
			},
		]);

		expect(
			registry.cellsForExplorer('files', 'tree').map(({ id }) => id),
		).toContain('future-score');
		expect(
			registry.viewMenuCells('files', 'tree').map(({ id }) => id),
		).toContain('future-score');
		expect(registry.fileHoverEntries().map(({ id }) => id)).toContain(
			'future-score',
		);
	});

	it('keeps explicit saved layouts explicit while discarding unknown ids', () => {
		expect(
			normalizeVisibleCellIds(
				'files',
				['words', 'name', 'future-cell', 'words'],
				'tree',
			),
		).toEqual(['words', 'name']);
	});
});

describe('Files hover registry projection', () => {
	it('migrates aliases, drops unknown ids, and merges missing entries deterministically', () => {
		expect(
			mergeFileHoverOrder(['words', 'modified', 'unknown', 'created']),
		).toEqual([
			'label',
			'path',
			'ext',
			'words',
			'mtime',
			'ctime',
			'characters',
			'tasks',
			'count',
		]);
		expect(normalizeFileHoverEnabled(['modified', 'words', 'unknown'])).toEqual(
			['mtime', 'words'],
		);
	});

	it('keeps enabled state separate from persistent order', () => {
		expect(
			resolveFileHoverEntries(['modified', 'words'], ['words', 'modified']).map(
				({ id }) => id,
			),
		).toEqual(['words', 'mtime']);
		expect(fileHoverEntries().map(({ id }) => id)).toEqual([
			'label',
			'path',
			'ext',
			'mtime',
			'ctime',
			'words',
			'characters',
			'tasks',
			'count',
		]);
	});

	it('includes representable file values and excludes non-value cells', () => {
		const ids = fileHoverEntries().map(({ id }) => id);
		expect(ids).toEqual(expect.arrayContaining(['label', 'ext', 'count']));
		expect(ids).not.toEqual(
			expect.arrayContaining(['icon', 'nested', 'config', 'state']),
		);
	});

	it('reorders persisted ids without losing future entries', () => {
		expect(
			reorderFileHoverEntries(
				['label', 'path', 'mtime', 'ctime', 'words'],
				'words',
				'path',
			),
		).toEqual([
			'label',
			'words',
			'path',
			'ext',
			'mtime',
			'ctime',
			'characters',
			'tasks',
			'count',
		]);
	});
});

describe('shared registry consumer guards', () => {
	it('keeps both view menus on the registry instead of local maps', () => {
		// BT5-011: the navbar now reads cellMenuOrder, which wraps viewMenuCells
		// and adds the activation projection.
		expect(navbarSource).toContain('cellMenuOrder(');
		expect(navbarSource).not.toContain('const CELL_LABELS');
		expect(navbarSource).not.toContain('const CELL_ICONS');
		expect(popupSource).toContain('viewMenuCells(activeTab, activeView)');
		expect(popupSource).not.toContain('const PILLS');
	});

	it('persists a separate draggable hover order', () => {
		expect(settingsSource).toContain('filesHoverInfoOrder');
		expect(settingsSource).toContain('mergeFileHoverOrder');
		expect(settingsSource).toContain('extraSettingsEl.draggable = true');
		expect(settingsSource).toContain("addEventListener('drop'");
	});
});
