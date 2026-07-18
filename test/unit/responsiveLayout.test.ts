import { describe, expect, it } from 'vitest';
import {
	explorerDensityProfile,
	LABELED_TOOLBAR_EXTRA_WIDTH,
	NARROW_LABELED_SEARCH_WIDTH,
	NARROW_FILES_TOOLBAR_WIDTH,
	shouldCondenseFilesToolbar,
	shouldHideTabLabelForSearch,
	shouldShowMinimalSearchInput,
	usesMobileExplorerDensity,
} from '../../src/logic/logicResponsiveLayout';

describe('responsive explorer layout', () => {
	it('uses larger virtual geometry for mobile explorer nodes', () => {
		const desktop = explorerDensityProfile(false);
		const mobile = explorerDensityProfile(true);

		expect(mobile.treeRowHeight).toBeGreaterThan(desktop.treeRowHeight);
		expect(mobile.tableRowHeight).toBeGreaterThan(desktop.tableRowHeight);
		expect(mobile.gridRowHeight).toBeGreaterThan(desktop.gridRowHeight);
		expect(mobile.gridMinCardWidth).toBeGreaterThan(desktop.gridMinCardWidth);
	});

	it('honors both the platform flag and Obsidian mobile body classes', () => {
		const classes = (values: string[]) => ({
			contains: (name: string) => values.includes(name),
		});

		expect(usesMobileExplorerDensity(true, classes([]))).toBe(true);
		expect(usesMobileExplorerDensity(false, classes(['is-mobile']))).toBe(true);
		expect(usesMobileExplorerDensity(false, classes(['is-phone']))).toBe(true);
		expect(usesMobileExplorerDensity(false, classes([]))).toBe(false);
	});

	it('condenses Files tools manually or when a measured minimal frame is narrow', () => {
		const base = {
			activeSectionTab: 'files',
			minimalStyle: true,
		};

		expect(
			shouldCondenseFilesToolbar({ ...base, frameWidth: 0, manual: true }),
		).toBe(true);
		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: NARROW_FILES_TOOLBAR_WIDTH - 1,
				manual: false,
			}),
		).toBe(true);
		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: NARROW_FILES_TOOLBAR_WIDTH,
				manual: false,
			}),
		).toBe(false);
		expect(
			shouldCondenseFilesToolbar({
				...base,
				activeSectionTab: 'tags',
				frameWidth: 120,
				manual: true,
			}),
		).toBe(false);
	});

	it('condenses earlier while the tab label consumes toolbar width (BT4-001)', () => {
		const base = {
			activeSectionTab: 'files',
			minimalStyle: true,
			manual: false,
		};
		const labeledThreshold =
			NARROW_FILES_TOOLBAR_WIDTH + LABELED_TOOLBAR_EXTRA_WIDTH;

		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: labeledThreshold - 1,
				tabLabelVisible: true,
			}),
		).toBe(true);
		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: labeledThreshold,
				tabLabelVisible: true,
			}),
		).toBe(false);
		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: labeledThreshold - 1,
				tabLabelVisible: false,
			}),
		).toBe(false);
	});

	it('always shows an expanded minimal search; the tab label yields instead (BT4-001)', () => {
		expect(
			shouldShowMinimalSearchInput({
				frameWidth: NARROW_LABELED_SEARCH_WIDTH - 1,
				minimalStyle: true,
				searchExpanded: true,
				tabLabelVisible: true,
			}),
		).toBe(true);
		expect(
			shouldShowMinimalSearchInput({
				frameWidth: 0,
				minimalStyle: true,
				searchExpanded: false,
				tabLabelVisible: false,
			}),
		).toBe(false);
		expect(
			shouldShowMinimalSearchInput({
				frameWidth: NARROW_LABELED_SEARCH_WIDTH - 1,
				minimalStyle: false,
				searchExpanded: false,
				tabLabelVisible: true,
			}),
		).toBe(true);

		const yieldBase = {
			minimalStyle: true,
			searchExpanded: true,
		};
		expect(
			shouldHideTabLabelForSearch({
				...yieldBase,
				frameWidth: NARROW_LABELED_SEARCH_WIDTH - 1,
			}),
		).toBe(true);
		expect(
			shouldHideTabLabelForSearch({
				...yieldBase,
				frameWidth: NARROW_LABELED_SEARCH_WIDTH,
			}),
		).toBe(false);
		expect(
			shouldHideTabLabelForSearch({
				...yieldBase,
				frameWidth: 0,
			}),
		).toBe(false);
		expect(
			shouldHideTabLabelForSearch({
				...yieldBase,
				searchExpanded: false,
				frameWidth: NARROW_LABELED_SEARCH_WIDTH - 1,
			}),
		).toBe(false);
		expect(
			shouldHideTabLabelForSearch({
				...yieldBase,
				minimalStyle: false,
				frameWidth: NARROW_LABELED_SEARCH_WIDTH - 1,
			}),
		).toBe(false);
	});
});
