<script lang="ts">
	import { setIcon, setTooltip } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { IndexGroup } from '../../logic/logicIndexGroups';

	let {
		visible,
		groups,
		kind,
		kindToggle,
		drill,
		scoped,
		pickMode,
		onJump,
		onToggleKind,
		onEnterPick,
		onResetScope,
	}: {
		visible: boolean;
		groups: IndexGroup[];
		kind: 'files' | 'folders';
		kindToggle: boolean;
		drill: boolean;
		scoped: boolean;
		pickMode: boolean;
		onJump: (targetId: string) => void;
		onToggleKind: () => void;
		onEnterPick: () => void;
		onResetScope: () => void;
	} = $props();

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(next: string) {
				setIcon(el, next);
			},
		};
	}
	// Obsidian's native tooltip (no `title` attribute, which double-renders).
	function tooltip(el: HTMLElement, text: string) {
		setTooltip(el, text, { placement: 'left' });
		return {
			update(next: string) {
				setTooltip(el, next, { placement: 'left' });
			},
		};
	}

	const kindIcon = $derived(
		kind === 'folders' ? 'lucide-folder' : 'lucide-file',
	);
	const kindTitle = $derived(
		kind === 'folders'
			? translate('floating_toc.folders')
			: translate('floating_toc.files'),
	);
	const drillTitle = $derived(
		pickMode ? translate('floating_toc.pick') : translate('floating_toc.drill'),
	);
</script>

<!-- FTC-002+: kind toggle + scope drill as separate nodes, then glyph jumps. -->
{#if visible}
	<div class="vaultman-floating-toc-wrap">
		<nav
			class="vaultman-floating-toc"
			class:is-picking={pickMode}
			aria-label={translate('floating_toc.aria')}
		>
			{#if kindToggle}
				<button
					type="button"
					class="vaultman-floating-toc-toggle"
					aria-label={kindTitle}
					use:tooltip={kindTitle}
					onclick={onToggleKind}
				>
					<span class="vaultman-floating-toc-toggle-icon" use:icon={kindIcon}
					></span>
				</button>
			{/if}
			{#if drill}
				<button
					type="button"
					class="vaultman-floating-toc-drill"
					class:is-active={pickMode}
					aria-label={drillTitle}
					use:tooltip={drillTitle}
					onclick={onEnterPick}
				>
					<span
						class="vaultman-floating-toc-toggle-icon"
						use:icon={pickMode ? 'lucide-target' : 'lucide-list-tree'}
					></span>
				</button>
			{/if}
			{#if scoped}
				<button
					type="button"
					class="vaultman-floating-toc-reset"
					aria-label={translate('floating_toc.reset')}
					use:tooltip={translate('floating_toc.reset')}
					onclick={onResetScope}
				>
					<span use:icon={'lucide-corner-left-up'}></span>
				</button>
			{/if}
			{#each groups as group (group.key)}
				<button
					type="button"
					class="vaultman-floating-toc-item"
					aria-label={group.label}
					use:tooltip={group.label}
					onclick={() => onJump(group.firstId)}
				>
					{group.key}
				</button>
			{/each}
		</nav>
	</div>
{/if}
