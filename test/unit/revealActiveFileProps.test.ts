import { describe, expect, it } from 'vitest';

import {
	projectActiveFileProps,
	REVEAL_FORBIDDEN_REBUILD_SYMBOLS,
} from '../../src/logic/logicRevealActiveFileProps';
import revealSource from '../../src/logic/logicRevealActiveFileProps.ts?raw';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

import type { PropMeta } from '../../src/types/typeTree';
import type { TreeNode } from '../../src/types/typeTree';

function propNode(
	propName: string,
	propType: string,
	values: readonly string[],
): TreeNode<PropMeta> {
	return {
		id: propName,
		label: propName,
		count: values.length,
		depth: 0,
		coreCls: 'tree-item-self tappable is-clickable',
		children: values.map((rawValue) => ({
			id: `${propName}::${rawValue}`,
			label: rawValue === '' ? 'empty' : rawValue,
			count: 1,
			depth: 1,
			coreCls: 'tree-item-self tappable is-clickable',
			children: [],
			meta: {
				propName,
				propType,
				isValueNode: true,
				rawValue,
			},
		})),
		meta: { propName, propType, isValueNode: false },
	};
}

// The vault-wide snapshot: three properties, more values than any one file has.
const snapshot: TreeNode<PropMeta>[] = [
	propNode('lugar', 'text', ['cocina', 'salon', 'patio']),
	propNode('peso', 'number', ['42', '7']),
	propNode('tags', 'tags', ['casa', 'obra']),
];

describe('reveal projects the active file over the vault-wide index', () => {
	it('returns only the properties the file carries, in frontmatter key order', () => {
		const nodes = projectActiveFileProps(snapshot, {
			tags: ['casa'],
			lugar: 'cocina',
		});
		expect(nodes.map((node) => node.id)).toEqual(['tags', 'lugar']);
	});

	it('keeps node identity so selection and expansion survive the toggle', () => {
		const nodes = projectActiveFileProps(snapshot, { lugar: 'cocina' });
		expect(nodes[0].id).toBe('lugar');
		expect(nodes[0].children?.map((child) => child.id)).toEqual([
			'lugar::cocina',
		]);
		// The same IDs the vault-wide projection uses.
		const vaultWide = snapshot.find((node) => node.id === 'lugar');
		expect(
			vaultWide?.children?.some((child) => child.id === 'lugar::cocina'),
		).toBe(true);
	});

	it('narrows a property to the values this file actually holds', () => {
		const nodes = projectActiveFileProps(snapshot, { lugar: ['cocina', 'patio'] });
		expect(nodes[0].children?.map((child) => child.label)).toEqual([
			'cocina',
			'patio',
		]);
	});

	it('keeps the metadata the vault-wide node carried', () => {
		const nodes = projectActiveFileProps(snapshot, { peso: 42 });
		expect(nodes[0].meta.propType).toBe('number');
		expect(nodes[0].children?.[0].meta.isValueNode).toBe(true);
		expect(nodes[0].children?.[0].meta.propName).toBe('peso');
	});

	it('projects a value the index has not seen rather than dropping it', () => {
		// The metadata cache can lag a just-typed value. Dropping it would make
		// the file look like it does not have what the user just wrote.
		const nodes = projectActiveFileProps(snapshot, { lugar: 'terraza' });
		expect(nodes[0].children?.map((child) => child.id)).toEqual([
			'lugar::terraza',
		]);
		expect(nodes[0].children?.[0].meta.propType).toBe('text');
	});

	it('projects a property the index has not seen with its own node', () => {
		const nodes = projectActiveFileProps(snapshot, { nuevo: 'x' });
		expect(nodes.map((node) => node.id)).toEqual(['nuevo']);
		expect(nodes[0].children?.map((child) => child.id)).toEqual(['nuevo::x']);
	});

	it('returns the canonical empty state with no active file', () => {
		expect(projectActiveFileProps(snapshot, null)).toEqual([]);
	});

	it('returns the canonical empty state for a file with no frontmatter', () => {
		// Never the vault-wide set: falling back would show properties the file
		// does not have while claiming to show the file.
		expect(projectActiveFileProps(snapshot, {})).toEqual([]);
	});

	it('ignores the position key Obsidian injects', () => {
		const nodes = projectActiveFileProps(snapshot, {
			position: { start: {}, end: {} },
			lugar: 'cocina',
		});
		expect(nodes.map((node) => node.id)).toEqual(['lugar']);
	});

	it('never rebuilds the vault-wide index', () => {
		// The cost contract is a statement about ownership: the index keeps its
		// own lifecycle and the toggle is a filter over it. The forbidden names
		// are declared in the module, so the guard reads the code after that
		// declaration rather than matching the declaration itself.
		expect(REVEAL_FORBIDDEN_REBUILD_SYMBOLS.length).toBeGreaterThan(0);
		const code = revealSource.slice(
			revealSource.indexOf('const NOT_A_PROPERTY'),
		);
		expect(code).not.toBe('');
		for (const symbol of REVEAL_FORBIDDEN_REBUILD_SYMBOLS) {
			expect(code).not.toContain(symbol);
		}
		expect(code).not.toContain('app.vault');
		expect(code).not.toContain('metadataCache');
	});
});

