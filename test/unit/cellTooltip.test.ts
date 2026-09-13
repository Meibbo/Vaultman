import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../../src/i18n/index';
import {
	cellTooltipKind,
	cellTooltipText,
} from '../../src/logic/logicCellTooltip';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import filesTableSource from '../../src/components/layout/viewGrid.ts?raw';
import filesCardsSource from '../../src/components/layout/viewFilesGrid.ts?raw';

afterEach(() => setLanguage('en'));

describe('concise counter/date cell tooltips', () => {
	it('classifies only counter and date cells', () => {
		for (const id of ['count', 'file-count', 'sub', 'words', 'tags', 'tasks']) {
			expect(cellTooltipKind(id)).toBe('counter');
		}
		for (const id of ['mtime', 'ctime', 'opened', 'installed', 'updated']) {
			expect(cellTooltipKind(id)).toBe('date');
		}
		expect(cellTooltipKind('name')).toBeNull();
		expect(cellTooltipKind('ext')).toBeNull();
	});

	it('returns only the contextual localized cell name', () => {
		setLanguage('en');
		expect(cellTooltipText('files', 'tree', 'count')).toBe('Props');
		expect(cellTooltipText('tags', 'tree', 'count')).toBe('Count');
		expect(cellTooltipText('plugins', 'tree', 'updated')).toBe('Updated');
		expect(cellTooltipText('files', 'table', 'mtime')).toBe('Modified');
		expect(cellTooltipText('files', 'tree', 'name')).toBe('');

		setLanguage('es');
		expect(cellTooltipText('files', 'tree', 'count')).toBe('Props');
		expect(cellTooltipText('tags', 'tree', 'count')).toBe('Cantidad');
		expect(cellTooltipText('files', 'table', 'ctime')).toBe('Creación');
	});

	it('routes every rendering engine through the same tooltip resolver', () => {
		expect(viewTreeSource).toContain('cellTooltipText');
		expect(nodeTableSource).toContain('cellTooltipText');
		expect(filesTableSource).toContain("cellTooltipText('files', 'table'");
		expect(filesCardsSource).toContain("cellTooltipText('files', 'grid'");
	});

	it('removes the verbose native Files counter title', () => {
		expect(viewTreeSource).not.toContain('`${node.fileCountText} files`');
		expect(viewTreeSource).toContain(
			"this.applyCellTooltip(cell, 'file-count', opts)",
		);
	});
});
