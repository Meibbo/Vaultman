<script lang="ts">
	/**
	 * U130-04: el segundo Bar, hermano del Toolbar. Es telemetria + UN control.
	 *
	 * NO lleva `Proceed`: duplicarlo aqui daria dos caminos a una escritura de
	 * vault y dos sitios que mantener sincronizados. `Proceed` y `Cancel` siguen
	 * en el panelWidget segun el space-config.
	 */
	import CellAction from '../cells/cellAction.svelte';
	import type { SasiNode } from '../../services/serviceSasiProvider';
	import type { TransactionBarState } from '../../logic/logicTransactionBarState';

	interface Props {
		state: TransactionBarState;
		resolve: (id: string) => SasiNode | null;
		translate: (key: string, vars?: Record<string, unknown>) => string;
		icon: (el: HTMLElement, name: string) => { update(name: string): void };
		onToggleMoveKind: (next: 'node' | 'group') => void;
	}

	let { state, resolve, translate, icon, onToggleMoveKind }: Props = $props();

	const TOGGLE_ID = 'vaultman.move.toggleMoveKind';

	// El tooltip enumera los elementos: un numero sin desglose no deja
	// verificar antes de escribir en el vault (spec-04 test 10).
	const originsTooltip = $derived(state.originLabels.join('\n'));
	const destinationsTooltip = $derived(state.destinationLabels.join('\n'));
</script>

{#if state.visibility === 'visible'}
	<div
		class="vaultman-transaction-bar"
		class:vaultman-transaction-bar--above={state.placement === 'above-search'}
		data-transaction-bar-move-kind={state.moveKind}
		role="status"
		aria-live="polite"
	>
		<span class="vaultman-transaction-bar-mode">
			{translate(
				state.moveKind === 'node'
					? 'transaction_bar.mode.node'
					: 'transaction_bar.mode.group',
			)}
		</span>
		<span class="vaultman-transaction-bar-metric" title={originsTooltip}>
			{translate('transaction_bar.origins', { count: state.originCount })}
		</span>
		<span class="vaultman-transaction-bar-metric" title={destinationsTooltip}>
			{translate('transaction_bar.destinations', {
				count: state.destinationCount,
			})}
		</span>
		{#if state.rejection}
			<span class="vaultman-transaction-bar-rejection">
				{translate('transaction_bar.rejected', {
					destination: state.rejection.destination,
					reason: state.rejection.reason,
				})}
			</span>
		{/if}
		<span class="vaultman-transaction-bar-spacer"></span>
		{#if state.moveKindAvailable}
			<CellAction
				actionId={TOGGLE_ID}
				placement="badge"
				toggle={{ on: state.moveKind === 'group' }}
				{resolve}
				{icon}
				{translate}
				onInvoke={() =>
					onToggleMoveKind(state.moveKind === 'node' ? 'group' : 'node')}
			/>
		{:else}
			<!-- Un hueco CON NOMBRE. Sin grupos proyectados no hay a donde mover,
			     y un conmutador que solo cambia una etiqueta se pulsa creyendo
			     que hace algo. Lo dice en vez de fingir. -->
			<span class="vaultman-transaction-bar-hint">
				{translate('transaction_bar.group_mode_unavailable')}
			</span>
		{/if}
	</div>
{/if}
