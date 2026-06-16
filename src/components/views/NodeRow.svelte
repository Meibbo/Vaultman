<script lang="ts" module>
	/**
	 * Per-view class vocabulary for the cell slots (D-PSS-2: `data-vm-*` is the
	 * stable headless identity; class names are the per-preset/per-view vocabulary).
	 * Defaults below are the tree vocabulary — the N.R pilot view. Other engines
	 * (grid/table/cards) pass their own vocab as they adopt NodeRow.
	 */
	export interface NodeRowVocab {
		surface: string;
		icon: string;
		label: string;
		labelPrefix: string;
		fieldZone: string;
		field: string;
		count: string;
		editInput: string;
		badgeZone: string;
		overlayZone: string;
		hoverZone: string;
		childIndicator: string;
		childDot: string;
		childPill: string;
	}

	export const TREE_NODE_ROW_VOCAB: NodeRowVocab = {
		surface: 'vm-tree-row-surface',
		icon: 'vm-tree-icon',
		label: 'vm-tree-label',
		labelPrefix: 'vm-tree-label-prefix',
		fieldZone: 'vm-tree-field-zone',
		field: 'vm-tree-field',
		count: 'vm-tree-count',
		editInput: 'vm-tree-input',
		badgeZone: 'vm-tree-badge-zone',
		overlayZone: 'vm-tree-overlay-badge-zone',
		hoverZone: 'vm-tree-hover-badge-zone',
		childIndicator: 'vm-tree-child-badge-indicator',
		childDot: 'vm-tree-child-badge-dot',
		childPill: 'vm-tree-child-badge-pill',
	};
</script>

<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { NodeBadge } from '../../types/typeNode';
	import type { BadgeDescriptor, BadgeKind } from '../../badges/serviceBadge';
	import type { NativeClassVocabulary } from '../../services/serviceExplorerViewContract';
	import type { DndViewState } from '../../services/serviceDnd';
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import HighlightText from '../primitives/HighlightText.svelte';
	import NodeBadgeZone from './NodeBadgeZone.svelte';

	type IconAction = (node: HTMLElement, name: string) => { update(n: string): void };
	type HighlightRanges = ComponentProps<typeof HighlightText>['ranges'];

	interface NodeRowField {
		id: string;
		text: string;
	}

	interface Props {
		// ---- content ----
		label: string;
		labelPrefix?: string;
		highlights?: HighlightRanges;
		iconName?: string;
		fields?: readonly NodeRowField[];
		count?: number | null;
		countLabel?: string | null;
		showLabel?: boolean;
		// ---- inline edit ----
		editing?: boolean;
		onRename?: (value: string) => void;
		onCancelRename?: () => void;
		// ---- badges ----
		directBadges?: readonly NodeBadge[];
		childBadges?: readonly NodeBadge[];
		hoverBadges?: readonly BadgeDescriptor[];
		childBadgeTitle?: string;
		onBadgePress?: (event: MouseEvent | KeyboardEvent, badge: NodeBadge) => void;
		onBadgeKeydown?: (event: KeyboardEvent, badge: NodeBadge) => void;
		onHoverBadgePress?: (event: MouseEvent | KeyboardEvent, kind: BadgeKind) => void;
		onHoverBadgeKeydown?: (event: KeyboardEvent, kind: BadgeKind) => void;
		// ---- state ----
		isSelected?: boolean;
		isFocused?: boolean;
		isActiveFilter?: boolean;
		isWarning?: boolean;
		isHighlighted?: boolean;
		hasToggle?: boolean;
		isExpandedParent?: boolean;
		dndState?: DndViewState;
		// ---- theming ----
		nativeVocab?: NativeClassVocabulary | null;
		vocab?: NodeRowVocab;
		// ---- slots ----
		icon: IconAction;
		/** Leading affordance (tree: indent guides + caret/toggle). View-supplied. */
		leading?: Snippet;
		/** Abanico slots — defined by the contract, unwired by the tree pilot (Q1). */
		media?: Snippet;
		contentSnippet?: Snippet;
		metric?: Snippet;
		trailing?: Snippet;
	}

	let {
		label,
		labelPrefix,
		highlights = [],
		iconName,
		fields = [],
		count = null,
		countLabel = null,
		showLabel = true,
		editing = false,
		onRename,
		onCancelRename,
		directBadges = [],
		childBadges = [],
		hoverBadges = [],
		childBadgeTitle = '',
		onBadgePress,
		onBadgeKeydown,
		onHoverBadgePress,
		onHoverBadgeKeydown,
		isSelected = false,
		isFocused = false,
		isActiveFilter = false,
		isWarning = false,
		isHighlighted = false,
		hasToggle = false,
		isExpandedParent = false,
		dndState,
		nativeVocab = null,
		vocab = TREE_NODE_ROW_VOCAB,
		icon,
		leading,
		media,
		contentSnippet,
		metric,
		trailing,
	}: Props = $props();

	const stateClass = $derived(
		stateModEmissions(nativeVocab, {
			isSelected,
			isFocused,
			isActive: isActiveFilter,
			isDragSource: dndState?.dragging === true,
			isDropTarget: dndState?.dropTarget === true,
			hasActiveMenu: false,
		}).join(' '),
	);
	const hasIcon = $derived(Boolean(iconName));
	const hasCount = $derived(Boolean(countLabel) || (typeof count === 'number' && count > 0));
	const hasOverlayBadges = $derived(
		directBadges.length > 0 || childBadges.length > 0 || hoverBadges.length > 0,
	);
	const hasActiveBadges = $derived(
		hasActiveRowBadge(directBadges) || hasActiveRowBadge(childBadges),
	);

	function hasActiveRowBadge(badges: readonly NodeBadge[]): boolean {
		return badges.some(
			(badge) => badge.queueIndex !== undefined || (badge.solid && !badge.quickAction),
		);
	}

	function handleInputKeydown(e: KeyboardEvent, inputEl: HTMLInputElement) {
		if (e.key === 'Enter') {
			e.stopPropagation();
			onRename?.(inputEl.value);
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			onCancelRename?.();
		}
	}

	function focus(el: HTMLInputElement) {
		el.focus();
		el.select();
	}

	function noopBadgePress(): void {}
	function noopBadgeKeydown(): void {}
