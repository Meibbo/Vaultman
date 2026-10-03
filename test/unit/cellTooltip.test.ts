import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../../src/i18n/index';
import {
	cellTooltipKind,
	cellTooltipText,
	tooltipPlacementForSetting,
} from '../../src/logic/logicCellTooltip';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import filesTableSource from '../../src/components/layout/viewGrid.ts?raw';
import filesCardsSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

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
		expect(cellTooltipText('tags', 'grid', 'mtime')).toBe('');

		setLanguage('es');
		expect(cellTooltipText('files', 'tree', 'count')).toBe('Props');
		expect(cellTooltipText('tags', 'tree', 'count')).toBe('Cantidad');
		expect(cellTooltipText('files', 'table', 'ctime')).toBe('Creación');
	});

	it('routes every rendering engine through the same tooltip resolver', () => {
		expect(viewTreeSource).toContain('applySharedCellTooltip');
		expect(nodeTableSource).toContain('applyCellTooltip');
		expect(filesTableSource).toContain('applyCellTooltip');
		expect(filesCardsSource).toContain('applyCellTooltip');
	});

	it('removes the verbose native Files counter title', () => {
		expect(viewTreeSource).not.toContain('`${node.fileCountText} files`');
		expect(viewTreeSource).toContain(
			"this.applyCellTooltip(cell, 'file-count', opts)",
		);
	});

	it('keeps Files row hover separate from cell-owned tooltips', () => {
		expect(explorerFilesSource).not.toContain('rowTooltip: (node');
		expect(explorerFilesSource).toContain(
			'onRowHover: (id: string, row: HTMLElement)',
		);
	});
});

describe('tooltip placement (U130 polishing)', () => {
	it('maps the user-facing position to native placements, defaulting to side', () => {
		expect(tooltipPlacementForSetting('side')).toBe('right');
		expect(tooltipPlacementForSetting('below')).toBe('bottom');
		expect(tooltipPlacementForSetting('above')).toBe('top');
		expect(tooltipPlacementForSetting(undefined)).toBe('right');
		expect(tooltipPlacementForSetting('sideways')).toBe('right');
	});

	it('routes placement from the global setting through rows, cells and hovers', () => {
		expect(viewTreeSource).toContain('tooltipPlacement?: TooltipPlacement');
		expect(viewTreeSource).toContain('opts.tooltipPlacement');
		expect(explorerFilesSource).toContain(
			'tooltipPlacement: tooltipPlacementForSetting(',
		);
		expect(settingsSource).toContain("translate('settings.tooltip_placement')");
	});

	it('labels the position setting in both languages', () => {
		for (const key of [
			'settings.tooltip_placement',
			'settings.tooltip_placement.desc',
			'settings.tooltip_placement.side',
			'settings.tooltip_placement.below',
			'settings.tooltip_placement.above',
		]) {
			expect(en[key], `en: ${key}`).toBeTruthy();
			expect(es[key], `es: ${key}`).toBeTruthy();
			expect(es[key], `es!=en: ${key}`).not.toBe(en[key]);
		}
	});
});
