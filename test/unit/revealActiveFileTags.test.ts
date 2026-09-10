import { describe, expect, it } from 'vitest';

import {
	nestProjectedTagNodes,
	projectActiveFileTags,
	TAG_REVEAL_FORBIDDEN_REBUILD_SYMBOLS,
} from '../../src/logic/logicRevealActiveFileTags';
import {
	firstTagOccurrence,
	matchesTagSource,
	orderedTagOccurrences,
	tagOccurrenceRange,
	tagOccurrences,
	tagSourceLabelKey,
	tagSourceRank,
	TAG_SOURCE_ORDER,
	visibleTagSources,
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
	// reveal projects from the frontmatter, and the reason `note` is a sort.
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
			tags: [{ tag: '#leido', position: { start: { offset: 500 } } }],
			frontmatterPosition: { start: { offset: 0 }, end: { offset: 120 } },
		});
		expect(occurrences).toEqual([
			{ tagPath: 'casa', source: 'frontmatter', order: 0 },
			{ tagPath: 'obra', source: 'frontmatter', order: 1 },
			{ tagPath: 'leido', source: 'inline', order: 2, offset: 500 },
		]);
	});

	it('does not count a frontmatter tag twice through the cache tags array', () => {
		// Obsidian lists frontmatter tags in `tags` too, positioned inside
		// the frontmatter block. Without the range guard the note read
		// `both` (and a count of two) for a tag written in one place.
		const occurrences = tagOccurrences({
			frontmatter: { tags: ['estado'] },
			tags: [{ tag: '#estado', position: { start: { offset: 30 } } }],
			frontmatterPosition: { start: { offset: 0 }, end: { offset: 120 } },
		});
		expect(occurrences).toEqual([
			{ tagPath: 'estado', source: 'frontmatter', order: 0, offset: 30 },
		]);
	});

	it('keeps a tag genuinely written in both places as two occurrences', () => {
		const occurrences = tagOccurrences({
			frontmatter: { tags: ['mixto'] },
			tags: [
				{ tag: '#mixto', position: { start: { offset: 30 } } },
				{ tag: '#mixto', position: { start: { offset: 900 } } },
			],
			frontmatterPosition: { start: { offset: 0 }, end: { offset: 120 } },
		});
		expect(occurrences).toEqual([
			{ tagPath: 'mixto', source: 'frontmatter', order: 0, offset: 30 },
			{ tagPath: 'mixto', source: 'inline', order: 1, offset: 900 },
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

	it('selects a direct occurrence before a structural descendant', () => {
		const occurrences = [
			{ tagPath: 'casa/cocina', source: 'inline' as const, order: 0, offset: 10 },
			{ tagPath: 'casa', source: 'inline' as const, order: 1, offset: 20 },
			{ tagPath: 'casa', source: 'frontmatter' as const, order: 2 },
		];
		expect(firstTagOccurrence(occurrences, 'casa')?.offset).toBe(20);
		expect(
			firstTagOccurrence(occurrences, 'casa', ['frontmatter'])?.source,
		).toBe('frontmatter');
	});

	it('cycles every matching occurrence in note order and reverses for asc', () => {
		const occurrences = [
			{ tagPath: 'estado', source: 'inline' as const, order: 0, offset: 10 },
			{ tagPath: 'estado', source: 'inline' as const, order: 1, offset: 40 },
			{ tagPath: 'otro', source: 'inline' as const, order: 2, offset: 50 },
		];
		expect(
			orderedTagOccurrences(occurrences, 'estado', 'desc').map(
				(occurrence) => occurrence.offset,
			),
		).toEqual([10, 40]);
		expect(
			orderedTagOccurrences(occurrences, 'estado', 'asc').map(
				(occurrence) => occurrence.offset,
			),
		).toEqual([40, 10]);
	});

	it('uses child occurrences for a nested parent without a start fallback', () => {
		const occurrences = [
			{ tagPath: 'parent/one', source: 'inline' as const, order: 0, offset: 12 },
			{ tagPath: 'parent/two', source: 'inline' as const, order: 1, offset: 40 },
		];
		expect(
			orderedTagOccurrences(occurrences, 'parent', 'desc').map(
				(occurrence) => occurrence.tagPath,
			),
		).toEqual(['parent/one', 'parent/two']);
	});

	it('locates an unpositioned frontmatter occurrence in the document', () => {
		const content = '---\ntags: [casa, obra]\n---\n#casa';
		const occurrence = {
			tagPath: 'obra',
			source: 'frontmatter' as const,
			order: 1,
		};
		expect(
			tagOccurrenceRange(occurrence, content, {
				frontmatterStartOffset: 0,
				frontmatterEndOffset: content.indexOf('---', 4),
				occurrenceIndex: 0,
			}),
		).toEqual([content.indexOf('obra'), content.indexOf('obra') + 4]);
	});

	it('labels only the source still visible under a source filter', () => {
		const both = new Set<TagSource>(['frontmatter', 'inline']);
		expect(visibleTagSources(both, ['inline'])).toEqual(new Set(['inline']));
		expect(visibleTagSources(both, [])).toBe(both);
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

describe('nestProjectedTagNodes regroups the reveal plane when nested is on', () => {
	function flatNode(
		tagPath: string,
		source: TagSource,
		count = 1,
	): TreeNode<TagMeta> {
		return {
			id: tagPath,
			label: tagPath,
			count,
			depth: 0,
			showCaret: false,
			children: [],
			coreCls: 'tree-item-self tag-pane-tag is-clickable',
			meta: { tagPath, tagSources: new Set<TagSource>([source]) },
		};
	}

	it('nests full paths under structural parents with leaf labels', () => {
		const nested = nestProjectedTagNodes(
			[flatNode('casa/cocina', 'inline'), flatNode('simple', 'frontmatter')],
			[],
		);
		expect(nested.map((node) => node.meta.tagPath)).toEqual([
			'casa',
			'simple',
		]);
		const casa = nested[0];
		expect(casa.label).toBe('casa');
		expect(casa.depth).toBe(0);
		expect(casa.showCaret).toBe(true);
		expect(casa.children?.map((child) => child.label)).toEqual(['cocina']);
		expect(casa.children?.[0].depth).toBe(1);
		expect(casa.children?.[0].showCaret).toBe(false);
		// Structural parents claim no occurrence of their own: the count is
		// the note-occurrences below, the sources their union.
		expect(casa.count).toBe(1);
		expect(casa.meta.tagSources).toEqual(new Set(['inline']));
	});

	it('reuses snapshot parents and folds a written parent with its children', () => {
		const snapshotParent: TreeNode<TagMeta> = {
			id: 'casa',
			label: 'casa',
			count: 0,
			depth: 0,
			icon: 'lucide-home',
			coreCls: 'tree-item-self tag-pane-tag is-clickable',
			children: [],
			meta: { tagPath: 'casa' },
		};
		const nested = nestProjectedTagNodes(
			[
				{ ...flatNode('casa', 'frontmatter', 2), icon: 'lucide-home' },
				flatNode('casa/cocina', 'inline'),
			],
			[snapshotParent],
		);
		expect(nested).toHaveLength(1);
		const casa = nested[0];
		expect(casa.icon).toBe('lucide-home');
		expect(casa.showCaret).toBe(true);
		expect(casa.children).toHaveLength(1);
		// Own occurrences (2) survive on top of the descendant's (1).
		expect(casa.count).toBe(3);
		expect(casa.meta.tagSources).toEqual(
			new Set(['frontmatter', 'inline']),
		);
	});
});

describe('the tags scene honors the filtered switch outside reveal', () => {
	it('routes a filtered non-reveal scene through _filteredProjection', () => {
		const scope = tagsExplorerSource.slice(
			tagsExplorerSource.indexOf('private _scopeProjection('),
			tagsExplorerSource.indexOf('private _filteredProjectionCache'),
		);
		expect(scope).toContain('if (!this.revealActiveFile) {');
		expect(scope).toContain('if (this.sortState?.filtered === true) {');
		expect(scope).toContain('return this._filteredProjection(snapshot);');
	});
});

describe('reveal click navigates like a text node', () => {
	it('jumps to the tag occurrence instead of expanding in reveal+open', () => {
		const handler = tagsExplorerSource.slice(
			tagsExplorerSource.indexOf("if (action === 'expand') {"),
			tagsExplorerSource.indexOf("if (action === 'select') {"),
		);
		expect(handler).toContain('if (this.revealActiveFile) {');
		expect(handler).toContain('void this._revealTagAt(node.meta.tagPath);');
		expect(tagsExplorerSource).toContain('private async _revealTagAt(');
		expect(tagsExplorerSource).toContain(
			"import { openFileAtOffset } from '../../utils/openFileAtOffset';",
		);
		expect(tagsExplorerSource).toContain('match: { content, range }');
		expect(tagsExplorerSource).not.toContain('occurrence?.offset ?? 0');
	});

	it('shares the open-at-offset mechanism with the content matches', () => {
		expect(filtersPageSource).toContain(
			'await openFileAtOffset(plugin.app, file, offset);',
		);
	});
});
