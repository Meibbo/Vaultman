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
		niagara,
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
		niagara: boolean;
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

	// ─── Niagara scrub (off-default option): drag along the rail to magnify the
	// glyph under the pointer and live-jump to its group. ───────────────────────
	let scrubbing = $state(false);
	let activeIdx = $state(-1);
	const glyphEls: HTMLElement[] = [];

	function idxFromY(clientY: number): number {
		let best = -1;
		let bestDist = Infinity;
		for (let i = 0; i < groups.length; i++) {
			const el = glyphEls[i];
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const dist = Math.abs(clientY - (rect.top + rect.height / 2));
			if (dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		}
		return best;
	}
	function scrubTo(clientY: number) {
		const i = idxFromY(clientY);
		if (i >= 0 && i !== activeIdx) {
			activeIdx = i;
			onJump(groups[i].firstId);
		}
	}
	function scrubStart(event: PointerEvent) {
		if (!niagara || event.button !== 0) return;
		scrubbing = true;
		activeIdx = -1;
		scrubTo(event.clientY);
	}
	function scrubMove(event: PointerEvent) {
		if (scrubbing) scrubTo(event.clientY);
	}
	function scrubEnd() {
		scrubbing = false;
		activeIdx = -1;
	}
	// Gaussian magnify wave around the active glyph.
	function scaleFor(i: number): number {
		if (!scrubbing || activeIdx < 0) return 1;
		const d = i - activeIdx;
		return 1 + 0.8 * Math.exp(-(d * d) / (2 * 1.3 * 1.3));
	}
</script>

<!-- FTC-002+: kind toggle + scope drill nodes, then (static or Niagara-scrub) glyphs. -->
{#if visible}
	<div class="vaultman-floating-toc-wrap">
		<nav
			class="vaultman-floating-toc"
			class:is-picking={pickMode}
			class:is-scrubbing={scrubbing}
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
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="vaultman-floating-toc-glyphs"
				class:is-niagara={niagara}
				onpointerdown={scrubStart}
				onpointermove={scrubMove}
				onpointerup={scrubEnd}
				onpointerleave={scrubEnd}
			>
				{#each groups as group, i (group.key)}
					<button
						type="button"
						class="vaultman-floating-toc-item"
						class:is-scrub-active={scrubbing && i === activeIdx}
						bind:this={glyphEls[i]}
						aria-label={group.label}
						use:tooltip={group.label}
						style={niagara && scrubbing
							? `transform: scale(${scaleFor(i)})`
							: ''}
						onclick={() => onJump(group.firstId)}
					>
						{group.key}
					</button>
				{/each}
			</div>
		</nav>
	</div>
{/if}
