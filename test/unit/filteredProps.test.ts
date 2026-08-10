import { describe, expect, it } from 'vitest';

import { projectFilteredProps } from '../../src/logic/logicFilteredProps';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import filterServiceSource from '../../src/services/serviceFilter.ts?raw';
import sortPopupSource from '../../src/components/layout/popupSort.svelte?raw';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import filteredSource from '../../src/logic/logicFilteredProps.ts?raw';

import type { PropMeta, TreeNode } from '../../src/types/typeTree';

function propNode(
	propName: string,
	propType: string,
	values: readonly (readonly [string, number])[],
	files: number,
): TreeNode<PropMeta> {
	return {
		id: propName,
		label: propName,
		count: files,
		depth: 0,
		coreCls: 'tree-item-self tappable is-clickable',
		children: values.map(([rawValue, count]) => ({
			id: `${propName}::${rawValue}`,
			label: rawValue === '' ? 'empty' : rawValue,
			count,
			depth: 1,
			coreCls: 'tree-item-self tappable is-clickable',
			children: [],
			meta: { propName, propType, isValueNode: true, rawValue },
		})),
		meta: { propName, propType, isValueNode: false },
	};
}

// The vault-wide snapshot: three properties, more values than the filtered set.
const snapshot: TreeNode<PropMeta>[] = [
	propNode(
		'lugar',
		'text',
		[
			['cocina', 9],
			['salon', 4],
			['patio', 2],
		],
		15,
	),
	propNode(
		'peso',
		'number',
		[
			['42', 3],
			['7', 1],
		],
		4,
	),
	propNode(
		'tags',
		'tags',
		[
			['casa', 6],
			['obra', 5],
		],
		11,
	),
];

describe('Filtered narrows the props projection to the surviving files', () => {
	it('drops the properties no surviving file carries', () => {
		const nodes = projectFilteredProps(snapshot, [
			{ lugar: 'cocina' },
			{ lugar: 'patio', tags: ['casa'] },
		]);
		expect(nodes.map((node) => node.id)).toEqual(['lugar', 'tags']);
	});

	it('counts over the filtered set, not over the vault', () => {
		const nodes = projectFilteredProps(snapshot, [
			{ lugar: 'cocina' },
			{ lugar: 'cocina' },
			{ lugar: 'patio' },
		]);
		const lugar = nodes.find((node) => node.id === 'lugar');
		// Three files carry it here; the vault-wide node said fifteen.
		expect(lugar?.count).toBe(3);
		expect(lugar?.children?.map((child) => [child.label, child.count])).toEqual(
			[
				['cocina', 2],
				['patio', 1],
			],
		);
	});

	it('narrows a property to the values the surviving files hold', () => {
		const nodes = projectFilteredProps(snapshot, [{ lugar: 'salon' }]);
		expect(nodes[0].children?.map((child) => child.label)).toEqual(['salon']);
	});

	it('counts a file once for a property however many values it holds', () => {
		const nodes = projectFilteredProps(snapshot, [
			{ lugar: ['cocina', 'salon', 'patio'] },
		]);
		expect(nodes[0].count).toBe(1);
		expect(nodes[0].children).toHaveLength(3);
	});

	it('keeps node identity so selection and expansion survive the switch', () => {
		const nodes = projectFilteredProps(snapshot, [{ peso: 42 }]);
		expect(nodes[0].id).toBe('peso');
		expect(nodes[0].meta.propType).toBe('number');
		expect(nodes[0].children?.map((child) => child.id)).toEqual(['peso::42']);
	});

	it('projects a value the index has not seen rather than dropping it', () => {
		const nodes = projectFilteredProps(snapshot, [{ lugar: 'terraza' }]);
		expect(nodes[0].children?.map((child) => child.id)).toEqual([
			'lugar::terraza',
		]);
	});

	it('projects a property the index has not seen with its own node', () => {
		const nodes = projectFilteredProps(snapshot, [{ nuevo: 'x' }]);
		expect(nodes.map((node) => node.id)).toEqual(['nuevo']);
		expect(nodes[0].children?.map((child) => child.id)).toEqual(['nuevo::x']);
	});

	it('keeps the snapshot order, which is the order the user already sees', () => {
		const nodes = projectFilteredProps(snapshot, [
			{ tags: ['casa'], peso: 7, lugar: 'cocina' },
		]);
		expect(nodes.map((node) => node.id)).toEqual(['lugar', 'peso', 'tags']);
	});

	it('returns the canonical empty state when the filter leaves nothing', () => {
		expect(projectFilteredProps(snapshot, [])).toEqual([]);
		expect(projectFilteredProps(snapshot, [{}])).toEqual([]);
	});

	it('ignores the position key Obsidian injects', () => {
		const nodes = projectFilteredProps(snapshot, [
			{ position: { start: {}, end: {} }, lugar: 'cocina' },
		]);
		expect(nodes.map((node) => node.id)).toEqual(['lugar']);
	});

	it('never rebuilds the vault-wide index', () => {
		// Same cost contract as reveal: the index keeps its own lifecycle and the
		// switch is a filter over it.
		for (const symbol of [
			'_buildTree',
			'getAllPropertyInfos',
			'getMarkdownFiles',
			'servicePropertyIndex',
			'logic.invalidate',
			'app.vault',
			'metadataCache',
		]) {
			expect(filteredSource).not.toContain(symbol);
		}
	});
});

