import { describe, expect, it, vi } from 'vitest';
import {
	encodeNoteGroupComponent,
	decodeNoteGroupComponent,
	encodeNoteGroupKey,
	parseNoteGroupKey,
	parseFrontmatterNoteGroups,
	detectCollisions,
	writeNoteGroups,
	updateNoteGroupMembersOnRename,
	isSameTarget,
	stablyDeduplicateMembers,
	scopeToNoteGroupTarget,
	type NoteGroupTarget,
} from '../../src/logic/logicNoteGroups';
import {
	isGroupHeader,
	NO_GROUP_ID,
	projectGroupedTree,
} from '../../src/logic/logicTreeGroupProjection';
import { groupMenuModel } from '../../src/logic/logicSortMenu';
import {
	GROUP_PRESETS_BY_TAB,
	normalizeGroupPreset,
} from '../../src/types/typeGroupPreset';
import type { TreeNode } from '../../src/types/typeTree';
import type { SavedViewConfig } from '../../src/types/typeSettings';
import { captureSavedViewConfig } from '../../src/logic/logicSceneConfigPort';
import { TFile, type App } from 'obsidian';
import { parseYaml, stringifyYaml } from '../helpers/yaml';

function createTestApp(files: { path: string; frontmatter?: Record<string, unknown> }[]) {
	const metaMap = new Map<string, Record<string, unknown>>();
	for (const f of files) {
		metaMap.set(f.path, { ...(f.frontmatter ?? {}) });
	}

	const app = {
		vault: {
			getFileByPath: (path: string) => {
				const found = files.find((f) => f.path === path);
				if (!found) return null;
				const file = new TFile();
				file.path = found.path;
				file.name = found.path.split('/').pop() ?? '';
				file.basename = file.name.replace(/\.md$/, '');
				return file;
			},
			getMarkdownFiles: () =>
				files.map((f) => {
					const file = new TFile();
					file.path = f.path;
					return file;
				}),
		},
		metadataCache: {
			getFileCache: (file: TFile) => {
				const fm = metaMap.get(file.path);
				return fm ? { frontmatter: fm } : null;
			},
		},
		fileManager: {
			processFrontMatter: vi.fn().mockImplementation(
				async (file: TFile, fn: (fm: Record<string, unknown>) => void) => {
					const cur = metaMap.get(file.path) ?? {};
					const next = { ...cur };
					fn(next);
					metaMap.set(file.path, next);
				},
			),
		},
	} as unknown as App;

	return { app, metaMap };
}

const createNode = (id: string, label: string, meta?: any): TreeNode<any> => ({
	id,
	label,
	depth: 0,
	meta: meta ?? { propName: label, isValueNode: false },
});

