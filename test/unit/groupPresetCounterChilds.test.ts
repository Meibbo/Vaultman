import { describe, expect, it } from 'vitest';
import {
	COUNTER_PRESET_KINDS,
	GROUP_PRESETS_BY_TAB,
	ALL_GROUP_PRESET_KINDS,
	isCounterPresetKind,
	isGroupPresetKind,
	normalizeGroupPreset,
} from '../../src/types/typeGroupPreset';
import { GROUP_PRESET_META, groupMenuModel } from '../../src/logic/logicSortMenu';
import { buildPresetBuckets } from '../../src/logic/logicGroupPresets';
import { bubbledFolderCounterValue } from '../../src/components/containers/explorerFiles';
import type { TreeNode, FileMeta } from '../../src/types/typeTree';

describe('group presets: count (occurrences) and childs (sub-elements)', () => {
	it('registers count and childs as counter preset kinds and in tab preset lists', () => {
		expect(isCounterPresetKind('count')).toBe(true);
		expect(isCounterPresetKind('childs')).toBe(true);
		expect(COUNTER_PRESET_KINDS).toContain('count');
		expect(COUNTER_PRESET_KINDS).toContain('childs');

		expect(isGroupPresetKind('count')).toBe(true);
		expect(isGroupPresetKind('childs')).toBe(true);
		expect(ALL_GROUP_PRESET_KINDS).toContain('count');
		expect(ALL_GROUP_PRESET_KINDS).toContain('childs');

		expect(GROUP_PRESETS_BY_TAB.props).toContain('count');
		expect(GROUP_PRESETS_BY_TAB.props).toContain('childs');
		expect(GROUP_PRESETS_BY_TAB.tags).toContain('count');
		expect(GROUP_PRESETS_BY_TAB.tags).toContain('childs');
		expect(GROUP_PRESETS_BY_TAB.files).toContain('childs');
	});

	it('provides metadata and icons in GROUP_PRESET_META and menus', () => {
		expect(GROUP_PRESET_META.count.icon).toBe('lucide-hash');
		expect(GROUP_PRESET_META.count.labelKey).toBe('group.preset.count');
		expect(GROUP_PRESET_META.childs.icon).toBe('lucide-indent');
		expect(GROUP_PRESET_META.childs.labelKey).toBe('group.preset.childs');

		const propsMenu = groupMenuModel('props', { kind: 'none', direction: 'asc' }, [], false);
		const propPresetIds = propsMenu.items.filter((i) => i.kind === 'preset').map((i) => i.id);
		expect(propPresetIds).toContain('count');
		expect(propPresetIds).toContain('childs');

		const tagsMenu = groupMenuModel('tags', { kind: 'none', direction: 'asc' }, [], false);
		const tagPresetIds = tagsMenu.items.filter((i) => i.kind === 'preset').map((i) => i.id);
		expect(tagPresetIds).toContain('count');
		expect(tagPresetIds).toContain('childs');

		const filesMenu = groupMenuModel('files', { kind: 'none', direction: 'asc' }, [], false);
		const filePresetIds = filesMenu.items.filter((i) => i.kind === 'preset').map((i) => i.id);
		expect(filePresetIds).toContain('childs');
	});

	it('normalizes count and childs presets correctly for props, tags, and files', () => {
		const normPropsCount = normalizeGroupPreset('props', { kind: 'count', direction: 'desc' });
		expect(normPropsCount.kind).toBe('count');
		expect(normPropsCount.direction).toBe('desc');

		const normTagsChilds = normalizeGroupPreset('tags', { kind: 'childs', direction: 'asc' });
		expect(normTagsChilds.kind).toBe('childs');

		const normFilesChilds = normalizeGroupPreset('files', { kind: 'childs', direction: 'desc' });
		expect(normFilesChilds.kind).toBe('childs');
		expect(normFilesChilds.direction).toBe('desc');
	});

	it('partitions nodes into counter ranges with count preset (occurrences)', () => {
		// Create 10 nodes with differing counts (occurrences)
		const nodes = Array.from({ length: 10 }, (_, i) => ({
			id: `prop-${i}`,
			label: `Prop ${i}`,
			count: (i + 1) * 3,
		}));

		const result = buildPresetBuckets(
			nodes,
			{ kind: 'count', direction: 'asc' },
			{
				extract: (node, kind) => (kind === 'count' ? (node.count ?? 0) : null),
			},
		);

		expect(result).not.toBeNull();
		expect(result!.buckets.length).toBeGreaterThanOrEqual(2);
		const totalMembers = result!.buckets.reduce((acc, b) => acc + b.members.length, 0);
		expect(totalMembers).toBe(10);
	});

	it('partitions nodes into counter ranges with childs preset (sub-elements)', () => {
		// Create 12 folder nodes with different child counts
		const nodes = Array.from({ length: 12 }, (_, i) => ({
			id: `folder-${i}`,
			label: `Folder ${i}`,
			childCount: i * 2,
		}));

		const result = buildPresetBuckets(
			nodes,
			{ kind: 'childs', direction: 'asc' },
			{
				extract: (node, kind) => (kind === 'childs' ? (node.childCount ?? 0) : null),
			},
		);

		expect(result).not.toBeNull();
		expect(result!.buckets.length).toBeGreaterThanOrEqual(2);
		const totalMembers = result!.buckets.reduce((acc, b) => acc + b.members.length, 0);
		expect(totalMembers).toBe(12);
	});

	it('extracts folder child count correctly via bubbledFolderCounterValue', () => {
		const folderWithText: TreeNode<FileMeta> = {
			id: 'folder-1',
			label: 'Folder 1',
			depth: 0,
			meta: {
				file: null,
				isFolder: true,
				folderPath: 'folder-1',
			},
			fileCountText: '42',
			children: [],
		};

		const countFromText = bubbledFolderCounterValue(
			folderWithText,
			'childs',
			new Set(),
			false,
		);
		expect(countFromText).toBe(42);

		const folderWithChildren: TreeNode<FileMeta> = {
			id: 'folder-2',
			label: 'Folder 2',
			depth: 0,
			meta: {
				file: null,
				isFolder: true,
				folderPath: 'folder-2',
			},
			children: [
				{
					id: 'c1',
					label: 'Child 1',
					depth: 1,
					meta: { file: null, isFolder: false, folderPath: 'folder-2' },
				},
				{
					id: 'c2',
					label: 'Child 2',
					depth: 1,
					meta: { file: null, isFolder: false, folderPath: 'folder-2' },
				},
				{
					id: 'c3',
					label: 'Child 3',
					depth: 1,
					meta: { file: null, isFolder: false, folderPath: 'folder-2' },
				},
			],
		};

		const countFromChildren = bubbledFolderCounterValue(
			folderWithChildren,
			'childs',
			new Set(),
			false,
		);
		expect(countFromChildren).toBe(3);

		// Non-folders return null
		const fileNode: TreeNode<FileMeta> = {
			id: 'file-1',
			label: 'File 1',
			depth: 0,
			meta: {
				file: null,
				isFolder: false,
				folderPath: '',
			},
		};
		expect(bubbledFolderCounterValue(fileNode, 'childs', new Set(), false)).toBeNull();
	});
});
