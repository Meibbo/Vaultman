<script lang="ts">
	import type { NodeBadge } from '../../types/typeNode';
	import {
		nodeBadgeAriaLabel,
		nodeBadgeIsActionable,
		nodeBadgeKey,
		nodeBadgeTitle,
	} from './nodeBadgeHelpers';

	type IconAction = (node: HTMLElement, name: string) => { update(n: string): void };

	interface Props {
		/** Badges to render in this cluster (already mask-filtered by the caller). */
		badges: readonly NodeBadge[];
		/** Inherited (child) clusters annotate their title/aria and carry `is-inherited`. */
		inherited?: boolean;
		icon: IconAction;
		onPress: (event: MouseEvent | KeyboardEvent, badge: NodeBadge) => void;
		onKeydown: (event: KeyboardEvent, badge: NodeBadge) => void;
	}

	let { badges, inherited = false, icon, onPress, onKeydown }: Props = $props();
</script>

<!--
	NodeBadgeZone — the shared `vm-badge` atom list (N.R). This markup was duplicated
	verbatim across the tree / table / grid / cards cells; it now lives here once.
	It renders NO wrapper, so each view drops it inside its own zone element and keeps
	its existing layout/CSS. `data-vm-badge` is the stable headless hook; the `vm-badge*`
	classes are the current (vaultman-preset) class vocabulary (D-PSS-2).
-->
{#each badges as badge, badgeIndex (nodeBadgeKey(badge, badgeIndex))}
	<div
		class="vm-badge"
		role="button"
		data-vm-badge
		class:is-solid={badge.solid}
		class:is-inherited={inherited && badge.isInherited}
		class:is-undoable={badge.queueIndex !== undefined}
		class:is-actionable={nodeBadgeIsActionable(badge)}
		class:is-quick-action={badge.quickAction}
		class:vm-badge--red={badge.solid && badge.color === 'red'}
		class:vm-badge--blue={badge.solid && badge.color === 'blue'}
		class:vm-badge--purple={badge.solid && badge.color === 'purple'}
		class:vm-badge--orange={badge.solid && badge.color === 'orange'}
		class:vm-badge--green={badge.solid && badge.color === 'green'}
		title={nodeBadgeTitle(badge, inherited)}
		aria-label={nodeBadgeAriaLabel(badge, inherited)}
		tabindex={nodeBadgeIsActionable(badge) ? 0 : -1}
		onclick={(e) => onPress(e, badge)}
		onkeydown={(e) => onKeydown(e, badge)}
	>
		{#if badge.icon}
			<span class="vm-badge-icon" use:icon={badge.icon}></span>
		{/if}
	</div>
{/each}
