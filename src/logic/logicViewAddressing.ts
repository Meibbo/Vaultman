import type { ViewConfig } from '../types/typeViewConfig';
import type { ExplorerViewMode } from '../types/typeViews';

export type ExplorerViewAddress = Pick<ViewConfig, 'engine' | 'mode'>;
export type AddressableExplorerViewMode = Exclude<ExplorerViewMode, 'markmap'>;

const VIEW_MODE_TO_CONFIG: Record<AddressableExplorerViewMode, ExplorerViewAddress> = {
	tree: { engine: 'Linear', mode: 'indent' },
	list: { engine: 'Linear', mode: 'flat' },
	table: { engine: 'Geometry', mode: 'table' },
	grid: { engine: 'Geometry', mode: 'grid' },
	cards: { engine: 'Geometry', mode: 'cards' },
} as const;

export function viewModeToConfig(mode: ExplorerViewMode): ExplorerViewAddress | null {
	return Object.hasOwn(VIEW_MODE_TO_CONFIG, mode)
		? VIEW_MODE_TO_CONFIG[mode as AddressableExplorerViewMode]
		: null;
}

export function configToViewMode(
	config: Pick<ViewConfig, 'engine' | 'mode'>,
): AddressableExplorerViewMode | null {
	for (const [viewMode, address] of Object.entries(VIEW_MODE_TO_CONFIG) as [
		AddressableExplorerViewMode,
		ExplorerViewAddress,
	][]) {
		if (address.engine === config.engine && address.mode === config.mode) {
			return viewMode;
		}
	}
	return null;
}
