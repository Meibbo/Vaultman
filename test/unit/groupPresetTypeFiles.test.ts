import { describe, expect, it } from 'vitest';
import { buildPresetBuckets } from '../../src/logic/logicGroupPresets';
import { groupMenuModel } from '../../src/logic/logicSortMenu';
import { compareExplorerText } from '../../src/logic/logicSort';

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