describe('U130-09 Note Groups: Codec round trips, malformed keys, and collisions', () => {
	it('encodes and decodes canonical UTF-8 components with %5F and %25', () => {
		expect(encodeNoteGroupComponent('Simple')).toBe('Simple');
		expect(encodeNoteGroupComponent('My_Group')).toBe('My%5FGroup');
		expect(encodeNoteGroupComponent('100%_Done')).toBe('100%25%5FDone');
		expect(encodeNoteGroupComponent('Group:Sub/Target')).toBe('Group%3ASub%2FTarget');
		expect(encodeNoteGroupComponent('Español y acentos: árbol')).toBe(
			'Espa%C3%B1ol%20y%20acentos%3A%20%C3%A1rbol',
		);

		// Decoding canonical components
		expect(decodeNoteGroupComponent('Simple')).toBe('Simple');
		expect(decodeNoteGroupComponent('My%5FGroup')).toBe('My_Group');
		expect(decodeNoteGroupComponent('100%25%5FDone')).toBe('100%_Done');
		expect(decodeNoteGroupComponent('Espa%C3%B1ol%20y%20acentos%3A%20%C3%A1rbol')).toBe(
			'Español y acentos: árbol',
		);
	});

	it('round-trips level targets and parent targets for prop and tag scenes', () => {
		const propLevelTarget: NoteGroupTarget = { kind: 'level', level: 1 };
		const propKey = encodeNoteGroupKey('prop', 'My_Group', propLevelTarget);
		expect(propKey).toBe('prop_My%5FGroup_level1');
		expect(parseNoteGroupKey(propKey)).toEqual({
			scene: 'prop',
			group: 'My_Group',
			target: propLevelTarget,
		});

		const tagLevelTarget: NoteGroupTarget = { kind: 'level', level: 2 };
		const tagKey = encodeNoteGroupKey('tag', 'Dev', tagLevelTarget);
		expect(tagKey).toBe('tag_Dev_level2');
		expect(parseNoteGroupKey(tagKey)).toEqual({
			scene: 'tag',
			group: 'Dev',
			target: tagLevelTarget,
		});

		const propParentTarget: NoteGroupTarget = {
			kind: 'parent',
			path: 'parent:objective',
		};
		const propParentKey = encodeNoteGroupKey('prop', 'A_B', propParentTarget);
		// Colon remains literal; '_' in group is %5F
		expect(propParentKey).toBe('prop_A%5FB_parent:objective');
		expect(parseNoteGroupKey(propParentKey)).toEqual({
			scene: 'prop',
			group: 'A_B',
			target: propParentTarget,
		});

		const tagParentTarget: NoteGroupTarget = {
			kind: 'parent',
			path: 'parent/objective',
		};
		const tagParentKey = encodeNoteGroupKey('tag', 'Work', tagParentTarget);
		// Slash remains literal
		expect(tagParentKey).toBe('tag_Work_parent/objective');
		expect(parseNoteGroupKey(tagParentKey)).toEqual({
			scene: 'tag',
			group: 'Work',
			target: tagParentTarget,
		});
	});

	it('resolves the active drill scope to its parent target', () => {
		expect(scopeToNoteGroupTarget('drill', 'status')).toEqual({
			kind: 'parent',
			path: 'status',
		});
		expect(scopeToNoteGroupTarget('drill', null)).toBeNull();
		expect(scopeToNoteGroupTarget('level:2')).toEqual({ kind: 'level', level: 2 });
		expect(scopeToNoteGroupTarget('level:1.5')).toBeNull();
	});

	it('rejects malformed keys as unmanaged (returns null)', () => {
		// Unencoded '_' in group or target component
		expect(parseNoteGroupKey('prop_A_B_level1')).toBeNull();
		// Lowercase hex in percent encoding
		expect(parseNoteGroupKey('prop_A%5fb_level1')).toBeNull();
		// Invalid percent escapes
		expect(parseNoteGroupKey('prop_A%ZZ_level1')).toBeNull();
		// Bad scene prefix
		expect(parseNoteGroupKey('file_A_level1')).toBeNull();
		expect(parseNoteGroupKey('notes_A_level1')).toBeNull();
		// Missing target or group
		expect(parseNoteGroupKey('prop__level1')).toBeNull();
		expect(parseNoteGroupKey('prop_A_')).toBeNull();
		expect(parseNoteGroupKey('prop_A')).toBeNull();
		// Leading zero in level number
		expect(parseNoteGroupKey('prop_A_level01')).toBeNull();
		// Negative level
		expect(parseNoteGroupKey('prop_A_level-1')).toBeNull();
		// Empty segment in parent target
		expect(parseNoteGroupKey('prop_A_parent:')).toBeNull();
		expect(parseNoteGroupKey('tag_A_parent//child')).toBeNull();
	});

	it('detects reserved namespace collisions on matching keys with non-list values', () => {
		const fm = {
			title: 'Unrelated String',
			tags: ['not', 'collision'],
			prop_Work_level1: 'this is a string, not a list', // Collision
			prop_Valid_level1: ['propA', 'propB'], // Valid list
			tag_Dev_level2: 12345, // Collision
			tag_Valid_level2: ['tag1'], // Valid list
			prop_Other_parent: true, // Collision
		};

		const propRes = parseFrontmatterNoteGroups(fm, 'prop', { kind: 'level', level: 1 });
		expect(propRes.groups.map((g) => g.id)).toEqual(['Valid']);
		expect(propRes.memberships['Valid']).toEqual(['propA', 'propB']);
		expect(propRes.collisions).toHaveLength(1);
		expect(propRes.collisions[0].key).toBe('prop_Work_level1');
		expect(propRes.collisions[0].value).toBe('this is a string, not a list');

		const tagCollisions = detectCollisions(fm, 'tag', { kind: 'level', level: 2 });
		expect(tagCollisions).toHaveLength(1);
		expect(tagCollisions[0].key).toBe('tag_Dev_level2');
	});
});

