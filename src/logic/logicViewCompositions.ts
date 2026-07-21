import type { ExplorerTabId } from '../types/typeUI';
import type { SavedLayout, SavedViewConfig } from '../types/typeSettings';
import {
	cellsForExplorer,
	defaultVisibleCells,
} from './logicCellRegistry';
import { normalizeExplorerSortState } from './logicScopedSort';

/**
 * BT5 (dev request): two seeded, deletable default View Compositions.
 *
 * They are inserted once through a migration flag, so a user who deletes them
 * keeps them gone. Everything is derived from the cell registry and the sort
 * defaults, so the compositions never drift from the real per-tab shape.
 */
const COMPOSITION_TABS: readonly ExplorerTabId[] = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
];

/** Names are stable identities used by the seeding migration for dedupe. */
export const BASIC_LIST_COMPOSITION = 'Basic list';
export const PREVIEW_COMPOSITION = 'Preview';

function sortStateFor(tab: ExplorerTabId): SavedViewConfig['sortState'] {
	return normalizeExplorerSortState(tab, null);
}

/** Every explorer as a flat tree list: identity cells only, nesting off. */
function basicListComposition(): SavedLayout {
	const config: Record<string, SavedViewConfig> = {};
	for (const tab of COMPOSITION_TABS) {
		const cells = defaultVisibleCells(tab, 'tree').filter(
			(cell) => cell !== 'nested',
		);
		config[tab] = {
			viewMode: 'tree',
			visibleCells: cells,
			sortState: sortStateFor(tab),
		};
	}
	return {
		name: BASIC_LIST_COMPOSITION,
		summary: 'Flat tree · identity cells · nesting off',
		config,
	};
}

/** Full tree with every cell, plus the floating index. */
function previewComposition(): SavedLayout {
	const config: Record<string, SavedViewConfig> = {};
	for (const tab of COMPOSITION_TABS) {
		config[tab] = {
			viewMode: 'tree',
			visibleCells: cellsForExplorer(tab, 'tree').map(
				(definition) => definition.id,
			),
			sortState: sortStateFor(tab),
		};
	}
	return {
		name: PREVIEW_COMPOSITION,
		summary: 'Full tree · all cells · index',
		config,
		floatingToc: { enabled: true, kind: 'files', rootId: null },
	};
}

export function defaultViewCompositions(): SavedLayout[] {
	return [basicListComposition(), previewComposition()];
}

/**
 * Seed the defaults into an existing list without ever re-adding one the user
 * already has (or deleted — the caller only runs this once, behind a flag).
 * Returns the merged list.
 */
export function seedDefaultViewCompositions(
	existing: readonly SavedLayout[] | undefined,
): SavedLayout[] {
	const present = new Set((existing ?? []).map((layout) => layout.name));
	const seeded = defaultViewCompositions().filter(
		(layout) => !present.has(layout.name),
	);
	return [...(existing ?? []), ...seeded];
}
