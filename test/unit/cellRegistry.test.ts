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
	// U121-003: `parent` joins the props and tags defaults. It only applies while
	// `nested` is off, and on it reproduces the label those explorers already
	// shipped (`lugar: cocina`, `parent/child`), so defaulting it on keeps the
	// flat projection exactly as it was and leaves hiding the ancestry opt-in.
	it('preserves the current visible-cell defaults exactly', () => {
		expect(defaultVisibleCells('props', 'tree')).toEqual([
			'checkbox',
			'icon',
			'text',
			'parent',
			'count',
			'nested',
		]);
		expect(defaultVisibleCells('tags', 'tree')).toEqual([
			'checkbox',
			'icon',
			'text',
			'parent',
			'count',
			'nested',
		]);
		expect(defaultVisibleCells('files', 'tree')).toEqual([
			'name',
			'ext',
			'nested',
		]);
		expect(defaultVisibleCells('snippets', 'tree')).toEqual([
			'checkbox',
			'icon',
			'text',
			'state',
		]);
		expect(defaultVisibleCells('plugins', 'tree')).toEqual([
			'checkbox',
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
			// U121-081: `files` was the only explorer without the selection
			// checkbox, which is why fileScene never offered the option. It ranks
			// first like everywhere else, and ships off by default.
			'checkbox',
			'icon',
			'name',
			'path',
			'ext',
			'mtime',
			'ctime',
			'opened',
			'words',
			'tasks',
			'file-count',
			'count',
			'nested',
		]);
		expect(
			cellsForExplorer('files', 'table').map((definition) => definition.id),
		).toEqual([
			'checkbox',
			'icon',
			'name',
			'count',
			'words',
			'ext',
			'mtime',
			'ctime',
			'opened',
			'path',
			'nested',
		]);
		expect(
			viewMenuCells('files', 'tree', undefined, true).map(
				(definition) => definition.id,
			),
		).toEqual([
			'checkbox',
			'icon',
			'name',
			'ext',
			'mtime',
			'ctime',
			'opened',
			'words',
			'tasks',
			'file-count',
			'count',
		]);
	});

	it('offers the sub count cell to props and tags tree views only', () => {
		const def = cellDef('sub');
		expect(def?.role).toBe('value');
		expect(def?.labelKey).toBe('viewmode.pill.sub');
		expect(def?.sortId).toBe('sub');
		expect(
			cellsForExplorer('props', 'tree').map(({ id }) => id),
		).toContain('sub');
		expect(cellsForExplorer('tags', 'tree').map(({ id }) => id)).toContain(
			'sub',
		);
		expect(cellsForExplorer('files', 'tree').map(({ id }) => id)).not.toContain(
			'sub',
		);
		expect(
			cellsForExplorer('props', 'table').map(({ id }) => id),
		).not.toContain('sub');
		expect(defaultVisibleCells('props', 'tree')).not.toContain('sub');
		expect(defaultVisibleCells('tags', 'tree')).not.toContain('sub');
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
			'opened',
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
			'opened',
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
			'opened',
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
		// BT5-012: the popup now feeds its own selection in so the registry can
		// hide projections that the active cells exclude.
		expect(popupSource).toContain(
			'viewMenuCells(activeTab, activeView, activePills, selectionMode)',
		);
		expect(popupSource).not.toContain('const PILLS');
	});

	it('persists a separate draggable hover order', () => {
		expect(settingsSource).toContain('filesHoverInfoOrder');
		expect(settingsSource).toContain('mergeFileHoverOrder');
		expect(settingsSource).toContain('extraSettingsEl.draggable = true');
		expect(settingsSource).toContain("addEventListener('drop'");
	});
});
