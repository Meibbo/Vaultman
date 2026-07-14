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
		onJump,
	}: {
		visible: boolean;
		revision: number;
		getNodes: () => IndexNodeRef[];
		onJump: (targetId: string) => void;
	} = $props();

	const groups = $derived.by(() => {
		void revision;
		if (!visible) return [];
		return buildIndexGroups(getNodes());
	});
</script>

<!-- FTC-002: each glyph jumps the active explorer to its group's first node. -->
{#if visible && groups.length > 1}
	<div class="vaultman-floating-toc-wrap">
		<nav
			class="vaultman-floating-toc"
			aria-label={translate('floating_toc.aria')}
		>
			{#each groups as group (group.key)}
				<button
					type="button"
					class="vaultman-floating-toc-item"
					title={group.label}
					aria-label={group.label}
					onclick={() => onJump(group.firstId)}
				>
					{group.key}
				</button>
			{/each}
		</nav>
	</div>
{/if}
