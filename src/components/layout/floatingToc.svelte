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

	// On the kind toggle a long-press enters the scope drill and a plain click
	// flips files↔folders; the hold suppresses the click that follows it.
	let pressTimer: number | null = null;
	let longPressed = false;
	function startPress() {
		if (!drill) return;
		longPressed = false;
		pressTimer = window.setTimeout(() => {
			longPressed = true;
			onEnterPick();
		}, 500);
	}
	function cancelPress() {
		if (pressTimer !== null) {
			window.clearTimeout(pressTimer);
			pressTimer = null;
		}
	}
	function onToggleClick() {
		if (longPressed) {
			longPressed = false;
			return;
		}
		onToggleKind();
	}

	const toggleIcon = $derived(
		pickMode
			? 'lucide-target'
			: kind === 'folders'
				? 'lucide-folder'
				: 'lucide-file',
	);
	const toggleTitle = $derived(
		pickMode
			? translate('floating_toc.pick')
			: kind === 'folders'
				? translate('floating_toc.folders')
				: translate('floating_toc.files'),
	);
	const drillTitle = $derived(
		pickMode ? translate('floating_toc.pick') : translate('floating_toc.drill'),
	);
</script>

<!-- FTC-002+: kind toggle / scope-drill control, then glyph jumps. -->
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
					class:is-active={pickMode}
					aria-label={toggleTitle}
					use:tooltip={toggleTitle}
					onpointerdown={startPress}
					onpointerup={cancelPress}
					onpointerleave={cancelPress}
					onclick={onToggleClick}
				>
					<span class="vaultman-floating-toc-toggle-icon" use:icon={toggleIcon}
					></span>
				</button>
			{:else if drill}
				<button
					type="button"
					class="vaultman-floating-toc-toggle"
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
