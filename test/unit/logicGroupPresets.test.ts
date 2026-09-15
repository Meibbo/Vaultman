import { describe, expect, it } from 'vitest';
import {
	buildPresetBuckets,
	namePrefixKey,
	quantileRanges,
	sectionCount,
} from '../../src/logic/logicGroupPresets';
import {
	expandNewGroupHeaders,
	NO_GROUP_ID,
	PRESET_GROUP_PREFIX,
	projectGroupedTree,
} from '../../src/logic/logicTreeGroupProjection';
import {
	diffSceneConfig,
	resolveSceneConfig,
} from '../../src/logic/logicSettingsCascade';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import { normalizeGroupPreset } from '../../src/types/typeGroupPreset';
import type { SceneConfig } from '../../src/types/typeInstance';
import type { TreeNode } from '../../src/types/typeTree';

const labelled = (labels: readonly string[]) =>
	labels.map((label) => ({ id: label, label }));

describe('spec 08 §3.2 — preset `name` (VLC MediaGroup prefix)', () => {
	it('keys by the first 6 code points, case-insensitively', () => {
		expect(namePrefixKey('Hey123.mp4')).toBe('hey123');
		expect(namePrefixKey('HEY1234.mp4')).toBe('hey123');
	});

	it('drops a leading "the " before taking the prefix', () => {
		expect(namePrefixKey('The Wall of Sound')).toBe(
			namePrefixKey('wall of sound'),
		);
	});

	it('a title shorter than the prefix is a singleton (not grouped)', () => {
		expect(namePrefixKey('Hey')).toBeNull();
		expect(namePrefixKey('The abc')).toBeNull();
	});

	it('groups Hey123/Hey1234 together and 123hey apart (VLC doc example)', () => {
		const out = buildPresetBuckets(
			labelled(['Hey123.mp4', 'Hey1234.mp4', '123hey.mp4']),
			{ kind: 'name', direction: 'asc' },
		);
		expect(out?.buckets.map((b) => b.members.map((m) => m.id))).toEqual([
			['123hey.mp4'],
			['Hey123.mp4', 'Hey1234.mp4'],
		]);
		expect(out?.buckets[1]?.label).toBe('Hey123');
	});

	it('is prefix match, not fuzzy: one differing glyph inside the prefix splits', () => {
		const out = buildPresetBuckets(labelled(['Report 2024', 'Repart 2024']), {
			kind: 'name',
			direction: 'asc',
		});
		expect(out?.buckets).toHaveLength(2);
	});

	it('desc reverses the header order and leaves members untouched', () => {
		const asc = buildPresetBuckets(labelled(['banana', 'apple1', 'apple2']), {
			kind: 'name',
			direction: 'asc',
		});
		const desc = buildPresetBuckets(labelled(['banana', 'apple1', 'apple2']), {
			kind: 'name',
			direction: 'desc',
		});
		expect(asc?.buckets.map((b) => b.key)).toEqual([
			'apple1',
			'apple2',
			'banana',
		]);
		expect(desc?.buckets.map((b) => b.key)).toEqual([
			'banana',
			'apple2',
			'apple1',
		]);
	});
});

