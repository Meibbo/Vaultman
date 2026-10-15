import { describe, expect, it } from 'vitest';

import {
	cellDef,
	cellsForExplorer,
	cellMenuOrder,
	defaultVisibleCells,
	normalizeVisibleCellIds,
	resolveCellRenderOrder,
	viewMenuCells,
} from '../../src/logic/logicCellRegistry';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import pluginsPanelSource from '../../src/components/containers/explorerPlugins.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';

// u200-polish-L3: the `cell_update` view_option did nothing — viewTree
// force-included the update cell regardless of `visibleCells`
// (`|| cell.id === 'cell_update'`). `cell_update` is the canonical id;
// `update_available` exists nowhere in `src` (rg, 2026-10-15), so no alias
// layer is introduced — normalize + menu + render agree on one id.
describe('u200-polish-L3 cell_update view_option', () => {
	it('keeps cell_update canonical: registered once, plugins-only, off by default', () => {
		const def = cellDef('cell_update');
		expect(def?.role).toBe('control');
		expect(def?.supports).toEqual([
			{ explorer: 'plugins', fixedRank: 50, defaultOn: false },
		]);
		// No `update_available` id exists anywhere in the registry: scopes
		// tried under that name could never bind, so there is nothing to
		// alias — a single id travels through the whole tree.
		expect(cellDef('update_available')).toBeUndefined();
		for (const explorer of ['props', 'tags', 'files', 'snippets'] as const) {
			expect(
				cellsForExplorer(explorer, 'tree').map(({ id }) => id),
			).not.toContain('cell_update');
			expect(
				cellsForExplorer(explorer, 'tree').map(({ id }) => id),
			).not.toContain('update_available');
		}
	});

	it('offers the cell in the plugins view_menu and keeps it off by default', () => {
		// Plugins is tree-only (viewModesForDataSurface), and the support
		// entry carries no viewModes gate, so the offer is identical in
		// every mode the explorer can render.
		for (const viewMode of ['tree', 'table', 'cards', 'grid', 'dnd'] as const) {
			expect(
				viewMenuCells('plugins', viewMode).map(({ id }) => id),
			).toContain('cell_update');
			expect(defaultVisibleCells('plugins', viewMode)).not.toContain(
				'cell_update',
			);
		}
	});

	it('round-trips off/on through normalize, render order, and the menu', () => {
		const base = ['icon', 'text', 'state', 'config', 'nested'];
		// Off: absent from every projection…
		expect(normalizeVisibleCellIds('plugins', base, 'tree')).not.toContain(
			'cell_update',
		);
		expect(
			resolveCellRenderOrder('plugins', base, {
				byActivation: true,
				viewMode: 'tree',
			}),
		).not.toContain('cell_update');
		expect(
			resolveCellRenderOrder('plugins', base, {
				byActivation: false,
				viewMode: 'tree',
			}),
		).not.toContain('cell_update');
		const menuOff = cellMenuOrder('plugins', base, {
			byActivation: true,
			viewMode: 'tree',
		});
		expect(menuOff.find((entry) => entry.id === 'cell_update')?.active).toBe(
			false,
		);
		// …on: present, without moving any other cell.
		const on = [...base, 'cell_update'];
		expect(normalizeVisibleCellIds('plugins', on, 'tree')).toContain(
			'cell_update',
		);
		for (const byActivation of [true, false] as const) {
			const rendered = resolveCellRenderOrder('plugins', on, {
				byActivation,
				viewMode: 'tree',
			});
			expect(rendered).toContain('cell_update');
			expect(rendered.filter((id) => id !== 'cell_update')).toEqual(
				resolveCellRenderOrder('plugins', base, { byActivation, viewMode: 'tree' }),
			);
		}
		const menuOn = cellMenuOrder('plugins', on, {
			byActivation: true,
			viewMode: 'tree',
		});
		expect(menuOn.find((entry) => entry.id === 'cell_update')?.active).toBe(
			true,
		);
	});

	it('lets visibleCells govern the update cell like every other cell', () => {
		// The hardcoded id exception is gone: no flow may re-introduce an
		// unconditional affordance behind a literal id check.
		expect(viewTreeSource).not.toContain("cell.id === 'cell_update'");
		expect(viewTreeSource).toContain(
			'!visibleCells || visibleCells.has(cell.id)',
		);
		// Recycled virtual rows repaint when the toggle changes.
		expect(viewTreeSource).toMatch(/resolvedVisibleCells[\s\S]{0,200}visibleCells/);
		expect(viewTreeSource).toContain('visibleCells,');
	});

	it('emits the update cell only when an update exists; the toggle owns visibility', () => {
		// The panel still decides EXISTENCE (update available or not)…
		expect(pluginsPanelSource).toContain(
			'getPluginUpdate(entry.pluginId)',
		);
		expect(pluginsPanelSource).toContain("id: 'cell_update'");
		// …while the menu/persist path stays fully generic (no per-cell
		// special case may bypass the toggle).
		expect(navbarSource).toContain('normalizeVisibleCellIds(');
		expect(navbarSource).toContain('toggleVisibleCell(entry.id)');
		expect(navbarSource).not.toContain('cell_update');
	});
});