</script>

<div
	class={[vocab.surface, nativeVocab?.innerWrapper, stateClass].filter(Boolean).join(' ')}
	data-vm-node-row
	class:is-active-filter={isActiveFilter}
	class:is-selected={isSelected}
	class:is-focused={isFocused}
	class:vm-badge-warning={isWarning}
	class:vm-search-highlight={isHighlighted}
	class:is-editing={editing}
	class:has-toggle={hasToggle}
	class:has-icon={hasIcon}
	class:has-count={hasCount}
	class:has-overlay-badges={hasOverlayBadges}
	class:is-expanded-parent={hasToggle && isExpandedParent}
>
	{#if media}{@render media()}{/if}

	{#if leading}{@render leading()}{/if}

	{#if hasIcon}
		<span class={vocab.icon} use:icon={iconName!} data-vm-icon></span>
	{/if}

	{#if editing}
		<input
			class={vocab.editInput}
			value={label}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => handleInputKeydown(e, e.currentTarget)}
			onblur={() => onCancelRename?.()}
			use:focus
		/>
	{:else if showLabel}
		<span class={[vocab.label, nativeVocab?.primaryLabel].filter(Boolean).join(' ')} data-vm-label>
			{#if labelPrefix}<span class={vocab.labelPrefix}>{labelPrefix}</span>{/if}<HighlightText
				text={label}
				ranges={highlights}
			/>
		</span>
	{/if}

	{#if contentSnippet}{@render contentSnippet()}{/if}

	{#if fields.length > 0}
		<div class={vocab.fieldZone} data-vm-fields>
			{#each fields as field (field.id)}
				<span class={vocab.field} data-node-field={field.id}>{field.text}</span>
			{/each}
		</div>
	{/if}

	{#if metric}{@render metric()}{/if}

	{#if hasCount || hasOverlayBadges}
		<div class={vocab.badgeZone} class:has-count={hasCount} class:has-overlay-badges={hasOverlayBadges}>
			{#if hasOverlayBadges}
				<div class={vocab.overlayZone} class:has-active-badges={hasActiveBadges} data-vm-badges>
					{#if hoverBadges.length > 0}
						<div class={vocab.hoverZone}>
							{#each hoverBadges as badge (badge.kind)}
								<div
									class="vm-badge is-hover-badge is-actionable"
									data-vm-badge
									data-hover-kind={badge.kind}
									role="button"
									tabindex="0"
									title={badge.label}
									aria-label={badge.label}
									onclick={(e) => onHoverBadgePress?.(e, badge.kind)}
									onkeydown={(e) => onHoverBadgeKeydown?.(e, badge.kind)}
								>
									<span class="vm-badge-icon" use:icon={badge.icon}></span>
								</div>
							{/each}
						</div>
					{/if}

					<NodeBadgeZone
						badges={directBadges}
						{icon}
						onPress={onBadgePress ?? noopBadgePress}
						onKeydown={onBadgeKeydown ?? noopBadgeKeydown}
					/>

					{#if childBadges.length > 0}
						<div class={vocab.childIndicator} title={childBadgeTitle}>
							<span class={vocab.childDot}></span>
							<div class={vocab.childPill}>
								<NodeBadgeZone
									badges={childBadges}
									inherited
									{icon}
									onPress={onBadgePress ?? noopBadgePress}
									onKeydown={onBadgeKeydown ?? noopBadgeKeydown}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if countLabel}
				<span class={vocab.count} data-vm-count>{countLabel}</span>
			{:else if count != null && count > 0}
				<span class={vocab.count} data-vm-count>{count}</span>
			{/if}
		</div>
	{/if}

	{#if trailing}{@render trailing()}{/if}
</div>
