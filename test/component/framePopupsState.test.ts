import { describe, expect, it, vi } from 'vitest';
import {
	FRAME_POPUPS_KEY,
	FramePopupsState,
} from '../../src/components/frame/framePopups.svelte';
import type { FrameOverlayController } from '../../src/components/frame/frameOverlays.svelte';
import type { ActiveFilterRule } from '../../src/components/frame/frameActiveFilters';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

const folderSuggestClose = vi.fn();

vi.mock('../../src/utils/autocomplete', () => ({
	FolderSuggest: vi.fn().mockImplementation(function (_app, _input, cb) {
		return {
		close: folderSuggestClose,
		select(path: string) {
			cb(path);
		},
		};
	}),
}));

function makeOverlaysMock() {
	return {
		activePopup: null,
		popupOpen: false,
		isIslandOpen: false,
		closePopup: vi.fn(),
		closeQueueIsland: vi.fn(),
		closeFiltersIsland: vi.fn(),
	} as unknown as FrameOverlayController & {
		closePopup: ReturnType<typeof vi.fn>;
	};
}

function makePopups(opts: { onStatsDirty?: () => void } = {}) {
	const plugin = makeMockPlugin();
	const overlays = makeOverlaysMock();
	const onStatsDirty = opts.onStatsDirty ?? vi.fn();
	const popups = new FramePopupsState(plugin, overlays, onStatsDirty);
	return { popups, plugin, overlays, onStatsDirty };
}

describe('FramePopupsState — context key', () => {
	it('exports FRAME_POPUPS_KEY as a Symbol', () => {
		expect(typeof FRAME_POPUPS_KEY).toBe('symbol');
		expect(String(FRAME_POPUPS_KEY)).toContain('frame.popups');
	});
});

describe('FramePopupsState — scope popup', () => {
	it('scopeOptions is frozen and exposes the three operation scopes', () => {
		const { popups } = makePopups();
		expect(popups.scopeOptions.map((option) => option.value)).toEqual([
			'auto',
			'filtered',
			'selected',
		]);
		expect(() => {
			(popups.scopeOptions as Array<{ value: string }>)[0].value = 'mutated';
		}).toThrow();
	});

	it('setScope normalizes settings, saves, and closes popup', () => {
		const { popups, plugin, overlays } = makePopups();
		popups.setScope('selected');
		expect(plugin.settings.explorerOperationScope).toBe('selected');
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
		expect(overlays.closePopup).toHaveBeenCalledTimes(1);
	});

	it('setFiltersOperationScope saves without closing popup', () => {
		const { popups, plugin, overlays } = makePopups();
		popups.setFiltersOperationScope('filtered');
		expect(plugin.settings.explorerOperationScope).toBe('filtered');
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
		expect(overlays.closePopup).not.toHaveBeenCalled();
	});
});

describe('FramePopupsState — active filters popup', () => {
	it('refreshActiveFiltersPopup reads active rules from filterService', () => {
		const { popups, plugin } = makePopups();
		plugin.filterService.activeFilter = {
			type: 'group',
			op: 'and',
			children: [
				{ type: 'rule', id: 'r1', filterType: 'has_property', property: 'tags' } as never,
			],
		};
		popups.refreshActiveFiltersPopup();
		expect(popups.activeFilterRules).toHaveLength(1);
		expect(popups.activeFilterRules[0].description).toBe('has: tags');
	});

	it('toggleFilterRule toggles truthy ids and refreshes', () => {
		const { popups, plugin } = makePopups();
		plugin.filterService.activeFilter = {
			type: 'group',
			op: 'and',
			children: [
				{ type: 'rule', id: 'r1', filterType: 'has_property', property: 'tags' } as never,
			],
		};
		popups.refreshActiveFiltersPopup();
		popups.toggleFilterRule(popups.activeFilterRules[0]);
		expect(plugin.filterService.toggleFilterRule).toHaveBeenCalledWith('r1');
		expect(popups.activeFilterRules).toHaveLength(1);
	});

	it('toggleFilterRule is a refresh-only no-op for missing rule ids', () => {
		const { popups, plugin } = makePopups();
		const rule = {
			id: 'rule-0',
			description: '',
			node: { type: 'rule', filterType: 'has_property' },
			parent: { type: 'group', op: 'and', children: [] },
			enabled: true,
		} as ActiveFilterRule;
		popups.toggleFilterRule(rule);
		expect(plugin.filterService.toggleFilterRule).not.toHaveBeenCalled();
	});

	it('deleteFilterRule removes node, refreshes, and fires onStatsDirty', () => {
		const { popups, plugin, onStatsDirty } = makePopups();
		const rule = {
			id: 'rule-0',
			description: '',
			node: { type: 'rule', id: 'r1', filterType: 'has_property' },
			parent: { type: 'group', op: 'and', children: [] },
			enabled: true,
		} as ActiveFilterRule;
		popups.deleteFilterRule(rule);
		expect(plugin.filterService.removeNode).toHaveBeenCalledWith(rule.node, rule.parent);
		expect(onStatsDirty).toHaveBeenCalledTimes(1);
	});
});

describe('FramePopupsState — search popup', () => {
	it('searchName and searchFolder are writable', () => {
		const { popups } = makePopups();
		popups.searchName = 'draft';
		popups.searchFolder = 'Projects';
		expect(popups.searchName).toBe('draft');
		expect(popups.searchFolder).toBe('Projects');
	});
});

describe('FramePopupsState — move popup', () => {
	it('moveTargetFiles and moveTargetFolder drive movePreviews', () => {
		const { popups } = makePopups();
		popups.moveTargetFiles = [
			{ path: 'docs/a.md', name: 'a.md' },
			{ path: 'docs/b.md', name: 'b.md' },
		] as never;
		popups.moveTargetFolder = 'archive';
		expect(popups.movePreviews).toEqual([
			{ oldPath: 'docs/a.md', newPath: 'archive/a.md' },
			{ oldPath: 'docs/b.md', newPath: 'archive/b.md' },
		]);
	});

	it('queueMoves dispatches move changes and closes popup', () => {
		const { popups, plugin, overlays } = makePopups();
		popups.moveTargetFiles = [{ path: 'docs/a.md', name: 'a.md' }] as never;
		popups.moveTargetFolder = 'archive';
		popups.queueMoves();
		expect(plugin.queueService.addBatch).toHaveBeenCalledTimes(1);
		expect(overlays.closePopup).toHaveBeenCalledTimes(1);
	});

	it('attachFolderSuggest returns destroy and mirrors selected path into state + input', () => {
		const { popups } = makePopups();
		const input = document.createElement('input');
		const action = popups.attachFolderSuggest(input);
		expect(typeof action.destroy).toBe('function');
		popups.moveTargetFolder = 'manual';
		action.destroy();
		expect(folderSuggestClose).toHaveBeenCalled();
	});
});
