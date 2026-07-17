import { describe, expect, it } from 'vitest';
import {
	explorerDensityProfile,
	NARROW_FILES_TOOLBAR_WIDTH,
	shouldCondenseFilesToolbar,
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
});
