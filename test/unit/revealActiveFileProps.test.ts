import { describe, expect, it } from 'vitest';

import {
	projectActiveFileProps,
	REVEAL_FORBIDDEN_REBUILD_SYMBOLS,
} from '../../src/logic/logicRevealActiveFileProps';
import revealSource from '../../src/logic/logicRevealActiveFileProps.ts?raw';

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