describe('spec 08 §3.2.1 — range sectioning', () => {
	it('encodes the dev example: 2 nodes → no sections, 10 nodes → 2', () => {
		expect(sectionCount(2)).toBe(0);
		expect(sectionCount(5)).toBe(1);
		expect(sectionCount(10)).toBe(2);
		expect(sectionCount(23)).toBe(3);
		expect(sectionCount(40)).toBe(4);
		expect(sectionCount(90)).toBe(6);
		expect(sectionCount(1000)).toBe(8);
	});

	it('cuts into equal-count sections without splitting equal values', () => {
		expect(quantileRanges([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2)).toEqual([
			{ lo: 1, hi: 5 },
			{ lo: 6, hi: 10 },
		]);
		// Skewed counts stay balanced instead of collapsing into one wide bin.
		expect(quantileRanges([0, 0, 0, 5, 10, 2000], 2)).toEqual([
			{ lo: 0, hi: 0 },
			{ lo: 5, hi: 2000 },
		]);
		// A run of equal values never straddles a boundary.
		expect(quantileRanges([1, 1, 1, 1, 2, 3], 2)).toEqual([
			{ lo: 1, hi: 1 },
			{ lo: 2, hi: 3 },
		]);
	});

	it('does not group a counter preset over too few valued nodes', () => {
		const nodes = labelled(['a', 'b']).map((n, i) => ({ ...n, words: i * 5 }));
		const out = buildPresetBuckets(
			nodes,
			{ kind: 'words', direction: 'asc' },
			{
				extract: (n) => n.words,
			},
		);
		expect(out).toBeNull();
	});

	it('sections ten nodes with max 10 into two nice ranges', () => {
		const nodes = Array.from({ length: 10 }, (_, i) => ({
			id: `n${i}`,
			label: `n${i}`,
			words: i + 1,
		}));
		const out = buildPresetBuckets(
			nodes,
			{ kind: 'words', direction: 'asc' },
			{
				extract: (n) => n.words,
			},
		);
		expect(out?.buckets.map((b) => [b.label, b.members.length])).toEqual([
			['1–5', 5],
			['6–10', 5],
		]);
	});

	it('nodes without a value go to `ungrouped`, never to a range', () => {
		const nodes = Array.from({ length: 12 }, (_, i) => ({
			id: `n${i}`,
			label: `n${i}`,
			words: i < 10 ? i * 10 : null,
		}));
		const out = buildPresetBuckets(
			nodes,
			{ kind: 'words', direction: 'asc' },
			{
				extract: (n) => n.words,
			},
		);
		expect(out?.ungrouped.map((n) => n.id)).toEqual(['n10', 'n11']);
		expect(out?.buckets.flatMap((b) => b.members).length).toBe(10);
	});

	it('dates bucket by days-ago on the day ladder, most recent first on asc', () => {
		const DAY = 86_400_000;
		const now = 1_700_000_000_000;
		const nodes = Array.from({ length: 10 }, (_, i) => ({
			id: `n${i}`,
			label: `n${i}`,
			mtime: now - i * 3 * DAY, // 0..27 days ago
		}));
		const out = buildPresetBuckets(
			nodes,
			{ kind: 'modified', direction: 'asc' },
			{
				extract: (n) => n.mtime,
				now,
			},
		);
		expect(out?.buckets.map((b) => [b.label, b.members.length])).toEqual([
			['Last 13 days', 5],
			['15–27 days ago', 5],
		]);
	});
});

describe('spec 08 §3.2 — projection driven by the preset, not by the sort scope', () => {
	const nodes: TreeNode<null>[] = ['alpha', 'avocado', 'beta', ''].map(
		(label, i) => ({
			id: `${i}:${label}`,
			label,
			depth: 0,
			meta: null,
		}),
	);

	it('`none` returns the list untouched', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'none', direction: 'asc' },
		});
		expect(out).toBe(nodes);
	});

	it('`letter` projects one header per initial and an unnamed node to "no group"', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'letter', direction: 'asc' },
		});
		expect(out.map((n) => n.id)).toEqual([
			`${PRESET_GROUP_PREFIX}A`,
			`${PRESET_GROUP_PREFIX}B`,
			NO_GROUP_ID,
		]);
		expect(out[0]?.children?.map((c) => c.label)).toEqual(['alpha', 'avocado']);
	});

	it('`custom` with no custom groups returns the list untouched', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'custom', direction: 'asc' },
		});
		expect(out).toBe(nodes);
	});
});

