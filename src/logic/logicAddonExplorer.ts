import type {
	ExplorerSortState,
	ExplorerViewMode,
	ScopeSort,
} from '../types/typeUI';
import type { FloatingTocPanel } from '../services/routerFloatingToc';
import type { AddonCellStyle } from '../types/typeSettings';

export interface AddonEntryProjection {
	name: string;
	enabled: boolean;
	installedTime?: number;
	updatedTime?: number;
}

export interface AddonExplorerPanelPort extends FloatingTocPanel {
	refresh(): Promise<void>;
	setSearchTerm(term: string): void;
	setSortState(state: ExplorerSortState): void;
	setVisibleCells(cells: Set<string>): void;
	setViewMode(mode: ExplorerViewMode): void;
	setCellStyle(style: AddonCellStyle): void;
}

export function sortAddonEntries<T extends AddonEntryProjection>(
	entries: readonly T[],
	sort: ScopeSort,
): T[] {
	const direction = sort.direction === 'asc' ? 1 : -1;
	const numeric = { numeric: true, sensitivity: 'base' } as const;
	return [...entries].sort((a, b) => {
		if (sort.sortBy === 'state' && a.enabled !== b.enabled) {
			return direction * (Number(a.enabled) - Number(b.enabled));
		}
		if (sort.sortBy === 'installed' || sort.sortBy === 'updated') {
			const field =
				sort.sortBy === 'installed' ? 'installedTime' : 'updatedTime';
			const left = a[field];
			const right = b[field];
			if (left == null && right != null) return 1;
			if (left != null && right == null) return -1;
			if (left != null && right != null && left !== right) {
				return direction * (left - right);
			}
		}
		const byName = a.name.localeCompare(b.name, undefined, numeric);
		return sort.sortBy === 'name' ? direction * byName : byName;
	});
}

export function filterAddonEntries<T>(
	entries: readonly T[],
	term: string,
	searchableText: (entry: T) => string,
): T[] {
	const query = term.trim().toLocaleLowerCase();
	if (!query) return [...entries];
	return entries.filter((entry) =>
		searchableText(entry).toLocaleLowerCase().includes(query),
	);
}

export interface AddonHoverData {
	name: string;
	installed?: string;
	updated?: string;
	version?: string;
	author?: string;
}

export function buildAddonHoverInfo(
	data: AddonHoverData,
	labels: Record<'installed' | 'updated' | 'version' | 'author', string>,
): string {
	const lines = [data.name];
	for (const field of ['installed', 'updated', 'version', 'author'] as const) {
		const value = data[field];
		if (value) lines.push(`${labels[field]}: ${value}`);
	}
	return lines.join('\n');
}

export function formatAddonTimestamp(timestamp?: number): string | undefined {
	return timestamp == null ? undefined : new Date(timestamp).toLocaleString();
}