describe('U130-09 Note Groups: Stable duplicate and No-group projection', () => {
	it('stably deduplicates members inside the same list on projection and edit', () => {
		const raw = ['b', 'a', 'b', 'c', 'a', 'd'];
		const deduped = stablyDeduplicateMembers(raw);
		expect(deduped).toEqual(['b', 'a', 'c', 'd']);

		const nodes = [
			createNode('n1', 'b'),
			createNode('n2', 'a'),
			createNode('n3', 'c'),
		];
		const projected = projectGroupedTree({
			nodes,
			groups: [{ id: 'G1', flavor: 'note', label: 'G1', parentId: null, scope: 'level:1' }],
			memberships: { G1: ['b', 'a', 'b', 'c', 'a'] },
			providerId: 'props',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'note', direction: 'asc' },
			sortByNote: true,
		});

		const g1 = projected.find((g) => g.id === 'G1');
		expect(g1?.children?.map((c) => c.label)).toEqual(['b', 'a', 'c']);
		// Each child appears only once under G1
		expect(g1?.children).toHaveLength(3);
	});

	it('supports S-26 stable multi-group row identity and single occurrence unsuffixed', () => {
		const nodes = [
			createNode('propA', 'propA'),
			createNode('propB', 'propB'),
			createNode('propC', 'propC'),
		];
		const projected = projectGroupedTree({
			nodes,
			groups: [
				{ id: 'Group1', flavor: 'note', label: 'Group1', parentId: null, scope: 'level:1' },
				{ id: 'Group2', flavor: 'note', label: 'Group2', parentId: null, scope: 'level:1' },
			],
			memberships: {
				Group1: ['propA', 'propB'],
				Group2: ['propB', 'propC'],
			},
			providerId: 'props',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'note', direction: 'asc' },
			sortByNote: true,
		});

		const g1 = projected.find((g) => g.id === 'Group1');
		const g2 = projected.find((g) => g.id === 'Group2');

		// propB appears in both groups -> suffixed row IDs
		const g1PropB = g1?.children?.find((c) => c.label === 'propB');
		const g2PropB = g2?.children?.find((c) => c.label === 'propB');
		expect(g1PropB?.id).toBe('propB@Group1');
		expect(g2PropB?.id).toBe('propB@Group2');

		// propA and propC appear in only one group -> exact unsuffixed ID
		const g1PropA = g1?.children?.find((c) => c.label === 'propA');
		const g2PropC = g2?.children?.find((c) => c.label === 'propC');
		expect(g1PropA?.id).toBe('propA');
		expect(g2PropC?.id).toBe('propC');
	});

	it('projects No-group as the visible complement at the end', () => {
		const nodes = [
			createNode('p1', 'alpha'),
			createNode('p2', 'beta'),
			createNode('p3', 'gamma'),
			createNode('p4', 'delta'),
		];
		const projected = projectGroupedTree({
			nodes,
			groups: [
				{ id: 'Work', flavor: 'note', label: 'Work', parentId: null, scope: 'level:1' },
			],
			memberships: { Work: ['alpha', 'beta'] },
			providerId: 'props',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'note', direction: 'asc' },
		});

		expect(projected).toHaveLength(2);
		expect(projected[0].id).toBe('Work');
		expect(projected[1].id).toBe(NO_GROUP_ID);
		expect(projected[1].label).toBe('No group');
		expect(projected[1].children?.map((c) => c.id)).toEqual(['p3', 'p4']);
		expect(isGroupHeader(NO_GROUP_ID)).toBe(true);
	});
});

describe('U130-09 Note Groups: Pinned vs Current reveal source', () => {
	it('resolves source and destination note: pinned anchor outranks current file', () => {
		const pinnedFile = 'notes/pinned-project.md';
		const activeFile = 'notes/current-draft.md';

		function resolveEffectiveNote(sortState: {
			revealAnchor?: string;
			revealAnchorPath?: string | null;
		}, currentPath: string | null): string | null {
			if (sortState.revealAnchor === 'pinned') {
				return sortState.revealAnchorPath ?? null;
			}
			return currentPath;
		}

		// When pinned
		expect(
			resolveEffectiveNote(
				{ revealAnchor: 'pinned', revealAnchorPath: pinnedFile },
				activeFile,
			),
		).toBe(pinnedFile);

		// When current-file
		expect(
			resolveEffectiveNote(
				{ revealAnchor: 'current-file', revealAnchorPath: pinnedFile },
				activeFile,
			),
		).toBe(activeFile);
	});
});

