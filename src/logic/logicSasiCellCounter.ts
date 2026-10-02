import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130: SASI kind for counter cells. The first type is `_timesOpened`: how
 * many journaled openings a file owns, served by `LastOpenedService`.
 *
 * Registered with no explorer placement on purpose: the dev has not decided
 * where a "times opened" cell belongs yet, so this only makes the kind
 * discoverable through the registry (inspector, providers, future scenes).
 * Nothing renders it and no sort/group consumes it.
 */
export function registerCellCounterKinds(registry: SasiRegistry): void {
	registry.register({
		id: 'cell_counter',
		axis: 'kind',
		type: '_timesOpened',
		catalogKind: 'cell_counter',
		labelKey: 'sasi.cells.kind.cell_counter',
		icon: 'lucide-hash',
		supports: [{ surface: 'files' }],
	});
}
