import { describe, expect, it } from 'vitest';

import {
	cellMenuOrder,
	resolveCellRenderOrder,
	sortMenuOrder,
} from '../../src/logic/logicCellRegistry';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';

describe('BT5-011 render order follows activation only when asked', () => {
	it('keeps the canonical fixed order while the setting is off', () => {
		// Activation sequence is deliberately scrambled versus the canonical rank.
		const activated = ['words', 'name', 'icon'];
		const fixed = resolveCellRenderOrder('files', activated, {
			byActivation: false,
			viewMode: 'tree',
		});
		const canonical = resolveCellRenderOrder(
			'files',
			['icon', 'name', 'words'],
			{
				byActivation: false,
				viewMode: 'tree',
			},
		);
		expect(fixed).toEqual(canonical);
	});

	it('renders in activation order when the setting is on', () => {
		// Acceptance: with Icon active, activating Props → Words → Name.
		const activated = ['icon', 'count', 'words', 'name'];
		expect(
			resolveCellRenderOrder('files', activated, {
				byActivation: true,
				viewMode: 'tree',
			}),
		).toEqual(['icon', 'count', 'words', 'name']);
	});

	it('flipping the setting never loses the stored activation history', () => {
		const activated = ['words', 'icon', 'name'];
		const off = resolveCellRenderOrder('files', activated, {
			byActivation: false,
			viewMode: 'tree',
		});
		const on = resolveCellRenderOrder('files', activated, {
			byActivation: true,
			viewMode: 'tree',
		});
		expect(on).toEqual(['words', 'icon', 'name']);
		expect(off).not.toEqual(on);
		// Turning it back on restores exactly the previous projection.
		expect(
			resolveCellRenderOrder('files', activated, {
				byActivation: true,
				viewMode: 'tree',
			}),
		).toEqual(on);
	});

	it('drops ids the surface cannot show without leaving a gap', () => {
		const activated = ['icon', 'not-a-cell', 'name'];
		expect(
			resolveCellRenderOrder('files', activated, {
				byActivation: true,
				viewMode: 'tree',
			}),
		).toEqual(['icon', 'name']);
	});

	it('never lets a contextually hidden cell reorder the rest', () => {
		// 'path' only applies with nested off; asking for it in another view
		// must not shuffle the remaining cells.
		const activated = ['icon', 'path', 'name'];
		const withPath = resolveCellRenderOrder('files', activated, {
			byActivation: true,
			viewMode: 'table',
		});
		expect(withPath.filter((id) => id !== 'path')).toEqual(['icon', 'name']);
	});
});

describe('BT5-011 menus project the same order as the render', () => {
	it('lists active cells first in render order, then inactive by fixed rank', () => {
		const activated = ['words', 'icon'];
		const menu = cellMenuOrder('files', activated, {
			byActivation: true,
			viewMode: 'tree',
		});
		expect(menu.slice(0, 2).map((entry) => entry.id)).toEqual([
			'words',
			'icon',
		]);
		expect(menu.slice(0, 2).every((entry) => entry.active)).toBe(true);
		expect(menu.slice(2).every((entry) => !entry.active)).toBe(true);

		// The inactive tail keeps the canonical order among itself.
		const inactive = menu.slice(2).map((entry) => entry.id);
		const canonicalInactive = cellMenuOrder('files', [], {
			byActivation: false,
			viewMode: 'tree',
		})
			.map((entry) => entry.id)
			.filter((id) => inactive.includes(id));
		expect(inactive).toEqual(canonicalInactive);
	});

	it('falls back to pure fixed order when the setting is off', () => {
		const menu = cellMenuOrder('files', ['words', 'icon'], {
			byActivation: false,
			viewMode: 'tree',
		});
		const canonical = cellMenuOrder('files', [], {
			byActivation: false,
			viewMode: 'tree',
		});
		expect(menu.map((entry) => entry.id)).toEqual(
			canonical.map((entry) => entry.id),
		);
	});

	it('sorts follow their linked cell, and cell-less sorts keep an explicit rank', () => {
		const options = [
			{ id: 'name', labelKey: 'sort.by.name' },
			{ id: 'words', labelKey: 'sort.by.words' },
			{ id: 'sub', labelKey: 'sort.by.sub' },
		];
		const ordered = sortMenuOrder('files', options, ['words', 'name'], {
			byActivation: true,
			viewMode: 'tree',
		});
		// 'words' and 'name' follow their cells' activation order…
		expect(ordered.map((option) => option.id).slice(0, 2)).toEqual([
			'words',
			'name',
		]);
		// …and a sort with no cell still appears exactly once, never dropped.
		expect(ordered.map((option) => option.id)).toContain('sub');
		expect(ordered).toHaveLength(options.length);
	});

	it('is stable for sorts that share no cell at all', () => {
		const options = [
			{ id: 'installed', labelKey: 'sort.by.installed' },
			{ id: 'updated', labelKey: 'sort.by.updated' },
		];
		expect(
			sortMenuOrder('snippets', options, [], {
				byActivation: true,
				viewMode: 'tree',
			}).map((option) => option.id),
		).toEqual(['installed', 'updated']);
	});
});

describe('BT5-011 wiring', () => {
	it('ships the global setting off by default', () => {
		expect(DEFAULT_SETTINGS.orderCellsByActivation).toBe(false);
	});

	it('the resolver is the single source both menus read', () => {
		// Renderer wiring is deliberately not asserted yet: reordering identity
		// cells (icon/label) is a row-layout decision still open with the dev,
		// so only the shared model has landed.
		expect(navbarSource).toMatch(/cellMenuOrder|resolveCellRenderOrder/);
	});
});
