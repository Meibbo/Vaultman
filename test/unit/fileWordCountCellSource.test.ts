import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import gridViewSource from '../../src/components/layout/viewGrid.ts?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import tableLayoutSource from '../../src/logic/logicTableLayout.ts?raw';
import statisticsCacheSource from '../../src/services/serviceStatisticsCache.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import typeTreeSource from '../../src/types/typeTree.ts?raw';

describe('Files word count cell source guards', () => {
	it('keeps word count cells opt-in in the Files visible-cell controls', () => {
		expect(popupViewSource).toContain("{ id: 'words'");
		expect(popupViewSource).toContain("labelKey: 'viewmode.pill.words'");
		expect(popupViewSource).toContain("defaultOn: false");
		expect(navbarFiltersSource).toContain("words: 'viewmode.pill.words'");
		expect(navbarFiltersSource).toContain("words: 'lucide-text'");
		expect(navbarFiltersSource).toContain(
			"files: ['name', 'ext', 'count', 'nested']",
		);
	});

	it('renders Files word count from cache-only callbacks in every Files view', () => {
		expect(statisticsCacheSource).toContain('getFileWordCount(file: TFile)');
		const getterBlock = statisticsCacheSource.match(
			/getFileWordCount\(file: TFile\)[\s\S]*?\n\t}\n/,
		)?.[0];
		expect(getterBlock).toContain('this.fileStatsCache.get(file.path)');
		expect(getterBlock).toContain('cached.words');
		expect(getterBlock).not.toContain('cachedRead');
		expect(getterBlock).not.toContain('computeSnapshot');

		expect(explorerFilesSource).toContain(
			'this.plugin.statisticsCache.getFileWordCount(file)',
		);
		expect(gridViewSource).toContain('getWordCount?: (file: TFile) => number | null');
		expect(filesGridSource).toContain('getWordCount?: (file: TFile) => number | null');
		expect(treeSource).toContain('node.wordCountText');
		expect(typeTreeSource).toContain('wordCountText?: string');
	});

	it('adds the word count cell to the virtualized Files surfaces without vault reads during render', () => {
		expect(tableLayoutSource).toContain("| 'words'");
		expect(tableLayoutSource).toContain("'words'");
		expect(tableLayoutSource).toContain("dataProperty: 'vaultman.words'");
		expect(gridViewSource).toContain("column.id === 'words'");
		expect(gridViewSource).toContain("'vaultman-file-words'");
		expect(filesGridSource).toContain("this.visibleCells.has('words')");
		expect(filesGridSource).toContain('vaultman-files-grid-card-words');
		expect(treeSource).toContain("visibleCells.has('words')");
		expect(treeSource).toContain('vaultman-tree-words');
		expect(gridViewSource).not.toContain('cachedRead');
		expect(filesGridSource).not.toContain('cachedRead');
		expect(treeSource).not.toContain('cachedRead');
	});
});
