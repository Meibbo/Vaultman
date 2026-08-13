import { describe, expect, it } from 'vitest';

import {
	projectActiveFileTags,
	TAG_REVEAL_FORBIDDEN_REBUILD_SYMBOLS,
} from '../../src/logic/logicRevealActiveFileTags';
import {
	matchesTagSource,
	tagOccurrences,
	tagSourceLabelKey,
	tagSourceRank,
	TAG_SOURCE_ORDER,
	type TagSource,
} from '../../src/logic/logicTagSource';
import { NODE_TYPE_MENU_OPTIONS } from '../../src/logic/logicSortMenu';
import { EXPLORER_CELL_DEFS } from '../../src/logic/logicCellRegistry';
import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

import type { TagMeta, TreeNode } from '../../src/types/typeTree';

function tagNode(
	tagPath: string,
	children: readonly string[] = [],
): TreeNode<TagMeta> {
	const label = tagPath.split('/').at(-1) ?? tagPath;
	return {
		id: tagPath,
		label,
		count: 9,
		depth: tagPath.split('/').length - 1,
		icon: 'lucide-sparkles',
		coreCls: 'tree-item-self tag-pane-tag is-clickable',
		children: children.map((child) => tagNode(`${tagPath}/${child}`)),
		meta: { tagPath },
	};
}

// The vault-wide snapshot: more tags than any one note carries.
const snapshot: TreeNode<TagMeta>[] = [
	tagNode('proyecto', ['casa', 'obra']),
	tagNode('estado'),
	tagNode('leido'),
];

describe('the note writes the order reveal shows', () => {
	// U121-030: the order a note writes its tags in is the note's own answer to
	// "which of these did I put here first". It is the same fact the Props
	// reveal projects from the frontmatter, and the reason `custom` is a sort.
	it('reads the frontmatter first and then the body, by position', () => {
		const nodes = projectActiveFileTags(snapshot, {
			frontmatter: { tags: ['estado', 'proyecto/casa'] },
			tags: [
				{ tag: '#leido', position: { start: { offset: 400 } } },
				{ tag: '#proyecto/obra', position: { start: { offset: 120 } } },
			],
		});
		expect(nodes.map((node) => node.label)).toEqual([
			'estado',
			'proyecto/casa',
			'proyecto/obra',
			'leido',
		]);
	});

	it('keeps the identity the vault-wide index already gave the tag', () => {
		const [node] = projectActiveFileTags(snapshot, {
			frontmatter: { tags: ['proyecto/casa'] },
		});
		expect(node.id).toBe('proyecto/casa');
		// The icon is the projected fact that survives, and with it the color,
		// the badges and everything else keyed off the same node.
		expect(node.icon).toBe('lucide-sparkles');
	});

	it('counts this note, not the vault, and repeats collapse into one row', () => {
		const nodes = projectActiveFileTags(snapshot, {
			frontmatter: { tags: ['estado'] },
			tags: [{ tag: '#estado', position: { start: { offset: 10 } } }],
		});
		expect(nodes).toHaveLength(1);
		expect(nodes[0].count).toBe(2);
		expect([...(nodes[0].meta.tagSources ?? [])].sort()).toEqual([
			'frontmatter',
			'inline',
		]);
	});

	it('projects a tag the index has not caught up with yet', () => {
		const [node] = projectActiveFileTags(snapshot, {
			tags: [{ tag: '#recien-escrito', position: { start: { offset: 3 } } }],
		});
		// Hiding it would make the note look like it does not carry what the
		// user just typed.
		expect(node.label).toBe('recien-escrito');
		expect(node.meta.tagPath).toBe('recien-escrito');
	});

	it('is flat: a revealed note holds whole paths, not a hierarchy', () => {
		const [node] = projectActiveFileTags(snapshot, {
			frontmatter: { tags: ['proyecto/casa'] },
		});
		// Drawing `proyecto` as a row would claim an occurrence the note does
		// not have.
		expect(node.children).toEqual([]);
		expect(node.depth).toBe(0);
		expect(node.showCaret).toBe(false);
	});

	it('shows nothing rather than the vault when there is no note', () => {
		expect(projectActiveFileTags(snapshot, null)).toEqual([]);
		expect(projectActiveFileTags(snapshot, {})).toEqual([]);
	});

	it('never rebuilds the index on the toggle path', () => {
		const toggle = tagsExplorerSource.slice(
			tagsExplorerSource.indexOf('toggleRevealActiveFile('),
			tagsExplorerSource.indexOf('private _sourceIndex('),
		);
		expect(toggle).not.toBe('');
		for (const symbol of TAG_REVEAL_FORBIDDEN_REBUILD_SYMBOLS) {
			expect(toggle).not.toContain(symbol);
		}
	});

	it('narrows the projection once, before anything else consumes it', () => {
		expect(tagsExplorerSource).toContain(
			'this._scopeProjection(this.logic.getTree())',
		);
	});

	it('holds the same exclusive slot the Props reveal holds', () => {
		const idle = filtersPageSource.slice(
			filtersPageSource.indexOf('idleNode:'),
			filtersPageSource.indexOf('moveMode:'),
		);
		expect(idle).toContain('tags.reveal-this-file');
		expect(filtersPageSource).toContain(
			'tagsExplorer?.toggleRevealActiveFile()',
		);
	});
});

