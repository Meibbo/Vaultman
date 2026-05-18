import { describe, expect, it } from 'vitest';
import { ViewHostService } from '../../../src/services/serviceViewHost.svelte';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

function makePreset(args: {
	id?: string;
	viewModes?: readonly string[];
	lock?: boolean;
	media?: boolean;
}): ThemePreset {
	return {
		source: 'built-in',
		id: args.id ?? 'vaultman',
		displayName: 'test',
		useNativeDom: false,
		chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
		density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
		dock: { visible: true, presentation: 'bar' },
		tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
		toolbar: { buttons: 'core' },
		viewModes: (args.viewModes ?? ['tree', 'list', 'table', 'grid', 'cards']) as never,
		nodeElements: {
			icon: true,
			label: true,
			detail: true,
			media: args.media ?? false,
			badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
			actions: true,
		},
		lockNodeElementVisibility: args.lock ?? false,
	};
}

describe('ViewHostService - state and derivations', () => {
	it('selectableModes is the intersection of preset.viewModes and EXPLORER_PLATFORM_VIEW_MODES', () => {
		const preset = makePreset({ viewModes: ['tree', 'list', 'outline' as never] });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		expect(svc.selectableModes).toEqual(['tree', 'list']);
	});

	it('native preset selectableModes equals [tree]', () => {
		const preset = makePreset({ id: 'native', viewModes: ['tree'], lock: true });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		expect(svc.selectableModes).toEqual(['tree']);
	});

	it('nodeElementMask follows preset baseline when no overrides', () => {
		const preset = makePreset({ lock: false, media: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		expect(svc.nodeElementMask.media).toBe(false);
		expect(svc.nodeElementMask.icon).toBe(true);
	});

	it('toggleElement flips an override when unlocked', () => {
		const preset = makePreset({ lock: false, media: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		svc.toggleElement('media');
		expect(svc.nodeElementMask.media).toBe(true);
	});

	it('toggleElement is a no-op when locked', () => {
		const preset = makePreset({ lock: true, media: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		svc.toggleElement('media');
		expect(svc.nodeElementMask.media).toBe(false);
	});

	it('toggleElement("badges") flips all 5 badge sub-kinds together', () => {
		const preset = makePreset({ lock: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		svc.toggleElement('badges');
		expect(svc.nodeElementMask.badges.ops).toBe(false);
		expect(svc.nodeElementMask.badges.filters).toBe(false);
		expect(svc.nodeElementMask.badges.warnings).toBe(false);
		expect(svc.nodeElementMask.badges.inherited).toBe(false);
		expect(svc.nodeElementMask.badges.counts).toBe(false);
	});

	it('toggleBadgeKind flips only that sub-kind', () => {
		const preset = makePreset({ lock: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		svc.toggleBadgeKind('warnings');
		expect(svc.nodeElementMask.badges.warnings).toBe(false);
		expect(svc.nodeElementMask.badges.ops).toBe(true);
	});

	it('resetOverrides clears all overrides; mask returns to baseFromPreset', () => {
		const preset = makePreset({ lock: false, media: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel' });
		svc.toggleElement('media');
		svc.toggleElement('icon');
		svc.resetOverrides();
		expect(svc.nodeElementMask.media).toBe(false);
		expect(svc.nodeElementMask.icon).toBe(true);
	});

	it('multiSelectionAvailable is true when unlocked AND view has nodeElementToggles', () => {
		const preset = makePreset({ lock: false });
		const svc = new ViewHostService({ preset, mountContext: 'panel', initialViewMode: 'tree' });
		expect(svc.multiSelectionAvailable).toBe(true);
	});

	it('multiSelectionAvailable is false when locked', () => {
		const preset = makePreset({ lock: true });
		const svc = new ViewHostService({ preset, mountContext: 'panel', initialViewMode: 'tree' });
		expect(svc.multiSelectionAvailable).toBe(false);
	});

	it('switching preset preserves btnNodeElementsVisibility overrides', () => {
		const presetA = makePreset({ id: 'vaultman', lock: false, media: false });
		const presetB = makePreset({ id: 'vaultman', lock: false, media: false });
		const svc = new ViewHostService({ preset: presetA, mountContext: 'panel' });
		svc.toggleElement('media');
		expect(svc.nodeElementMask.media).toBe(true);
		svc.preset = presetB;
		expect(svc.btnNodeElementsVisibility.media).toBe(true);
		expect(svc.nodeElementMask.media).toBe(true);
	});

	it('switching to a locked preset makes overrides dormant; mask reflects preset baseline', () => {
		const unlocked = makePreset({ id: 'vaultman', lock: false, media: false });
		const locked = makePreset({ id: 'native', lock: true, media: false });
		const svc = new ViewHostService({ preset: unlocked, mountContext: 'panel' });
		svc.toggleElement('media');
		expect(svc.nodeElementMask.media).toBe(true);
		svc.preset = locked;
		expect(svc.nodeElementMask.media).toBe(false);
		expect(svc.btnNodeElementsVisibility.media).toBe(true);
	});

	it('setViewMode updates viewMode state', () => {
		const preset = makePreset({});
		const svc = new ViewHostService({ preset, mountContext: 'panel', initialViewMode: 'tree' });
		svc.setViewMode('cards');
		expect(svc.viewMode).toBe('cards');
	});
});