describe('U130-09 Note Groups: Reveal-only menu and separate sort Note', () => {
	it('only offers Note groups preset when reveal is active on props or tags', () => {
		// Outside reveal: note does not appear
		const propsNormal = groupMenuModel('props', { kind: 'none', direction: 'asc' }, [], true, false);
		expect(propsNormal.items.map((i) => i.id)).not.toContain('note');
		expect(propsNormal.items.filter((i) => i.kind === 'preset').map((i) => i.id)).toEqual(
			GROUP_PRESETS_BY_TAB.props,
		);

		const tagsNormal = groupMenuModel('tags', { kind: 'none', direction: 'asc' }, [], true, false);
		expect(tagsNormal.items.map((i) => i.id)).not.toContain('note');

		// In reveal mode: note is offered for props and tags
		const propsReveal = groupMenuModel('props', { kind: 'none', direction: 'asc' }, [], true, true);
		expect(propsReveal.items.map((i) => i.id)).toContain('note');
		const noteItem = propsReveal.items.find((i) => i.id === 'note');
		expect(noteItem?.kind).toBe('preset');
		if (noteItem && noteItem.kind === 'preset') {
			expect(noteItem.labelKey).toBe('group.preset.note');
		}

		const tagsReveal = groupMenuModel('tags', { kind: 'none', direction: 'asc' }, [], true, true);
		expect(tagsReveal.items.map((i) => i.id)).toContain('note');

		// Files, snippets, plugins never offer Note groups even if revealActive is true
		for (const tab of ['files', 'snippets', 'plugins'] as const) {
			const model = groupMenuModel(tab, { kind: 'none', direction: 'asc' }, [], true, true);
			expect(model.items.map((i) => i.id)).not.toContain('note');
		}
	});

	it('keeps group preset Note distinct from existing sort option sort.by.note', () => {
		// Normalizes note preset on props/tags
		expect(normalizeGroupPreset('props', { kind: 'note', direction: 'asc' }, true)).toEqual({
			kind: 'note',
			direction: 'asc',
		});
		// A persisted note preset is rejected when reveal is not active; the
		// frontmatter source is undefined outside the reveal projection.
		expect(normalizeGroupPreset('props', { kind: 'note', direction: 'asc' }, false)).toEqual({
			kind: 'none',
			direction: 'asc',
		});
		expect(normalizeGroupPreset('tags', { kind: 'note', direction: 'asc' })).toEqual({
			kind: 'none',
			direction: 'asc',
		});
		// Rejects note preset on files
		expect(normalizeGroupPreset('files', { kind: 'note', direction: 'asc' }, true)).toEqual({
			kind: 'none',
			direction: 'asc',
		});

		// Sort option Note orders group members according to frontmatter list order
		const nodes = [
			createNode('p1', 'zebra'),
			createNode('p2', 'apple'),
			createNode('p3', 'mango'),
		];
		// Frontmatter list order: mango, zebra, apple
		const projectedByNote = projectGroupedTree({
			nodes,
			groups: [{ id: 'G', flavor: 'note', label: 'G', parentId: null, scope: 'level:1' }],
			memberships: { G: ['mango', 'zebra', 'apple'] },
			providerId: 'props',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'note', direction: 'asc' },
			sortByNote: true,
		});
		expect(projectedByNote[0].children?.map((c) => c.label)).toEqual([
			'mango',
			'zebra',
			'apple',
		]);

		// When sort is NOT Note (e.g. alphabetical 'name' sort): retains nodes order
		const projectedByName = projectGroupedTree({
			nodes: [createNode('p2', 'apple'), createNode('p3', 'mango'), createNode('p1', 'zebra')],
			groups: [{ id: 'G', flavor: 'note', label: 'G', parentId: null, scope: 'level:1' }],
			memberships: { G: ['mango', 'zebra', 'apple'] },
			providerId: 'props',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'note', direction: 'asc' },
			sortByNote: false,
		});
		expect(projectedByName[0].children?.map((c) => c.label)).toEqual([
			'apple',
			'mango',
			'zebra',
		]);
	});
});

