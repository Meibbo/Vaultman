import { describe, expect, it } from 'vitest';
import { PRESET_NATIVE, PRESET_VAULTMAN } from '../../../src/config/themePresetsBuiltin';
import {
	EXPLORER_PLATFORM_VIEW_MODES,
	explorerViewContract,
} from '../../../src/services/serviceExplorerViewContract';
import { computeNodeElementMask } from '../../../src/services/serviceNodeElementVisibility';
import { ViewHostService } from '../../../src/services/serviceViewHost.svelte';
import type { ExplorerViewMode } from '../../../src/types/typeViews';

describe('0-A invariants - consolidated', () => {
	it('media-always-false in native preset baseline', () => {
		expect(PRESET_NATIVE.nodeElements.media).toBe(false);
		expect(computeNodeElementMask(PRESET_NATIVE, null).media).toBe(false);
	});

	it('media-always-false in vaultman preset baseline', () => {
		expect(PRESET_VAULTMAN.nodeElements.media).toBe(false);
		expect(computeNodeElementMask(PRESET_VAULTMAN, null).media).toBe(false);
	});

	it('EXPLORER_PLATFORM_VIEW_MODES excludes markmap and outline', () => {
		expect(EXPLORER_PLATFORM_VIEW_MODES).not.toContain('markmap' as never);
		expect(EXPLORER_PLATFORM_VIEW_MODES).not.toContain('outline' as never);
	});

	it('panel and in-editor contexts emit DIFFERENT rowStateMods for tree', () => {
		const tree = explorerViewContract('tree');
		expect(tree.nativeDomEmission.panel.rowStateMods).not.toEqual(
			tree.nativeDomEmission.inEditor.rowStateMods,
		);
	});

	it('every platform view has a contract entry', () => {
		for (const mode of EXPLORER_PLATFORM_VIEW_MODES) {
			const contract = explorerViewContract(mode);
			expect(contract).toBeDefined();
			expect(contract.viewMode).toBe(mode);
		}
	});

	it('feature-contract gating hides node element submenu for non-platform view modes', () => {
		const service = new ViewHostService({
			preset: PRESET_VAULTMAN,
			mountContext: 'panel',
			initialViewMode: 'markmap' as ExplorerViewMode,
		});
		expect(service.multiSelectionAvailable).toBe(false);
	});

	it('feature-contract gating shows node element submenu for unlocked platform view modes', () => {
		const service = new ViewHostService({
			preset: PRESET_VAULTMAN,
			mountContext: 'panel',
			initialViewMode: 'tree',
		});
		expect(service.multiSelectionAvailable).toBe(true);
	});
});
