<script lang="ts">
	import { setIcon } from 'obsidian';
	import { translate } from '../../index/i18n/lang';
	import { describeFabBadge } from '../../badges/serviceBadge';
	import type { FabDef } from '../../types/typePrimitives';
	import {
		COMMAND_MOUSE_GESTURE_CONFIG,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';

	let {
		fab,
		side = 'left',
		queuedCount = 0,
		filterRuleCount = 0,
		mouseGestureConfig,
	}: {
		fab: FabDef | null;
		side?: 'left' | 'right' | 'center';
		queuedCount?: number;
		filterRuleCount?: number;
		mouseGestureConfig?: MouseGestureConfig;
	} = $props();

	const mouse = createMouseGestureService();
	$effect(() => () => mouse.cancelAll());

	function attachIcon(node: HTMLElement, iconName: string): { update: (n: string) => void } {
		setIcon(node, iconName);
		return { update: (n: string) => setIcon(node, n) };
	}

	function countForFab(target: FabDef | null): number {
		if (target?.badgeKind === 'queue') return queuedCount;
		if (target?.badgeKind === 'filters') return filterRuleCount;
		return 0;
	}

	const fabBadge = $derived(
		fab?.badgeKind ? describeFabBadge(fab.badgeKind, countForFab(fab), translate) : null,
	);
	const fabClick = $derived.by(() => makeFabClickHandler(fab));
	const fabAuxClick = $derived.by(() => makeFabAuxClickHandler(fab));

	function mouseConfigForFab(target: FabDef): MouseGestureConfig {
		return mergeMouseGestureConfig(
			COMMAND_MOUSE_GESTURE_CONFIG,
			{
				secondary: target.onDoubleClick ? 'double-click' : [],
				tertiary: target.onTertiaryClick ? ['alt-click', 'middle-click'] : [],
			},
			mouseGestureConfig,
		);
	}

	function makeFabClickHandler(target: FabDef | null): (e: MouseEvent) => void {
		if (!target) return () => {};
		return (e: MouseEvent) => {
			e.stopPropagation();
			mouse.handleClick(
				{ key: `fab:${side}`, eventTarget: e.target },
				e,
				{
					primary: () => target.action?.(),
					secondary: () => target.onDoubleClick?.(),
					tertiary: () => target.onTertiaryClick?.(),
				},
				mouseConfigForFab(target),
			);
		};
	}

	function makeFabAuxClickHandler(target: FabDef | null): (e: MouseEvent) => void {
		if (!target) return () => {};
		return (e: MouseEvent) => {
			e.stopPropagation();
			mouse.handleAuxClick(
				{ key: `fab:${side}`, eventTarget: e.target },
				e,
				{
					primary: () => target.action?.(),
					secondary: () => target.onDoubleClick?.(),
					tertiary: () => target.onTertiaryClick?.(),
				},
				mouseConfigForFab(target),
			);
		};
	}
</script>

{#if fab}
	<div class="vm-nav-fab-wrap" data-vm-fab-side={side}>
		<div
			class="vm-nav-fab"
			aria-label={fab.label}
			use:attachIcon={fab.icon}
			onclick={fabClick}
			onauxclick={fabAuxClick}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.stopPropagation();
					fab.action?.();
				}
			}}
			role="button"
			tabindex="0"
		></div>
		{#if fabBadge}
			<div
				class="vm-fab-badge"
				data-vm-badge-kind={fabBadge.kind}
				aria-label={fabBadge.label}
				title={fabBadge.title}
			>
				{fabBadge.text}
			</div>
		{/if}
	</div>
{:else}
	<div class="vm-nav-fab-placeholder" data-vm-fab-side={side}></div>
{/if}
