import { setTooltip } from 'obsidian';
import { translate } from '../i18n/index';
import type { ExplorerTabId, ExplorerViewMode } from '../types/typeUI';
import { cellDef, cellLabelKey } from './logicCellRegistry';

export type CellTooltipKind = 'counter' | 'date';

const COUNTER_CELL_IDS = new Set([
	'count',
	'file-count',
	'sub',
	'words',
	'tags',
	'tasks',
]);

const DATE_CELL_IDS = new Set([
	'mtime',
	'ctime',
	'opened',
	'installed',
	'updated',
]);

/**
 * Only counter/date cells own a concise per-cell tooltip. Other cells keep
 * their existing hover contract (or no tooltip at all).
 */
export function cellTooltipKind(cellId: string): CellTooltipKind | null {
	if (COUNTER_CELL_IDS.has(cellId)) return 'counter';
	if (DATE_CELL_IDS.has(cellId)) return 'date';
	return null;
}

/** The exact localized cell name, without value or explanatory copy. */
export function cellTooltipText(
	explorer: ExplorerTabId,
	viewMode: ExplorerViewMode,
	cellId: string,
): string {
	if (!cellTooltipKind(cellId)) return '';
	const definition = cellDef(cellId);
	if (!definition) return '';
	const supported = definition.supports.some(
		(support) =>
			support.explorer === explorer &&
			(!support.viewModes || support.viewModes.includes(viewMode)),
	);
	if (!supported) return '';
	return translate(cellLabelKey(definition, explorer, viewMode));
}

export function applyCellTooltip(
	element: HTMLElement,
	explorer: ExplorerTabId,
	viewMode: ExplorerViewMode,
	cellId: string,
): void {
	const text = cellTooltipText(explorer, viewMode, cellId);
	element.removeAttribute('title');
	if (!text) return;
	element.setAttribute('aria-label', text);
	setTooltip(element, text);
}