describe('spec 08 §1 — groupPreset rides the per-instance cascade', () => {
	const defaults: Required<SceneConfig> = {
		viewMode: 'tree',
		interactionMode: 'open',
		visibleCells: ['name'],
		sortState: normalizeExplorerSortState('files', null),
		stickyRows: true,
		compactFolders: false,
		indent: true,
		groupPreset: { kind: 'none', direction: 'asc' },
		hiddenGroupIds: [],
		sceneLabelMode: 'auto',
		autoRevealMode: 'auto',
		hiddenToolbarNodes: [],
		toolbarNodeIcons: {},
		groupMemberships: {},
	};

	it('defaults to `none` and lets the scene layer override it', () => {
		expect(resolveSceneConfig({ defaults }).groupPreset).toEqual({
			kind: 'none',
			direction: 'asc',
		});
		const resolved = resolveSceneConfig({
			defaults,
			instanceSelf: { groupPreset: { kind: 'letter', direction: 'asc' } },
			scene: { groupPreset: { kind: 'name', direction: 'desc' } },
		});
		expect(resolved.groupPreset).toEqual({ kind: 'name', direction: 'desc' });
	});

	it('the diff only carries the preset when it changed', () => {
		expect(diffSceneConfig(defaults, defaults).groupPreset).toBeUndefined();
		const next = {
			...defaults,
			groupPreset: { kind: 'type' as const, direction: 'asc' as const },
		};
		expect(diffSceneConfig(defaults, next).groupPreset).toEqual({
			kind: 'type',
			direction: 'asc',
		});
	});

	it('normalizes unknown or tab-foreign kinds back to `none`', () => {
		expect(
			normalizeGroupPreset('tags', { kind: 'words', direction: 'asc' }),
		).toEqual({
			kind: 'none',
			direction: 'asc',
		});
		expect(
			normalizeGroupPreset('files', { kind: 'words', direction: 'desc' }),
		).toEqual({
			kind: 'words',
			direction: 'desc',
		});
		expect(normalizeGroupPreset('files', 'letter')).toEqual({
			kind: 'none',
			direction: 'asc',
		});
	});
});

describe('SOTR pass F1 — group headers open on first sight, collapses are respected', () => {
	it('expands a header the first time it appears and never re-opens one the user closed', () => {
		const seen = new Set<string>();
		const expanded = new Set<string>();
		const headers = [
			{ id: `${PRESET_GROUP_PREFIX}A`, label: 'A', depth: 0, meta: null },
			{ id: NO_GROUP_ID, label: 'No group', depth: 0, meta: null },
			{ id: '0:alpha', label: 'alpha', depth: 1, meta: null },
		];
		expandNewGroupHeaders(headers, seen, expanded);
		expect([...expanded]).toEqual([`${PRESET_GROUP_PREFIX}A`, NO_GROUP_ID]);
		// The user collapses A; the next projection must leave it collapsed.
		expanded.delete(`${PRESET_GROUP_PREFIX}A`);
		expandNewGroupHeaders(headers, seen, expanded);
		expect(expanded.has(`${PRESET_GROUP_PREFIX}A`)).toBe(false);
		// A custom group id counts as a header only when declared as such.
		expandNewGroupHeaders([{ id: 'Work', label: 'Work', depth: 0, meta: null }], seen, expanded);
		expect(expanded.has('Work')).toBe(false);
		expandNewGroupHeaders([{ id: 'Work', label: 'Work', depth: 0, meta: null }], seen, expanded, new Set(['Work']));
		expect(expanded.has('Work')).toBe(true);
	});
});

describe('dev 2026-09-14 — a group header bubbles what a folder bubbles', () => {
	const nodes: TreeNode<null>[] = [
		{ id: 'a1', label: 'alpha', depth: 0, meta: null, badges: [{ text: 'q', color: 'accent' }] },
		{ id: 'a2', label: 'avocado', depth: 0, meta: null },
		{ id: 'b1', label: 'beta', depth: 0, meta: null },
	];
	const project = (expandedIds: ReadonlySet<string>, decorateHeader?: (h: TreeNode<null>, m: readonly TreeNode<null>[]) => void) =>
		projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'letter', direction: 'asc' },
			expandedIds,
			decorateHeader,
		});

	it('a collapsed header gets the dot of its descendants\' badges; an expanded one does not', () => {
		const collapsed = project(new Set());
		expect(collapsed[0]?.id).toBe(`${PRESET_GROUP_PREFIX}A`);
		expect(collapsed[0]?.bubbleDot).toBeDefined();
		expect(collapsed[1]?.bubbleDot).toBeUndefined();
		const expanded = project(new Set([`${PRESET_GROUP_PREFIX}A`]));
		expect(expanded[0]?.bubbleDot).toBeUndefined();
	});

	it('hands every header to the scene decorator with its members', () => {
		const seen: [string, number][] = [];
		project(new Set(), (header, members) => {
			seen.push([header.id, members.length]);
			header.fileCountText = String(members.length);
		});
		expect(seen).toEqual([
			[`${PRESET_GROUP_PREFIX}A`, 2],
			[`${PRESET_GROUP_PREFIX}B`, 1],
		]);
	});
});
