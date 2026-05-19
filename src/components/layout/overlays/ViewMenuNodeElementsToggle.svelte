<script lang="ts">
	import type { ViewHostService } from '../../../services/serviceViewHost.svelte';
	import type { BadgeKindMask, NodeElementKind } from '../../../types/typeViewHost';

	let { service }: { service: ViewHostService } = $props();

	type SimpleNodeElementKind = Exclude<NodeElementKind, 'badges'>;

	const SIMPLE_KINDS: readonly SimpleNodeElementKind[] = [
		'icon',
		'label',
		'detail',
		'media',
		'actions',
	];
	const BADGE_KINDS: readonly (keyof BadgeKindMask)[] = [
		'ops',
		'filters',
		'warnings',
		'inherited',
		'counts',
	];

	const badgesAllOn = $derived(
		service.nodeElementMask.badges.ops &&
			service.nodeElementMask.badges.filters &&
			service.nodeElementMask.badges.warnings &&
			service.nodeElementMask.badges.inherited &&
			service.nodeElementMask.badges.counts,
	);
</script>

<div class="vm-node-elements-toggle">
	{#each SIMPLE_KINDS as kind (kind)}
		<label class="vm-node-elements-toggle-row">
			<input
				type="checkbox"
				checked={service.nodeElementMask[kind]}
				onchange={() => service.toggleElement(kind)}
			/>
			<span>{kind}</span>
		</label>
	{/each}

	<label class="vm-node-elements-toggle-row">
		<input
			type="checkbox"
			checked={badgesAllOn}
			onchange={() => service.toggleElement('badges')}
		/>
		<span>badges</span>
	</label>

	<div class="vm-node-elements-toggle-badges-group">
		{#each BADGE_KINDS as badgeKind (badgeKind)}
			<label class="vm-node-elements-toggle-row vm-indent-1">
				<input
					type="checkbox"
					checked={service.nodeElementMask.badges[badgeKind]}
					onchange={() => service.toggleBadgeKind(badgeKind)}
				/>
				<span>{badgeKind}</span>
			</label>
		{/each}
	</div>

	<button
		type="button"
		class="vm-node-elements-toggle-reset"
		onclick={() => service.resetOverrides()}
	>
		Reset
	</button>
</div>
