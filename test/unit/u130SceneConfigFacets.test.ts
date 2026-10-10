import { describe, expect, it } from 'vitest';
import {
	diffSceneConfig,
	normalizeSceneConfig,
	resolveSceneConfig,
} from '../../src/logic/logicSettingsCascade';
import {
	applyLayoutToPort,
	captureSavedViewConfig,
	createSceneConfigPort,
	sceneFacetsOf,
} from '../../src/logic/logicSceneConfigPort';
import { EMPTY_REGISTRY, ensureInstance } from '../../src/logic/logicInstanceRegistry';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import {
	mergeTextCaseMaps,
	resolveTextCase,
} from '../../src/logic/logicTextCaseProjection';
import {
	resolveNativeCompatMode,
	resolveNativeCompatPolicy,
} from '../../src/logic/logicNativeTreeCompat';
import {
	scopePartitionPresentation,
	togglePartitionPresentation,
} from '../../src/logic/logicPartitionNaming';
import type { SceneConfig } from '../../src/types/typeInstance';
import type { SavedViewConfig } from '../../src/types/typeSettings';

const defaults: Required<SceneConfig> = {
	viewMode: 'tree',
	interactionMode: 'open',
	visibleCells: ['text'],
	taskCellDisplayMode: 'auto',
	sortState: normalizeExplorerSortState('files', null),
	stickyRows: true,
	compactFolders: false,
	indent: true,
	groupPreset: { kind: 'none', direction: 'asc' },
	hiddenGroupIds: [],
	sceneLabelMode: 'auto',
	autoRevealMode: 'auto',
	hiddenToolbarNodes: [],
	toolbarNodeIcons: {}, toolbarNodeLabels: {},
	toolbarCommandActions: [],
	createActionsPlacement: 'auto',
	tooltips: true,
	toolbarNodeOrder: [],
	groupMemberships: {},
	showOptionsOverride: 'inherit' as const,
	textCase: {},
	nativeCompat: {},
};