describe('U130-09 Note Groups: Custom-vs-note target exclusivity', () => {
	it('enforces exclusivity per target while allowing coexistence across different targets', () => {
		// Given target level:1 and target parent:status
		const targetLevel1: NoteGroupTarget = { kind: 'level', level: 1 };
		const targetParentStatus: NoteGroupTarget = { kind: 'parent', path: 'status' };

		expect(isSameTarget(targetLevel1, targetParentStatus)).toBe(false);

		// Layout captures only activation of preset, never note members/definitions
		const saved: SavedViewConfig = captureSavedViewConfig({
			viewMode: 'tree',
			visibleCells: ['name'],
			interactionMode: 'filter',
			sortState: {
				sorts: {},
				activeScope: 'all',
				nodeTypeFilter: null,
			},
			groupPreset: { kind: 'note', direction: 'asc' },
			groupMemberships: { CustomGroup: ['props:prop:test|test'] },
			hiddenGroupIds: [],
			stickyRows: true,
			compactFolders: false,
			indent: true,
		} as any);

		// Preset activation is captured
		expect(saved.groupPreset).toEqual({ kind: 'note', direction: 'asc' });
		// Custom groups remain in scene memberships, but note groups definitions live in note frontmatter
		expect(saved.groupMemberships?.['CustomGroup']).toEqual(['props:prop:test|test']);
	});
});