describe('the Filtered switch reaches the projection', () => {
	it('narrows once, through the same entry point reveal uses', () => {
		expect(propsExplorerSource).toContain(
			'this._scopeProjection(this.logic.getTree())',
		);
		const scope = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _scopeProjection('),
			propsExplorerSource.indexOf('private _filteredFrontmatters('),
		);
		expect(scope).not.toBe('');
		// Reveal wins when both are on: it is already a single note.
		expect(scope.indexOf('this.revealActiveFile')).toBeLessThan(
			scope.indexOf('this.sortState?.filtered'),
		);
		expect(scope).toContain('projectFilteredProps');
	});

	it('reads only the surviving files, not the vault', () => {
		const reader = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _filteredFrontmatters('),
		);
		expect(reader).toContain('this.plugin.filterService.filteredFiles');
		expect(reader.slice(0, 600)).not.toContain('getMarkdownFiles');
	});

	it('repaints when the filter changes', () => {
		// The explorer already subscribes to the filter service, so a filter edit
		// reprojects without the user touching the switch again.
		expect(propsExplorerSource).toContain(
			"this.plugin.filterService.on('changed'",
		);
	});

	it('carries the switch from the menu to the explorer', () => {
		// toggleFiltered -> emitFilterChange -> handleFilterChange ->
		// applySortState -> setSortState. Every link is load-bearing: drop one and
		// the switch flips in the menu while the projection never hears about it.
		expect(sortPopupSource).toContain('filtered: sortState.filtered !== true');
		expect(sortPopupSource).toContain(
			"if (item.id === 'filtered') toggleFiltered();",
		);
		expect(navbarSource).toContain("if (option.id === 'filtered') {");
		const apply = navbarSource.slice(
			navbarSource.indexOf('function handleFilterChange'),
			navbarSource.indexOf('function sameSortState'),
		);
		expect(apply).toContain('applySortState(');
		// `filtered` must not be among the fields handleFilterChange overrides
		// from the previously applied state, or the new value is thrown away.
		expect(apply).not.toContain('filtered: appliedState.filtered');
		expect(navbarSource).toContain(
			'propExplorer?.setSortState(normalizedState)',
		);
	});

	it('survives normalization, so it persists with the rest of the sort state', () => {
		const restored = normalizeExplorerSortState('props', {
			sorts: {},
			activeScope: 'properties',
			nodeTypeFilter: null,
			filtered: true,
		});
		expect(restored.filtered).toBe(true);
		// Absent means off — global is the resting state.
		expect(normalizeExplorerSortState('props', null).filtered).toBe(false);
	});

	it('does no work when the filter narrows nothing', () => {
		// A fresh vault has every file in the filtered set, so turning the switch
		// on changes nothing — and reading every file to rediscover that is the
		// expensive way to learn nothing. This was the stall the dev reported.
		const scope = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _filteredProjection('),
			propsExplorerSource.indexOf('private _filteredFrontmatters('),
		);
		expect(scope).not.toBe('');
		const shortCircuit = scope.indexOf('narrowsVault()');
		const readsFiles = scope.indexOf('_filteredFrontmatters(');
		expect(shortCircuit).toBeGreaterThan(-1);
		// The check has to come before anything reads the files.
		expect(shortCircuit).toBeLessThan(readsFiles);
		expect(filterServiceSource).toContain('narrowsVault(): boolean {');
		// O(1): counts already maintained, no vault scan to answer it.
		const predicate = filterServiceSource.slice(
			filterServiceSource.indexOf('narrowsVault(): boolean {'),
			filterServiceSource.indexOf('hasEnabledContentSearchRule()'),
		);
		expect(predicate).not.toContain('getMarkdownFiles');
	});

	it('computes the narrowed projection once per snapshot and file set', () => {
		// Both inputs are replaced rather than mutated when they change, so
		// identity is a sound cache key; without the memo the whole tally was
		// rebuilt on every render.
		const scope = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _filteredProjection('),
			propsExplorerSource.indexOf('private _filteredFrontmatters('),
		);
		expect(scope).toContain('cached.snapshot === snapshot');
		expect(scope).toContain('cached.files === files');
		expect(propsExplorerSource).toContain('_filteredProjectionCache');
	});
});
