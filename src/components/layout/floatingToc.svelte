<script lang="ts">
	import { setIcon, setTooltip } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { IndexGroup } from '../../logic/logicIndexGroups';

	export interface NiagaraOptions {
		nodes: boolean;
		plainStyle: boolean;
		position: 'right' | 'left' | 'top' | 'bottom';
		glyphMode: 'letter' | 'name';
		labelMode: 'off' | 'selected' | 'scrub' | 'always';
		reveal: 'selected' | 'near' | 'wide' | 'all';
		glow: boolean;
		nameOrder: 'down' | 'up' | 'flat';
		namePill: boolean;
	}

	let {
		visible,
		groups,
		kind,
		kindToggle,
		drill,
		scoped,
		pickMode,
		niagara,
		opts,
		onJump,
		onToggleKind,
		onEnterPick,
		onClose,
		onBack,
	}: {
		visible: boolean;
		groups: IndexGroup[];
		kind: 'files' | 'folders';
		kindToggle: boolean;
		drill: boolean;
		scoped: boolean;
		pickMode: boolean;
		niagara: boolean;
		opts: NiagaraOptions;
		onJump: (targetId: string) => void;
		onToggleKind: () => void;
		onEnterPick: () => void;
		onClose: () => void;
		onBack: () => void;
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

	const horizontal = $derived(
		opts.position === 'top' || opts.position === 'bottom',
	);
	const dir = $derived(
		opts.position === 'right' || opts.position === 'bottom' ? -1 : 1,
	);
	const NIA_REVEAL = { selected: 1.1, near: 2.2, wide: 3.6, all: 7 } as const;

	// ─── Niagara scrub state ────────────────────────────────────────────────────
	let scrubbing = $state(false);
	let activeIdx = $state(-1);
	let perp = $state(0); // perpendicular pull toward the finger
	let perpOver = $state(0); // rail-follow overshoot past the frame edge
	let shift = $state(0); // off-side drag-follow (monotonic high-water mark)
	let glowX = $state(0);
	let glowY = $state(0);
	let engaged = $state(false); // wave only forms after a hold / small move
	let shiftHWM = 0;
	let downAt = { t: 0, x: 0, y: 0 };
	let holdTimer: number | null = null;
	const glyphEls: HTMLElement[] = [];
	let railEl: HTMLElement | undefined = $state();
	let trackEl: HTMLElement | undefined = $state();

	function idxFromPointer(cx: number, cy: number): number {
		let best = -1;
		let bestD = Infinity;
		for (let i = 0; i < groups.length; i++) {
			const el = glyphEls[i];
			if (!el) continue;
			const r = el.getBoundingClientRect();
			const center = horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
			const along = horizontal ? cx : cy;
			const d = Math.abs(along - center);
			if (d < bestD) {
				bestD = d;
				best = i;
			}
		}
		return best;
	}
	function handleAt(cx: number, cy: number) {
		const rail = railEl;
		const track = trackEl;
		if (rail) {
			const r = rail.getBoundingClientRect();
			let p: number;
			if (opts.position === 'right') p = r.right - cx;
			else if (opts.position === 'left') p = cx - r.left;
			else if (opts.position === 'top') p = cy - r.top;
			else p = r.bottom - cy;
			const host = rail.offsetParent ?? rail.parentElement;
			let over = 0;
			let hr: DOMRect | null = null;
			if (host instanceof HTMLElement) {
				hr = host.getBoundingClientRect();
				const cap = (horizontal ? hr.height : hr.width) - 54;
				const raw = Math.max(0, p);
				p = Math.min(raw, Math.max(40, cap));
				over = Math.max(0, raw - Math.max(40, cap));
			}
			perpOver = engaged ? over : 0;
			perp = engaged ? Math.max(0, p) : 0;
			glowX = horizontal ? cx - r.left : opts.position === 'left' ? 0 : r.width;
			glowY = horizontal
				? opts.position === 'top'
					? 0
					: r.height
				: cy - r.top;
			if (track) {
				const band = horizontal ? track.scrollWidth : track.scrollHeight;
				const centerAlong = horizontal
					? r.left + r.width / 2
					: r.top + r.height / 2;
				const lastN = centerAlong + band / 2;
				const along = horizontal ? cx : cy;
				const frameEnd = hr
					? (horizontal ? hr.right : hr.bottom) - 8
					: lastN + 9999;
				const room = Math.max(0, frameEnd - lastN);
				const want = Math.max(0, Math.min(along - lastN, room));
				shiftHWM = Math.max(shiftHWM, want);
				shift = shiftHWM;
			}
		}
		const i = idxFromPointer(cx, cy);
		if (i < 0) return;
		if (i !== activeIdx) {
			activeIdx = i;
			if (navigator.vibrate) navigator.vibrate(3);
		}
		onJump(groups[i].firstId);
	}
	function onPointerMove(ev: PointerEvent) {
		ev.preventDefault();
		if (
			!engaged &&
			Math.abs(ev.clientX - downAt.x) + Math.abs(ev.clientY - downAt.y) > 6
		)
			engaged = true;
		handleAt(ev.clientX, ev.clientY);
	}
	function endScrub() {
		if (holdTimer !== null) {
			window.clearTimeout(holdTimer);
			holdTimer = null;
		}
		scrubbing = false;
		activeIdx = -1;
		perp = 0;
		perpOver = 0;
		shift = 0;
		shiftHWM = 0;
		engaged = false;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', endScrub);
	}
	function onScrubDown(ev: PointerEvent) {
		if (!niagara || ev.button !== 0) return;
		scrubbing = true;
		engaged = false;
		shiftHWM = 0;
		downAt = { t: Date.now(), x: ev.clientX, y: ev.clientY };
		holdTimer = window.setTimeout(() => {
			engaged = true;
		}, 150);
		handleAt(ev.clientX, ev.clientY);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', endScrub);
	}

	// ─── Niagara wave (Gaussian bell, fixed σ) ──────────────────────────────────
	const sigma = $derived(Math.min(7, Math.max(3, (groups.length || 1) * 0.28)));
	function gauss(d: number): number {
		return Math.exp(-(d * d) / (2 * sigma * sigma));
	}
	function scaleFor(i: number): number {
		return activeIdx < 0 ? 1 : 1 + 0.5 * gauss(Math.abs(i - activeIdx));
	}
	function offsetFor(i: number): number {
		return activeIdx < 0 ? 0 : dir * perp * gauss(Math.abs(i - activeIdx));
	}
	function spreadFor(i: number): number {
		return activeIdx < 0
			? 0
			: 7 * Math.tanh((i - activeIdx) / 1.5) * gauss(Math.abs(i - activeIdx));
	}
	function glyphTransform(i: number): string {
		if (!niagara || !scrubbing) return '';
		const off = offsetFor(i);
		const spr = spreadFor(i);
		const sc = scaleFor(i);
		return horizontal
			? `transform: translate(${spr}px, ${off}px) scale(${sc})`
			: `transform: translate(${off}px, ${spr}px) scale(${sc})`;
	}
	// Control nodes sit just before glyph 0; with the nodes option they ride the
	// same wave (their "index" is negative), else they stay put.
	function nodeTransform(slot: number): string {
		if (!niagara || !scrubbing || !opts.nodes || activeIdx < 0) return '';
		return `transform: scale(${scaleFor(slot)})`;
	}

	const revealR = $derived(NIA_REVEAL[opts.reveal] ?? NIA_REVEAL.all);
	function nameAlphaFor(i: number): number {
		if (scrubbing && activeIdx >= 0 && engaged)
			return Math.max(0.05, 1 - Math.abs(i - activeIdx) / revealR);
		return opts.labelMode === 'always' ? 0.85 : 0;
	}
	function showName(i: number): boolean {
		if (opts.glyphMode === 'name' || opts.labelMode === 'off') return false;
		if (opts.labelMode === 'selected') return scrubbing && i === activeIdx;
		if (opts.labelMode === 'always') return true;
		return scrubbing && engaged && nameAlphaFor(i) > 0.04;
	}
	function nameLetters(g: IndexGroup): string[] {
		const name = (g.firstLabel || '').replace(/^[#=]\s*/, '').trim();
		const letters = Array.from(opts.nameOrder === 'flat' ? name : name);
		return opts.nameOrder === 'up' ? letters.slice().reverse() : letters;
	}
	const trackShift = $derived(
		horizontal
			? `translateX(${shift}px) translateY(${dir * perpOver}px)`
			: `translateY(${shift}px) translateX(${dir * perpOver}px)`,
	);
</script>

<!-- Niagara-capable floating TOC: kind toggle + scope drill nodes, then glyphs. -->
{#if visible}
	<div
		class="vaultman-floating-toc-wrap pos-{opts.position}"
		class:is-horizontal={horizontal}
	>
		<nav
			bind:this={railEl}
			class="vaultman-floating-toc"
			class:is-picking={pickMode}
			class:is-scrubbing={scrubbing}
			class:is-plain={opts.plainStyle}
			class:has-glow={opts.glow}
			class:name-pill={opts.namePill}
			aria-label={translate('floating_toc.aria')}
		>
			{#if niagara && opts.glow}
				<div
					class="vaultman-floating-toc-glow"
					style="left: {glowX}px; top: {glowY}px"
				></div>
			{/if}
			<button
				type="button"
				class="vaultman-floating-toc-close"
				aria-label={translate('floating_toc.close')}
				use:tooltip={translate('floating_toc.close')}
				onclick={onClose}
			>
				<span use:icon={'lucide-x'}></span>
			</button>
			{#if kindToggle}
				<button
					type="button"
					class="vaultman-floating-toc-toggle"
					aria-label={kindTitle}
					use:tooltip={kindTitle}
					style={nodeTransform(-2)}
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
					style={nodeTransform(-1)}
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
					class="vaultman-floating-toc-back"
					aria-label={translate('floating_toc.back')}
					use:tooltip={translate('floating_toc.back')}
					onclick={onBack}
				>
					<span use:icon={'lucide-corner-left-up'}></span>
				</button>
			{/if}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				bind:this={trackEl}
				class="vaultman-floating-toc-glyphs"
				class:is-niagara={niagara}
				style="transform: {trackShift}; transition: {scrubbing
					? 'none'
					: 'transform 0.2s ease'}"
				onpointerdown={onScrubDown}
			>
				{#each groups as group, i (group.key)}
					<button
						type="button"
						class="vaultman-floating-toc-item"
						class:is-scrub-active={scrubbing && i === activeIdx}
						bind:this={glyphEls[i]}
						aria-label={group.label}
						use:tooltip={group.label}
						style={glyphTransform(i)}
						onclick={() => onJump(group.firstId)}
					>
						{#if opts.glyphMode === 'name'}
							<span class="vaultman-floating-toc-fullname"
								>{group.firstLabel}</span
							>
						{:else}
							<span class="vaultman-floating-toc-cell-glyph">{group.key}</span>
							{#if niagara && showName(i)}
								<span
									class="vaultman-floating-toc-cell-name"
									class:is-vertical={opts.nameOrder !== 'flat'}
									style="opacity: {nameAlphaFor(i)}"
								>
									{#if opts.nameOrder === 'flat'}
										{group.firstLabel}
									{:else}
										{#each nameLetters(group) as ch, k (k)}
											<span class="vaultman-floating-toc-vletter"
												>{ch === ' ' ? ' ' : ch}</span
											>
										{/each}
									{/if}
								</span>
							{/if}
						{/if}
					</button>
				{/each}
			</div>
		</nav>
	</div>
{/if}
