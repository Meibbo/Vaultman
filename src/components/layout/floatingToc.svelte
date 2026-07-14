<script lang="ts">
	import { translate } from '../../i18n/index';
	import {
		buildIndexGroups,
		type IndexNodeRef,
	} from '../../logic/logicIndexGroups';

	let {
		visible,
		revision,
		getNodes,
	}: {
		visible: boolean;
		revision: number;
		getNodes: () => IndexNodeRef[];
	} = $props();

	const groups = $derived.by(() => {
		void revision;
		if (!visible) return [];
		return buildIndexGroups(getNodes());
	});
</script>

<!-- FTC-001: static glyph rail; interactive jump controls land in FTC-002. -->
{#if visible && groups.length > 1}
	<div class="vaultman-floating-toc-wrap">
		<div
			class="vaultman-floating-toc"
			role="list"
			aria-label={translate('floating_toc.aria')}
		>
			{#each groups as group (group.key)}
				<span
					class="vaultman-floating-toc-item"
					role="listitem"
					title={group.label}
					aria-label={group.label}
				>
					{group.key}
				</span>
			{/each}
		</div>
	</div>
{/if}