describe('the reveal toggle owns the exclusive slot', () => {
	it('is state on the explorer, not a second panel', () => {
		expect(propsExplorerSource).toContain('toggleRevealActiveFile(');
		expect(propsExplorerSource).toContain('isRevealingActiveFile(');
		expect(propsExplorerSource).toContain('projectActiveFileProps');
	});

	it('follows the active file through the watcher that already exists', () => {
		// observeActiveContentFile already handles open, rename and delete, so
		// reveal does not add a second watcher with its own idea of "active".
		expect(propsExplorerSource).toContain('observeActiveContentFile');
	});

	it('keeps the toggle path free of vault-wide rebuild calls', () => {
		const toggle = propsExplorerSource.slice(
			propsExplorerSource.indexOf('toggleRevealActiveFile('),
			propsExplorerSource.indexOf('private _revealFrontmatter('),
		);
		expect(toggle).not.toBe('');
		for (const symbol of REVEAL_FORBIDDEN_REBUILD_SYMBOLS) {
			expect(toggle).not.toContain(symbol);
		}
	});

	it('takes the slot between search and collapse, and yields it to the move mode', () => {
		const idle = filtersPageSource.slice(
			filtersPageSource.indexOf('idleNode:'),
			filtersPageSource.indexOf('moveMode:'),
		);
		expect(idle).toContain('props.reveal-this-file');
		expect(idle).toContain('PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER');
		// resolveExclusiveSlotNodes is what makes the exclusion structural: the
		// move mode's controls replace this node rather than sitting beside it.
		expect(filtersPageSource).toContain('resolveExclusiveSlotNodes');
	});

	it('narrows the projection once, before anything else consumes it', () => {
		// Search, filters, sort and every engine read the same narrowed tree
		// rather than each deciding for itself what reveal means.
		expect(propsExplorerSource).toContain(
			'this._revealProjection(this.logic.getTree())',
		);
	});

	it('records that the capability resolver still has no caller', () => {
		// `reveal` is part of CellCapabilityContext and the resolver withdraws
		// the vault-wide count for it, but `resolveCellCapabilities` is not
		// called from anywhere in src yet — shard 04 landed it without a caller,
		// like the interaction port of shard 05. Until it has one, no live Cell
		// list is narrowed by reveal. This guard fails once that changes, which
		// is the moment to wire reveal into the real resolution.
		expect(propsExplorerSource).not.toContain('resolveCellCapabilities');
	});

	it('localizes the toggle', () => {
		for (const key of [
			'explorer.ctx.reveal_this_file',
			'explorer.ctx.reveal_this_file.empty',
		] as const) {
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
			expect(es[key]).not.toBe(en[key]);
		}
	});
});
