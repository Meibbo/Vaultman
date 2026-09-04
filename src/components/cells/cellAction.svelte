<script lang="ts">
	/**
	 * U130-05: LA celda de accion. Una sola, hospedable en cualquier placement.
	 *
	 * ADR 0005: un badge es un PLACEMENT que hospeda una status-cell o un
	 * action-node. Por eso `placement` es un slot y no una identidad: la celda
	 * es la misma en el searchbox y en el explorer, y lo unico que cambia es el
	 * chrome y como la nutre la Scene.
	 *
	 * La etiqueta y el icono se resuelven por `actionId` contra SASI. Pasarlos
	 * como props sueltas daria dos fuentes de verdad que se desincronizan.
	 */
	import type { SasiNode } from '../../services/serviceSasiProvider';

	interface Props {
		actionId: string;
		/** El slot, no la entidad. */
		placement?: 'badge' | 'inline';
		/** Lo unico que el del searchbox anadia de mas. */
		toggle?: { on: boolean } | null;
		resolve: (id: string) => SasiNode | null;
		icon: (el: HTMLElement, name: string) => unknown;
		onInvoke?: (id: string) => void;
		translate: (key: string) => string;
	}

	let {
		actionId,
		placement = 'inline',
		toggle = null,
		resolve,
		icon,
		onInvoke,
		translate,
	}: Props = $props();

	const node = $derived(resolve(actionId));
	const label = $derived(node ? translate(node.labelKey) : actionId);
	// Retirada o de un plugin desactivado: se queda VISIBLE y reparable.
	const available = $derived(node !== null);
</script>

<button
	type="button"
	class="vaultman-action-cell"
	class:vaultman-action-cell--badge={placement === 'badge'}
	class:vaultman-action-cell--inline={placement === 'inline'}
	class:is-active={toggle?.on === true}
	class:is-unavailable={!available}
	disabled={!available}
	aria-label={label}
	aria-pressed={toggle ? toggle.on : undefined}
	title={label}
	use:icon={node?.icon ?? 'lucide-circle-help'}
	onclick={() => available && onInvoke?.(actionId)}
></button>
