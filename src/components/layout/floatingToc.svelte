<script lang="ts">
	import { setIcon } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { IndexGroup } from '../../logic/logicIndexGroups';

	let {
		visible,
		groups,
		kind,
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

	// Long-press on the toggle enters scope-pick (a WIR→WAR gesture twin); a plain
	// click flips files↔folders. The hold suppresses the click that follows it.
	let pressTimer: number | null = null;
	let longPressed = false;
	function startPress() {
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
</script>

<!-- FTC-002+: toggle (files↔folders, long-press = scope drill) then glyph jumps. -->
{#if visible}
	<div class="vaultman-floating-toc-wrap">
		<nav
			class="vaultman-floating-toc"
			class:is-picking={pickMode}
			aria-label={translate('floating_toc.aria')}
		>
			<button
				type="button"
				class="vaultman-floating-toc-toggle"
				class:is-active={pickMode}
				title={toggleTitle}
				aria-label={toggleTitle}
				onpointerdown={startPress}
				onpointerup={cancelPress}
				onpointerleave={cancelPress}
				onclick={onToggleClick}
			>
				<span class="vaultman-floating-toc-toggle-icon" use:icon={toggleIcon}
				></span>
			</button>
			{#if scoped}
				<button
					type="button"
					class="vaultman-floating-toc-reset"
					title={translate('floating_toc.reset')}
					aria-label={translate('floating_toc.reset')}
					onclick={onResetScope}
				>
					<span use:icon={'lucide-corner-left-up'}></span>
				</button>
			{/if}
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
