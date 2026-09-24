import { describe, expect, it } from 'vitest';
import { buildPresetBuckets } from '../../src/logic/logicGroupPresets';
import { groupMenuModel } from '../../src/logic/logicSortMenu';
import { compareExplorerText } from '../../src/logic/logicSort';
import {
	bubbledFolderCounterValue,
	fileCounterPropertyValue,
} from '../../src/components/containers/explorerFiles';
import type { FileMeta, TreeNode } from '../../src/types/typeTree';

interface FileLike {
	label: string;
	/** Mirrors `TFile.extension`; `null` stands for a folder (`meta.file === null`). */
	extension: string | null;
}

/**
 * A08 — the `type` group preset in fileScene.
 * The scene extractor is `file.extension || null`
 * (`explorerFiles.ts::_groupPresetValue`, `case 'type'`) and the sibling
 * sort is `ext` (`node.meta.file?.extension ?? ''` + `compareExplorerText`).
 */
const sceneTypeOf = (node: FileLike): string | number | null =>
	node.extension || null;

const sceneExtKey = (node: FileLike): string => node.extension ?? '';

function extRuns(nodes: readonly FileLike[]): string[][] {
	const sorted = [...nodes].sort((a, b) =>
		compareExplorerText(sceneExtKey(a), sceneExtKey(b)),
	);
	const runs: string[][] = [];
	let lastKey: string | null = null;
	for (const node of sorted) {
		const key = sceneExtKey(node);
		if (lastKey !== null && compareExplorerText(lastKey, key) === 0) {
			runs[runs.length - 1].push(node.label);
		} else {
			runs.push([node.label]);
			lastKey = key;
		}
	}
	return runs.map((run) => [...run].sort());
}

const NODES: FileLike[] = [
	{ label: 'a.md', extension: 'md' },
	{ label: 'b.md', extension: 'md' },
	{ label: 'c.ts', extension: 'ts' },
	{ label: 'd.css', extension: 'css' },
	{ label: 'README', extension: '' },
	{ label: 'docs', extension: null },
];

describe('A08 — `type` is exposed in the files groups submenu', () => {
	it('the groups submenu for tab `files` enumerates `type`', () => {
		const model = groupMenuModel(
			'files',
			{ kind: 'none', direction: 'asc' },
			[],
			false,
		);
		const presets = model.items
			.filter((item) => item.kind === 'preset')
			.map((item) => item.id);
		expect(presets).toContain('type');
	});
});

describe('A08 — grouping by `type` partitions like sorting by `extensions`', () => {
	it('bucket member sets equal the `ext` sort runs', () => {
		const resolved = buildPresetBuckets(
			NODES,
			{ kind: 'type', direction: 'asc' },
			{ extract: sceneTypeOf },
		);
		expect(resolved).not.toBeNull();
		const partitions = [
			...(resolved?.buckets.map((bucket) =>
				bucket.members.map((member) => member.label).sort(),
			) ?? []),
			[...(resolved?.ungrouped.map((node) => node.label).sort() ?? [])],
		]
			.filter((part) => part.length > 0)
			.map((part) => part.join('|'))
			.sort();
		const runs = extRuns(NODES).map((run) => run.join('|')).sort();
		expect(partitions).toEqual(runs);
	});
});

describe('U130 — counter presets consume folder cell_bubbling', () => {
	const folder = (patch: Partial<TreeNode<FileMeta>>): TreeNode<FileMeta> => ({
		id: 'docs',
		label: 'docs',
		depth: 0,
		meta: { file: null, folder: null, isFolder: true, folderPath: 'docs' },
		...patch,
	});

	it('reads words, remaining tasks and props from the bubbled folder cells', () => {
		expect(
			bubbledFolderCounterValue(
				folder({ wordCountText: '240' }),
				'words',
				new Set(['words']),
				true,
			),
		).toBe(240);
		expect(
			bubbledFolderCounterValue(
				folder({ tasksText: '3/10' }),
				'tasks',
				new Set(['tasks']),
				true,
			),
		).toBe(7);
		expect(
			bubbledFolderCounterValue(
				folder({ tasksText: '3/10', taskPendingCount: 7 }),
				'tasks',
				new Set(),
				true,
			),
		).toBe(7);
		expect(
			bubbledFolderCounterValue(
				folder({ wordCountText: '1.2k', wordCountValue: 1200 }),
				'words',
				new Set(),
				true,
			),
		).toBe(1200);
		expect(
			bubbledFolderCounterValue(
				folder({ count: 12 }),
				'props',
				new Set(['count']),
				true,
			),
		).toBe(12);
	});

	it('returns zero for an enabled empty bubbled cell and null when bubbling is off', () => {
		expect(
			bubbledFolderCounterValue(
				folder({}),
				'words',
				new Set(['words']),
				true,
			),
		).toBe(0);
		expect(
			bubbledFolderCounterValue(
				folder({ wordCountText: '240' }),
				'words',
				new Set(['words']),
				false,
			),
		).toBeNull();
	});
});

