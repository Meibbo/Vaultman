import { describe, expect, it } from 'vitest';
import { bridgeAliasesForRule, sameNativeCompatPolicy } from '../../src/logic/logicNativeTreeCompat';
import { mergeTextCaseMaps, resolveTextCase, sameTextCaseMap } from '../../src/logic/logicTextCaseProjection';
import { resolveSceneConfig } from '../../src/logic/logicSettingsCascade';
import type { SceneConfig } from '../../src/types/typeInstance';

const defaults: Required<SceneConfig> = {
	viewMode: 'tree', interactionMode: 'open', visibleCells: ['name'],
	taskCellDisplayMode: 'auto', sortState: { sorts: {}, activeScope: 'all', nodeTypeFilter: null },
	stickyRows: false, compactFolders: false, indent: true, tooltips: true,
	groupPreset: { kind: 'none', direction: 'asc' }, hiddenGroupIds: [],
	sceneLabelMode: 'auto', autoRevealMode: 'auto', hiddenToolbarNodes: [],
	toolbarNodeIcons: {}, toolbarCommandActions: [], createActionsPlacement: 'auto',
	toolbarNodeOrder: [], groupMemberships: {}, showOptionsOverride: 'inherit',
	textCase: {}, nativeCompat: {},
};

describe('native polish host selector and sparse inheritance contracts', () => {
	it('uses the global label default for the Files name alias', () => {
		expect(resolveTextCase('name', { text: 'uppercase' })).toBe('uppercase');
	});

	it('keeps an explicit provided name override when the text alias has a global default', () => {
		const merged = mergeTextCaseMaps({ text: 'uppercase' }, { name: 'provided' });
		expect(resolveTextCase('name', undefined, merged)).toBe('provided');
	});
	it.each(['"file-explorer"', "'file-explorer'", 'file-explorer'])(
		'bridges the actual Files host with attribute form %s', host => {
			const alias = bridgeAliasesForRule(`.workspace-leaf-content[data-type=${host}] .nav-file-title`, 'files');
			expect(alias).toContain('[data-vaultman-native-type="file-explorer"]');
			expect(alias).not.toContain('[data-type="vaultman-frame"]');
			expect(alias).not.toContain(' .nav-files-container ');
		},
	);

	it('preserves commas inside functional selectors rather than splitting their arguments', () => {
		const alias = bridgeAliasesForRule('.workspace-leaf-content[data-type="file-explorer"] :is(.nav-file-title, .nav-folder-title)::before', 'files');
		expect(alias).toContain(':is(.nav-file-title, .nav-folder-title)');
		expect(alias).toContain('::before');
	});

	it('distinguishes an explicit provided override from an absent inherited cell', () => {
		expect(sameTextCaseMap({}, { name: 'provided' })).toBe(false);
	});

	it('distinguishes an explicit compatible override from an absent inherited boundary', () => {
		expect(sameNativeCompatPolicy({}, { tree: 'compatible' })).toBe(false);
	});

	it('preserves unrelated inherited cells and boundaries when a higher layer changes one', () => {
		const result = resolveSceneConfig({
			defaults,
			instanceSelf: { textCase: { name: 'uppercase', ext: 'lowercase' }, nativeCompat: { tree: 'locked', menu: 'locked' } },
			scene: { textCase: { name: 'provided' }, nativeCompat: { tree: 'compatible' } },
		});
		expect(result.textCase).toEqual({ name: 'provided', ext: 'lowercase' });
		expect(result.nativeCompat).toEqual({ tree: 'compatible', menu: 'locked' });
	});
});
