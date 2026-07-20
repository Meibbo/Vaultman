import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import tableSource from '../../src/components/layout/viewGrid.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import statisticsCacheSource from '../../src/services/serviceStatisticsCache.ts?raw';
import statisticsStorageSource from '../../src/services/serviceStatisticsStorage.ts?raw';

describe('Files hover info source guards', () => {
	it('forwards lazy hover callbacks from every virtualized Files surface', () => {
		expect(treeSource).toContain(
			'onRowHover?: (id: string, row: HTMLElement) => void',
		);
		expect(treeSource).toContain('opts.onRowHover?.(node.id, row)');
		expect(tableSource).toContain(
			'onFileHover?: (file: TFile, element: HTMLElement) => void',
		);
		expect(tableSource).toContain('this.callbacks.onFileHover?.(file, row)');
		expect(filesGridSource).toContain(
			'onFileHover?: (file: TFile, element: HTMLElement) => void',
		);
		expect(filesGridSource).toContain(
			'this.callbacks.onFileHover?.(file, card)',
		);
	});

	it('loads only missing file stats and guards recycled virtual rows', () => {
		expect(explorerFilesSource).toContain('setTooltip');
		expect(explorerFilesSource).toContain('getFileCharacterCount(file)');
		expect(explorerFilesSource).toContain('ensureFileStats([file])');
		expect(explorerFilesSource).toContain(
			'waitingElement.dataset.path === file.path',
		);
		expect(explorerFilesSource).toContain('pendingHoverStats');
	});

	it('keeps the settings page and legacy IndexedDB records compatible', () => {
		expect(settingsSource).toContain("this.page = 'files-hover'");
		// BT5-010: the hover field list now comes from the shared cell
		// registry instead of a settings-local constant.
		expect(settingsSource).toContain('fileHoverEntries()');
		expect(settingsSource).not.toContain('FILES_HOVER_INFO_FIELDS');
		expect(statisticsCacheSource).toContain(
			'getFileCharacterCount(file: TFile)',
		);
		expect(statisticsCacheSource).toContain('countCharacters(content: string)');
		expect(statisticsStorageSource).toContain(
			"typeof candidate.characters === 'number' ? candidate.characters : -1",
		);
	});
});
