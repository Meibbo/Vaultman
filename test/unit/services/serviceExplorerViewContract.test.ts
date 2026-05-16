import { describe, expect, it } from 'vitest';
import {
	EXPLORER_PLATFORM_VIEW_MODES,
	explorerViewContract,
	isExplorerPlatformViewMode,
	type ExplorerPlatformViewMode,
} from '../../../src/services/serviceExplorerViewContract';
import { EXPLORER_VIEW_MODES } from '../../../src/types/typeViews';

const expectedModes = ['tree', 'list', 'table', 'grid', 'cards'] as const satisfies readonly ExplorerPlatformViewMode[];

describe('serviceExplorerViewContract', () => {
	it('declares the shared Explorer feature matrix for every selectable platform view', () => {
		expect(EXPLORER_PLATFORM_VIEW_MODES).toEqual(expectedModes);

		for (const viewMode of expectedModes) {
			expect(explorerViewContract(viewMode)).toMatchObject({
				viewMode,
				features: {
					selection: true,
					keyboardFocus: true,
					contextMenu: true,
					scrollReveal: true,
					badges: true,
					nodeElementToggles: true,
					acceptsMediaDescriptors: true,
				},
			});
		}
	});

	it('guards against tree-only platform APIs and keeps Map out of selectable pass scope', () => {
		const nonMapModes = EXPLORER_VIEW_MODES.filter(
			(viewMode): viewMode is ExplorerPlatformViewMode => viewMode !== 'markmap',
		);

		expect([...EXPLORER_PLATFORM_VIEW_MODES].sort()).toEqual([...nonMapModes].sort());
		expect(isExplorerPlatformViewMode('markmap')).toBe(false);

		for (const viewMode of nonMapModes) {
			expect(explorerViewContract(viewMode).features.acceptsMediaDescriptors).toBe(true);
		}

		for (const viewMode of ['table', 'grid', 'cards'] as const) {
			const contract = explorerViewContract(viewMode);
			expect(contract.scale.releaseGateNodes).toBe(10_000);
			expect(contract.scale.characterizationNodes).toBe(50_000);
			expect(contract.adapterNotes).toContain('50K');
		}
	});
});
