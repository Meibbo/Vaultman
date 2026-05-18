import { describe, expect, it } from 'vitest';
import {
	EXPLORER_PLATFORM_VIEW_MODES,
	explorerViewContract,
	isExplorerPlatformViewMode,
	type ExplorerViewFeatureContract,
	type ExplorerPlatformViewMode,
	type NativeStateMod,
} from '../../../src/services/serviceExplorerViewContract';
import { UNIVERSAL_DND_VOCAB } from '../../../src/types/typeViewHost';
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

describe('ExplorerViewFeatureContract - 0-A extension', () => {
	it('returns a contract for every platform mode', () => {
		for (const mode of EXPLORER_PLATFORM_VIEW_MODES) {
			const contract: ExplorerViewFeatureContract = explorerViewContract(mode);
			expect(contract).toBeDefined();
			expect(contract.viewMode).toBe(mode);
			expect(contract.nativeDomEmission).toBeDefined();
			expect(contract.nativeDomEmission.panel).toBeDefined();
			expect(contract.nativeDomEmission.inEditor).toBeDefined();
		}
	});

	it('tree contract emits the tree-item* family in panel context', () => {
		const c = explorerViewContract('tree');
		expect(c.nativeDomEmission.panel.rowRoot).toBe('tree-item');
		expect(c.nativeDomEmission.panel.primaryLabel).toBe('tree-item-inner');
		expect(c.nativeDomEmission.panel.innerWrapper).toBe('tree-item-self');
		expect(c.nativeDomEmission.panel.childrenContainer).toBe('tree-item-children');
		expect(c.nativeDomEmission.panel.collapseIcon).toBe('collapse-icon');
	});

	it('table contract emits Bases vocab in panel context', () => {
		const c = explorerViewContract('table');
		expect(c.nativeDomEmission.panel.rowRoot).toBe('bases-tr');
		expect(c.nativeDomEmission.panel.primaryLabel).toBe('bases-table-cell');
		expect(c.nativeDomEmission.panel.cellWrapper).toBe('bases-td');
		expect(c.nativeDomEmission.panel.headerCell).toBe('bases-table-header');
	});

	it('cards contract emits Bases cards vocab including cover image slot', () => {
		const c = explorerViewContract('cards');
		expect(c.nativeDomEmission.panel.rowRoot).toBe('bases-cards-item');
		expect(c.nativeDomEmission.panel.primaryLabel).toBe('bases-cards-property mod-title');
		expect(c.nativeDomEmission.panel.cellWrapper).toBe('bases-cards-property');
		expect(c.nativeDomEmission.panel.coverImage).toBe('bases-cards-cover');
	});

	it('list contract emits no native classes (no Obsidian analog)', () => {
		const c = explorerViewContract('list');
		expect(c.nativeDomEmission.panel.rowRoot).toBeNull();
		expect(c.nativeDomEmission.panel.primaryLabel).toBeNull();
		expect(c.nativeDomEmission.panel.rowStateMods).toEqual([]);
	});

	it('grid contract emits no native classes (no Bases analog)', () => {
		const c = explorerViewContract('grid');
		expect(c.nativeDomEmission.panel.rowRoot).toBeNull();
		expect(c.nativeDomEmission.panel.primaryLabel).toBeNull();
		expect(c.nativeDomEmission.panel.rowStateMods).toEqual([]);
	});

	it('in-editor context uses reduced rowStateMods (no DnD by default)', () => {
		const treeInEditor = explorerViewContract('tree').nativeDomEmission.inEditor;
		expect(treeInEditor.rowStateMods).toContain('is-active');
		expect(treeInEditor.rowStateMods).toContain('is-selected');
		expect(treeInEditor.rowStateMods).toContain('is-focused');
		expect(treeInEditor.rowStateMods).not.toContain('is-being-dragged');
		expect(treeInEditor.rowStateMods).not.toContain('is-being-dragged-over');
	});

	it('UNIVERSAL_DND_VOCAB exports canonical class strings', () => {
		expect(UNIVERSAL_DND_VOCAB.dragSource).toBe('is-being-dragged');
		expect(UNIVERSAL_DND_VOCAB.dragTarget).toBe('is-being-dragged-over');
		expect(UNIVERSAL_DND_VOCAB.dropIndicator).toBe('drop-indicator');
		expect(UNIVERSAL_DND_VOCAB.dropIndicatorActive).toBe('is-active');
		expect(UNIVERSAL_DND_VOCAB.bodyGrabbing).toBe('is-grabbing');
		expect(UNIVERSAL_DND_VOCAB.ghost).toBe('drag-ghost');
	});

	it('NativeStateMod allowlist on tree includes drag mods in panel only', () => {
		const treePanel = explorerViewContract('tree').nativeDomEmission.panel;
		const expectedPanelMods: readonly NativeStateMod[] = [
			'is-being-dragged',
			'mod-collapsible',
			'is-collapsed',
		];

		for (const mod of expectedPanelMods) {
			expect(treePanel.rowStateMods).toContain(mod);
		}
	});
});
