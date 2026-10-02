import { setTooltip } from 'obsidian';
import type { TooltipPlacement } from 'obsidian';
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

/**
 * Detect whether an element is inside Obsidian's right sidebar/split or placed
 * so close to the right viewport edge that a right-side lateral tooltip would
 * overflow off-screen.
 */
export function isElementInRightSidebar(el: Element | null | undefined): boolean {
	if (!el) return false;
	if (el.closest?.('.mod-right-split, [data-surface-position="right-sidebar"]')) {
		return true;
	}
	if (typeof window !== 'undefined' && typeof el.getBoundingClientRect === 'function') {
		try {
			const rect = el.getBoundingClientRect();
			if (rect && (rect.width > 0 || rect.height > 0) && rect.right > window.innerWidth - 320) {
				return true;
			}
		} catch {
			// ignore in test / virtual dom
		}
	}
	return false;
}

/**
 * Resolves final TooltipPlacement taking into account screen bounds.
 * Lateral placements (`side` or `right`) flip to `left` when docked on the
 * right sidebar to prevent off-screen rendering.
 */
export function resolveTooltipPlacement(
	placement: TooltipPlacement | 'side' | undefined,
	element?: Element | null,
): TooltipPlacement {
	if (placement === 'bottom') return 'bottom';
	if (placement === 'top') return 'top';
	if (placement === 'left') return 'left';
	if (isElementInRightSidebar(element)) return 'left';
	return 'right';
}

/**
 * U130 polishing: user-facing tooltip placement (`side` = native lateral,
 * `below` = historic ours, `above`) mapped to Obsidian placements. Unknown
 * values fall back to native-like `right` (or `left` if in right sidebar).
 */
export function tooltipPlacementForSetting(
	value: unknown,
	contextEl?: Element | null,
): TooltipPlacement {
	if (value === 'below') return 'bottom';
	if (value === 'above') return 'top';
	if (value === 'left') return 'left';
	return resolveTooltipPlacement('right', contextEl);
}

export function applyCellTooltip(
	element: HTMLElement,
	explorer: ExplorerTabId,
	viewMode: ExplorerViewMode,
	cellId: string,
	placement?: TooltipPlacement | 'side',
): void {
	const text = cellTooltipText(explorer, viewMode, cellId);
	element.removeAttribute('title');
	if (!text) return;
	element.setAttribute('aria-label', text);
	const resolved = resolveTooltipPlacement(placement, element);
	setTooltip(element, text, { placement: resolved });
}

