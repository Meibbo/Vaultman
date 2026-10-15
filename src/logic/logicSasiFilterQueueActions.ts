import type { SasiRegistry } from './logicSasiRegistry';

export const FILTERS_CLEAR_ALL_ID = 'vaultman.filters.clearAll';
export const FILTERS_SHOW_SELECTED_ID = 'vaultman.filters.showSelected';
export const FILTERS_TEMPLATES_ID = 'vaultman.filters.templates';
export const FILTERS_BASES_INTEROP_ID = 'vaultman.filters.basesInterop';

export const QUEUE_CLEAR_ID = 'vaultman.queue.clear';
export const QUEUE_DETAILS_ID = 'vaultman.queue.details';
export const QUEUE_TEMPLATES_ID = 'vaultman.queue.templates';
export const QUEUE_EXECUTE_ID = 'vaultman.queue.execute';

export const FILTER_QUEUE_ACTIONS = [
	{
		id: FILTERS_CLEAR_ALL_ID,
		labelKey: 'filters.popup.clear_all',
		icon: 'lucide-trash-2',
		scope: 'workspace:last_focused',
	},
	{
		id: FILTERS_SHOW_SELECTED_ID,
		labelKey: 'filters.island.view_selected',
		icon: 'lucide-check-square',
		scope: 'workspace:last_focused',
	},
	{
		id: FILTERS_TEMPLATES_ID,
		labelKey: 'filters.popup.templates',
		icon: 'lucide-bookmark',
		scope: 'workspace:last_focused',
	},
	{
		id: FILTERS_BASES_INTEROP_ID,
		labelKey: 'filters.bases.menu',
		icon: 'lucide-database-zap',
		scope: 'workspace:last_focused',
	},
	{
		id: QUEUE_CLEAR_ID,
		labelKey: 'ops.clear',
		icon: 'lucide-trash',
		scope: 'workspace:all',
	},
	{
		id: QUEUE_DETAILS_ID,
		labelKey: 'ops.details',
		icon: 'lucide-list',
		scope: 'workspace:all',
	},
	{
		id: QUEUE_TEMPLATES_ID,
		labelKey: 'queue.template.templates',
		icon: 'lucide-bookmark',
		scope: 'workspace:all',
	},
	{
		id: QUEUE_EXECUTE_ID,
		labelKey: 'ops.apply',
		icon: 'lucide-play',
		scope: 'workspace:all',
	},
] as const;

export const FILTER_QUEUE_ACTION_IDS: ReadonlySet<string> = new Set(
	FILTER_QUEUE_ACTIONS.map((action) => action.id),
);

export function registerFilterQueueActions(registry: SasiRegistry): void {
	for (const action of FILTER_QUEUE_ACTIONS) {
		registry.register({
			...action,
			axis: 'function',
			kind: 'action',
			supports: [{ surface: 'panelWidget' }],
		});
	}
}
