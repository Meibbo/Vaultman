<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import ViewList from '../views/viewList.svelte';
	import { ViewService } from '../../services/serviceViews.svelte';
	import {
		groupQueueChangesByAction,
		type QueueActionGroupNode,
	} from '../../services/serviceGroups';
	import type { NodeBase, QueueChange } from '../../types/typeContracts';
	import type { ExplorerRenderModel, ViewAction, ViewRow } from '../../types/typeViews';
	import { translate } from '../../index/i18n/lang';

	let {
		plugin,
		onClose,
	}: {
		plugin: VaultmanPlugin;
		onClose?: () => void;
	} = $props();

	const fallbackViewService = new ViewService();
	let model: ExplorerRenderModel<NodeBase> = $state(emptyModel());

	const hasItems = $derived(model.rows.length > 0);

	$effect(() => {
		syncItems();
		return plugin.operationsIndex.subscribe(syncItems);
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (n: string) => setIcon(el, n) };
	}

	function removeItem(id: string) {
		plugin.queueService.remove(id);
	}

	function clearQueue() {
		plugin.queueService.clear();
	}

	function executeAll() {
		void plugin.queueService.execute();
		onClose?.();
	}

	function syncItems() {
		model = (plugin.viewService ?? fallbackViewService).getModel({
			explorerId: 'queue',
			mode: 'list',
			nodes: groupQueueChangesByAction(plugin.operationsIndex.nodes),
			getLabel: (node) =>
				isQueueActionGroupNode(node) ? node.label : (node as QueueChange).change.type,
			getDetail: (node) =>
				isQueueActionGroupNode(node)
					? `${node.count} operation${node.count === 1 ? '' : 's'}`
					: ((node as QueueChange).change.details ?? ''),
			getActions: (node) =>
				isQueueActionGroupNode(node)
					? []
					: [
							{
								id: 'remove',
								label: translate('queue.remove'),
								icon: 'lucide-x',
								tone: 'danger',
							},
						],
			getDecorationContext: () => ({ kind: 'operation' }),
		}) as unknown as ExplorerRenderModel<NodeBase>;
	}

	function handleAction(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) {
		if (action.id === 'remove' && !isQueueActionGroupNode(row.node)) removeItem(row.id);
	}

	function isQueueActionGroupNode(node: NodeBase): node is QueueActionGroupNode {
		const candidate = node as { kind?: string; groupKey?: unknown };
		return candidate.kind === 'group' && typeof candidate.groupKey === 'string';
	}

	function emptyModel(): ExplorerRenderModel<NodeBase> {
		return {
			explorerId: 'queue',
			mode: 'list',
			rows: [],
			columns: [],
			groups: [],
			selection: { ids: new Set() },
			focus: { id: null },
			sort: { id: 'manual', direction: 'asc' },
			search: { query: '' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: {},
		};
	}
</script>

<div class="vm-explorer-popup-shell">
	<div class="vm-popup-squircles" aria-label={translate('ops.queue')}>
		<button
			class="vm-squircle"
			onclick={clearQueue}
			disabled={!hasItems}
			aria-label={translate('queue.clear')}
			use:icon={'lucide-trash-2'}
		></button>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('queue.marks')}
			use:icon={'lucide-book-marked'}
		></button>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('queue.file_diff')}
			use:icon={'lucide-git-compare'}
		></button>
		<button
			class="vm-squircle is-accent"
			onclick={executeAll}
			disabled={!hasItems}
			aria-label={translate('queue.execute')}
			use:icon={'lucide-check'}
		></button>
	</div>

	<div class="vm-explorer-popup">
		<header class="vm-explorer-popup-header">
			<span class="vm-subtitle">{translate('ops.queue', { count: model.rows.length })}</span>
		</header>

		{#if !hasItems}
			<div class="vm-explorer-popup-empty">{translate('queue.island.empty')}</div>
		{:else}
			<ViewList {model} {icon} onAction={handleAction} />
		{/if}
	</div>
</div>