describe('U130 native polish: scene text-case and compat facets', () => {
	it('resolves sparse maps through per-entry inheritance', () => {
		const resolved = resolveSceneConfig({
			defaults,
			global: { textCase: { text: 'uppercase' } },
			scene: { nativeCompat: { tree: 'locked' } },
		});
		expect(resolved.textCase).toEqual({ text: 'uppercase' });
		expect(resolved.nativeCompat).toEqual({ tree: 'locked' });
		// Declaring the map replaces it whole, like visibleCells.
		const overridden = resolveSceneConfig({
			defaults,
			global: { textCase: { text: 'uppercase' } },
			scene: { textCase: { name: 'lowercase' } },
		});
		expect(overridden.textCase).toEqual({ name: 'lowercase', text: 'uppercase' });
	});

	it('diffs the new facets minimally', () => {
		expect(
			diffSceneConfig(defaults, {
				...defaults,
				textCase: { text: 'titlecase' },
			}),
		).toEqual({ textCase: { text: 'titlecase' } });
		expect(
			diffSceneConfig(defaults, {
				...defaults,
				nativeCompat: { menu: 'locked' },
			}),
		).toEqual({ nativeCompat: { menu: 'locked' } });
		expect(diffSceneConfig(defaults, { ...defaults })).toEqual({});
	});

	it('normalizes raw persisted layers defensively', () => {
		expect(normalizeSceneConfig(null)).toEqual({});
		expect(normalizeSceneConfig({ textCase: { text: 'uppercase', bad: 'nope' } }).textCase).toEqual({
			text: 'uppercase',
		});
		expect(
			normalizeSceneConfig({ nativeCompat: { tree: 'locked', isolated: 'x' } }).nativeCompat,
		).toEqual({ tree: 'locked' });
		const preset = normalizeSceneConfig(
			{
				groupPreset: {
					kind: 'words',
					direction: 'asc',
					partitionPresentation: 'name-only',
					counterRanges: [{ id: 'r1', lo: 0, hi: 5, displayName: 'Tiny' }],
				},
			},
			'files',
		).groupPreset;
		expect(preset?.partitionPresentation).toBe('name-only');
		expect(preset?.counterRanges?.[0]).toEqual({ id: 'r1', lo: 0, hi: 5, displayName: 'Tiny' });
	});

	it('merges global and scene case with scene winning per cell', () => {
		expect(mergeTextCaseMaps({ text: 'uppercase' }, { text: 'lowercase' })).toEqual({
			text: 'lowercase',
		});
		const provided = mergeTextCaseMaps({ text: 'uppercase' }, { text: 'provided' });
		expect(provided).toEqual({ text: 'provided' });
		expect(resolveTextCase('name', undefined, provided)).toBe('provided');
		expect(resolveTextCase('text', { text: 'uppercase' }, {})).toBe('uppercase');
	});

	it('resolves the effective compat policy per boundary', () => {
		const policy = resolveNativeCompatPolicy({ tree: 'locked' }, { menu: 'locked' });
		expect(policy).toEqual({
			tree: 'locked',
			toolbar: 'compatible',
			container: 'compatible',
			menu: 'locked',
		});
		expect(resolveNativeCompatMode('tree')).toBe('compatible');
	});

	it('round-trips facets through layout photos, preserving legacy photos', async () => {
		const configured: Required<SceneConfig> = {
			...defaults,
			textCase: { text: 'titlecase' },
			nativeCompat: { tree: 'locked' },
			groupPreset: {
				kind: 'words',
				direction: 'asc',
				partitionPresentation: 'name-only',
				counterRanges: [{ id: 'r1', lo: 0, hi: 5, displayName: 'Tiny' }],
			},
		};
		const photo = captureSavedViewConfig(configured);
		expect(photo.textCase).toEqual({ text: 'titlecase' });
		expect(photo.nativeCompat).toEqual({ tree: 'locked' });
		expect(photo.groupPreset?.partitionPresentation).toBe('name-only');
		expect(photo.groupPreset?.counterRanges?.[0]?.displayName).toBe('Tiny');

		let registry = ensureInstance(EMPTY_REGISTRY, 'inst-1').registry;
		const port = createSceneConfigPort({
			instanceId: 'inst-1',
			readRegistry: () => registry,
			writeRegistry: (next) => {
				registry = next;
			},
			persist: async () => {},
			defaultsFor: () => defaults,
		});
		await applyLayoutToPort(port, {
			viewModeByTab: {},
			interactionModeByTab: {},
			visibleCellsByTab: {},
			sortStateByTab: {},
			sceneFacetsByTab: {
				files: { ...sceneFacetsOf(photo), groupPreset: photo.groupPreset },
			},
		});
		const restored = port.read('files');
		expect(restored.textCase).toEqual({ text: 'titlecase' });
		expect(restored.nativeCompat).toEqual({ tree: 'locked' });
		expect(restored.groupPreset.partitionPresentation).toBe('name-only');

		// A legacy photo without the new keys leaves live values alone.
		const legacy = { ...photo } as SavedViewConfig;
		delete legacy.textCase;
		delete legacy.nativeCompat;
		await port.propose('files', {
			...restored,
			textCase: { text: 'uppercase' },
			nativeCompat: { menu: 'locked' },
		});
		await applyLayoutToPort(port, {
			viewModeByTab: {},
			interactionModeByTab: {},
			visibleCellsByTab: {},
			sortStateByTab: {},
			sceneFacetsByTab: { files: sceneFacetsOf(legacy) },
		});
		const kept = port.read('files');
		expect(kept.textCase).toEqual({ text: 'uppercase' });
		expect(kept.nativeCompat).toEqual({ menu: 'locked' });
	});

	it('flips partition presentation without touching bounds or names', () => {
		expect(togglePartitionPresentation(undefined)).toBe('name-only');
		expect(togglePartitionPresentation('name-only')).toBe('name-range');
		const sortState = normalizeExplorerSortState('files', null);
		expect(scopePartitionPresentation(sortState, { kind: 'none', direction: 'asc' }, 'all')).toBe(
			'name-range',
		);
	});
});