describe('U130-GGC-021 · Counter Properties nullable extractor & No group routing', () => {
	it('fileCounterPropertyValue treats non-Markdown files as null (incompatible) and Markdown files with 0 as compatible zero', () => {
		expect(fileCounterPropertyValue(null, 0)).toBeNull();
		expect(fileCounterPropertyValue(undefined, 5)).toBeNull();
		expect(fileCounterPropertyValue({ extension: null }, 0)).toBeNull();
		expect(fileCounterPropertyValue({ extension: '' }, 0)).toBeNull();

		// Non-Markdown files (.pdf, .png, .ts, etc.) are incompatible regardless of raw propCount
		expect(fileCounterPropertyValue({ extension: 'pdf' }, 0)).toBeNull();
		expect(fileCounterPropertyValue({ extension: 'pdf' }, 4)).toBeNull();
		expect(fileCounterPropertyValue({ extension: 'png' }, 0)).toBeNull();
		expect(fileCounterPropertyValue({ extension: 'ts' }, 3)).toBeNull();

		// Markdown files (.md, .markdown) preserve real zero and positive property counts
		expect(fileCounterPropertyValue({ extension: 'md' }, 0)).toBe(0);
		expect(fileCounterPropertyValue({ extension: 'md' }, 5)).toBe(5);
		expect(fileCounterPropertyValue({ extension: 'MD' }, 0)).toBe(0);
		expect(fileCounterPropertyValue({ extension: 'MD' }, 3)).toBe(3);
		expect(fileCounterPropertyValue({ extension: 'markdown' }, 0)).toBe(0);
		expect(fileCounterPropertyValue({ extension: 'MARKDOWN' }, 12)).toBe(12);
	});

	it('routes incompatible non-Markdown files and non-bubbled folders to No group, while keeping 0-property Markdown files in ranges', () => {
		interface TestNode {
			id: string;
			label: string;
			file?: { extension: string | null } | null;
			isFolder?: boolean;
			propCount?: number;
			folderBubbling?: boolean;
			bubbledCount?: number;
		}

		const extractProps = (node: TestNode): number | null => {
			if (node.isFolder) {
				return node.folderBubbling ? (node.bubbledCount ?? 0) : null;
			}
			return fileCounterPropertyValue(node.file, node.propCount ?? 0);
		};

		const nodes: TestNode[] = [
			{ id: '1', label: 'zero-props.md', file: { extension: 'md' }, propCount: 0 },
			{ id: '2', label: 'some-props.md', file: { extension: 'md' }, propCount: 3 },
			{ id: '3', label: 'many-props.markdown', file: { extension: 'markdown' }, propCount: 12 },
			{ id: '4', label: 'document.pdf', file: { extension: 'pdf' }, propCount: 0 },
			{ id: '5', label: 'diagram.png', file: { extension: 'png' }, propCount: 0 },
			{ id: '6', label: 'bubbled-folder', isFolder: true, folderBubbling: true, bubbledCount: 4 },
			{ id: '7', label: 'unbubbled-folder', isFolder: true, folderBubbling: false },
		];

		const explicitRanges = [
			{ id: 'r0', lo: 0, hi: 5 },
			{ id: 'r1', lo: 6, hi: 20 },
		];

		const result = buildPresetBuckets(
			nodes,
			{ kind: 'props', direction: 'asc', counterRanges: explicitRanges },
			{ extract: extractProps },
		);

		expect(result).not.toBeNull();
		const r0 = result!.buckets.find((b) => b.key === 'r0');
		const r1 = result!.buckets.find((b) => b.key === 'r1');

		// r0 [0-5] must contain zero-props.md (0), some-props.md (3), and bubbled-folder (4)
		const r0Labels = r0?.members.map((m) => m.label).sort();
		expect(r0Labels).toEqual(['bubbled-folder', 'some-props.md', 'zero-props.md']);

		// r1 [6-20] must contain many-props.markdown (12)
		const r1Labels = r1?.members.map((m) => m.label);
		expect(r1Labels).toEqual(['many-props.markdown']);

		// ungrouped ("No group") must strictly contain incompatible non-markdown files and unbubbled folders
		const ungroupedLabels = result!.ungrouped.map((m) => m.label).sort();
		expect(ungroupedLabels).toEqual(['diagram.png', 'document.pdf', 'unbubbled-folder']);
	});
});