describe('U130-09 Note Groups: processFrontMatter preservation, error handling, and re-read', () => {
	it('preserves unrelated frontmatter fields during write and verifies re-read', async () => {
		const initialFm = {
			title: 'Important Note',
			author: 'Alice',
			tags: ['work', 'project'],
			custom_meta: { unmanaged: true },
			prop_OldGroup_level1: ['oldMember'],
			tag_Dev_level2: ['otherTargetTag'],
		};

		const { app } = createTestApp([{ path: 'test.md', frontmatter: initialFm }]);
		const file = app.vault.getFileByPath('test.md')!;

		const result = await writeNoteGroups({
			app,
			file,
			scene: 'prop',
			target: { kind: 'level', level: 1 },
			groups: [
				{ name: 'Priority', members: ['status', 'urgency', 'status'] }, // has duplicates to deduplicate
				{ name: 'Workflow', members: ['stage'] },
			],
		});

		expect(result.ok).toBe(true);

		// Verify written frontmatter
		const updatedFm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		// Unrelated fields preserved
		expect(updatedFm.title).toBe('Important Note');
		expect(updatedFm.author).toBe('Alice');
		expect(updatedFm.tags).toEqual(['work', 'project']);
		expect(updatedFm.custom_meta).toEqual({ unmanaged: true });
		expect(updatedFm.tag_Dev_level2).toEqual(['otherTargetTag']);

		// Old group for this target removed
		expect(updatedFm.prop_OldGroup_level1).toBeUndefined();

		// New groups written with stable deduplication
		expect(updatedFm['prop_Priority_level1']).toEqual(['status', 'urgency']);
		expect(updatedFm['prop_Workflow_level1']).toEqual(['stage']);
	});

	it('fails closed and offers retry when processFrontMatter throws or re-read diverges', async () => {
		const { app } = createTestApp([{ path: 'error.md', frontmatter: { title: 'Test' } }]);
		const file = app.vault.getFileByPath('error.md')!;

		// Simulate processFrontMatter error
		app.fileManager.processFrontMatter = vi.fn().mockRejectedValue(new Error('Disk I/O error'));

		const result = await writeNoteGroups({
			app,
			file,
			scene: 'prop',
			target: { kind: 'level', level: 1 },
			groups: [{ name: 'Test', members: ['a'] }],
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain('Disk I/O error');
		expect(typeof result.retry).toBe('function');
	});

	it('fails closed when writing to a key with existing collision', async () => {
		const { app } = createTestApp([
			{
				path: 'collision.md',
				frontmatter: {
					prop_Blocked_level1: 'string value collision',
				},
			},
		]);
		const file = app.vault.getFileByPath('collision.md')!;

		const result = await writeNoteGroups({
			app,
			file,
			scene: 'prop',
			target: { kind: 'level', level: 1 },
			groups: [{ name: 'Blocked', members: ['a', 'b'] }],
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain('collision');
		// Must not overwrite
		expect(app.metadataCache.getFileCache(file)?.frontmatter?.prop_Blocked_level1).toBe(
			'string value collision',
		);
	});

	it('re-checks a collision inside processFrontMatter against a stale cache', async () => {
		const { app, metaMap } = createTestApp([{ path: 'race.md', frontmatter: {} }]);
		const file = app.vault.getFileByPath('race.md')!;
		app.fileManager.processFrontMatter = vi.fn().mockImplementation(
			async (target: TFile, fn: (fm: Record<string, unknown>) => void) => {
				// A concurrent editor wins after the metadata cache was read.
				const latest = { ...(metaMap.get(target.path) ?? {}), prop_Race_level1: 'late collision' };
				fn(latest);
				metaMap.set(target.path, latest);
			},
		);

		const result = await writeNoteGroups({
			app,
			file,
			scene: 'prop',
			target: { kind: 'level', level: 1 },
			groups: [{ name: 'Race', members: ['a'] }],
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain('collision');
		expect(metaMap.get('race.md')?.prop_Race_level1).toBe('late collision');
	});

	it('updates note group list members and parent target keys on property/value/tag rename', () => {
		const fm: Record<string, unknown> = {
			prop_Work_level1: ['status', 'priority'],
			prop_Values_status: ['in-progress', 'done'],
			tag_Todo_level1: ['#bug', 'feature'],
		};

		// Rename property 'status' -> 'workflowStatus'
		const propChanged = updateNoteGroupMembersOnRename(fm, 'prop', 'status', 'workflowStatus');
		expect(propChanged).toBe(true);
		// Member updated in level 1 group
		expect(fm['prop_Work_level1']).toEqual(['workflowStatus', 'priority']);
		// Parent target key renamed
		expect(fm['prop_Values_status']).toBeUndefined();
		expect(fm['prop_Values_workflowStatus']).toEqual(['in-progress', 'done']);

		// Rename value 'in-progress' -> 'ongoing' under 'workflowStatus'
		const valChanged = updateNoteGroupMembersOnRename(
			fm,
			'prop',
			'in-progress',
			'ongoing',
			{ kind: 'parent', path: 'workflowStatus' },
		);
		expect(valChanged).toBe(true);
		expect(fm['prop_Values_workflowStatus']).toEqual(['ongoing', 'done']);

		// Rename tag 'bug' -> 'issue'
		const tagChanged = updateNoteGroupMembersOnRename(fm, 'tag', 'bug', 'issue');
		expect(tagChanged).toBe(true);
		expect(fm['tag_Todo_level1']).toEqual(['#issue', 'feature']);
	});

	it('Section 4: physical order test with processFrontMatter roundtrip', async () => {
		const { app, metaMap } = createTestApp([
			{
				path: 'ordered.md',
				frontmatter: {
					prop_GroupA_level1: ['p1', 'p2'],
					prop_GroupB_level1: ['p3', 'p4'],
				},
			},
		]);
		const file = app.vault.getFileByPath('ordered.md')!;
		// Exercise the same ordered-map boundary as Obsidian's YAML frontmatter
		// writer rather than relying on an object mutation alone.  The helper
		// uses the real YAML parser/stringifier used by the test Obsidian mocks.
		app.fileManager.processFrontMatter = vi.fn().mockImplementation(
			async (target: TFile, fn: (fm: Record<string, unknown>) => void) => {
				const current = metaMap.get(target.path) ?? {};
				const parsed = parseYaml(stringifyYaml(current)) as Record<string, unknown>;
				fn(parsed);
				const persisted = parseYaml(stringifyYaml(parsed)) as Record<string, unknown>;
				metaMap.set(target.path, persisted);
			},
		);

		// Edit GroupB members
		const res = await writeNoteGroups({
			app,
			file,
			scene: 'prop',
			target: { kind: 'level', level: 1 },
			groups: [
				{ name: 'GroupA', members: ['p1', 'p2'] },
				{ name: 'GroupB', members: ['p4', 'p3'] },
			],
		});

		expect(res.ok).toBe(true);
		const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const keys = Object.keys(fm);
		expect(keys).toEqual(['prop_GroupA_level1', 'prop_GroupB_level1']);
		expect(fm['prop_GroupB_level1']).toEqual(['p4', 'p3']);
	});
});