describe('inline and frontmatter are the other half of a tag type', () => {
	it('reads both places a tag can be written', () => {
		const occurrences = tagOccurrences({
			frontmatter: { tags: 'casa, obra' },
			tags: [{ tag: '#leido', position: { start: { offset: 5 } } }],
		});
		expect(occurrences).toEqual([
			{ tagPath: 'casa', source: 'frontmatter', order: 0 },
			{ tagPath: 'obra', source: 'frontmatter', order: 1 },
			{ tagPath: 'leido', source: 'inline', order: 2 },
		]);
	});

	it('treats the two sources as membership, not as one bucket', () => {
		const both = new Set<TagSource>(['inline', 'frontmatter']);
		expect(matchesTagSource(both, ['inline'])).toBe(true);
		expect(matchesTagSource(both, ['frontmatter'])).toBe(true);
		expect(matchesTagSource(new Set<TagSource>(['inline']), ['frontmatter'])).toBe(
			false,
		);
		// No selection is no filter, which is what an empty type menu means.
		expect(matchesTagSource(undefined, [])).toBe(true);
	});

	it('ranks a both-places tag with the first group it belongs to', () => {
		expect(tagSourceRank(new Set<TagSource>(['inline', 'frontmatter']))).toBe(
			tagSourceRank(new Set<TagSource>(['frontmatter'])),
		);
		expect(tagSourceRank(new Set<TagSource>(['inline']))).toBeGreaterThan(
			tagSourceRank(new Set<TagSource>(['frontmatter'])),
		);
		// A tag the index has no answer for sorts after every one it does.
		expect(tagSourceRank(undefined)).toBe(TAG_SOURCE_ORDER.length);
	});

	it('says both when the tag is written in both places', () => {
		expect(tagSourceLabelKey(new Set<TagSource>(['inline']))).toBe(
			'tags.source.inline',
		);
		expect(
			tagSourceLabelKey(new Set<TagSource>(['inline', 'frontmatter'])),
		).toBe('tags.source.both');
		expect(tagSourceLabelKey(new Set())).toBeUndefined();
	});

	it('offers them under By type, below the divider that ends the shapes', () => {
		const options = NODE_TYPE_MENU_OPTIONS.tags;
		const ids = options.map((option) => option.id);
		expect(ids).toEqual(['all', 'nested', 'simple', 'frontmatter', 'inline']);
		// Shape and source are separate questions; the divider is what says so.
		const simple = options.find((option) => option.id === 'simple');
		expect(simple?.separatorAfter).toBe(true);
	});

	it('intersects the shape group with the source group', () => {
		const filter = tagsExplorerSource.slice(
			tagsExplorerSource.indexOf('private _filterByNodeTypes('),
			tagsExplorerSource.indexOf('private _nestedEnabled('),
		);
		// Applied to the already-narrowed shape projection, not to the original
		// nodes: picking `nested` and `inline` asks for the tags that are both.
		expect(filter).toContain('this._filterBySource(structured, sources)');
	});

	it('puts the answer in the view menu as the type cell', () => {
		const typeCell = EXPLORER_CELL_DEFS.find((cell) => cell.id === 'type');
		const tags = typeCell?.supports.find(
			(support) => support.explorer === 'tags',
		);
		expect(tags).toBeDefined();
		expect(tags?.defaultOn).toBe(false);
		expect(tags?.labelKey).toBe('viewmode.pill.tag_type');
		expect(typeCell?.sortId).toBe('type');
		// The tag cards draw no value cells, so the switch is only offered
		// where it changes something.
		expect(tags?.viewModes).toEqual(['tree', 'table']);
	});

	it('sorts by shape first and lets the source break the tie', () => {
		const compare = tagsExplorerSource.slice(
			tagsExplorerSource.indexOf("if (normalizedSortBy === 'type')"),
			tagsExplorerSource.indexOf('private _applySort('),
		);
		expect(compare).toContain('tagStructureRank(a) - tagStructureRank(b)');
		expect(compare).toContain('tagSourceRank(this._sourcesFor(a))');
	});

	it('localizes both the filter entries and the cell', () => {
		for (const key of [
			'sort.type.inline',
			'sort.type.frontmatter',
			'viewmode.pill.tag_type',
			'tags.source.inline',
			'tags.source.both',
		]) {
			expect(en[key], key).toBeTruthy();
			expect(es[key], key).toBeTruthy();
		}
		// `frontmatter` is the same word in both languages; the entries that
		// wrap it in a sentence are not.
		expect(es['sort.type.frontmatter']).not.toBe(en['sort.type.frontmatter']);
		expect(es['sort.type.inline']).not.toBe(en['sort.type.inline']);
		expect(es['viewmode.pill.tag_type']).not.toBe(en['viewmode.pill.tag_type']);
	});
});
