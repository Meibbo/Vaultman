<script lang="ts">
	import { setIcon, setTooltip } from 'obsidian';
	import { translate } from '../../i18n/index';
	import {
		normalizeGlyphColorChoice,
		rainbowGlyphColor,
		resolveGlyphColorCss,
	} from '../../logic/logicGlyphColor';
	import type { IndexGroup } from '../../logic/logicIndexGroups';
	import {
		niagaraActionOrder,
		niagaraClampToFrame,
		niagaraPullSplit,
		NIAGARA_ENGAGE_HOLD_MS,
		NIAGARA_ENGAGE_MOVE_PX,
		niagaraNodeTransform,
		niagaraTrackShift,
		niagaraTrackTarget,
		shouldSuppressNiagaraClick,
	} from '../../logic/logicNiagaraTrack';
	import type { NiagaraActionId } from '../../logic/logicNiagaraTrack';

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
		/** D45: anchor the rail body and stretch the bell instead of sliding. */
		stretch?: boolean;
		/** BT5-025: shared glyph color choice. */
		glyphColor?: string;
		/** BT5-025: persisted hex when glyphColor is 'custom'. */
		glyphCustomColor?: string;
		/** BT4-021: color applies only while static, or always. */
		glyphColorMode?: 'static' | 'always';
	}

	export type FloatingTocActionId = NiagaraActionId;

	type FloatingTocTrackTarget =
		| { kind: 'action'; actionId: FloatingTocActionId }
		| { kind: 'group'; groupIndex: number };

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
	const actionIds = $derived(niagaraActionOrder({ kindToggle, drill, scoped }));

	function actionClass(actionId: FloatingTocActionId): string {
		switch (actionId) {
			case 'close':
				return 'vaultman-floating-toc-close';
			case 'toggle-kind':
				return 'vaultman-floating-toc-toggle';
			case 'drill':
				return 'vaultman-floating-toc-drill';
			case 'back':
				return 'vaultman-floating-toc-back';
		}
	}
	function actionIcon(actionId: FloatingTocActionId): string {
		switch (actionId) {
			case 'close':
				return 'lucide-x';
			case 'toggle-kind':
				return kindIcon;
			case 'drill':
				return pickMode ? 'lucide-target' : 'lucide-list-tree';
			case 'back':
				return 'lucide-corner-left-up';
		}
	}
	function actionTitle(actionId: FloatingTocActionId): string {
		switch (actionId) {
			case 'close':
				return translate('floating_toc.close');
			case 'toggle-kind':
				return kindTitle;
			case 'drill':
				return drillTitle;
			case 'back':
				return translate('floating_toc.back');
		}
	}
	function invokeAction(actionId: FloatingTocActionId): void {
		switch (actionId) {
			case 'close':
				onClose();
				break;
			case 'toggle-kind':
				onToggleKind();
				break;
			case 'drill':
				onEnterPick();
				break;
			case 'back':
				onBack();
				break;
		}
	}

	const horizontal = $derived(
		opts.position === 'top' || opts.position === 'bottom',
	);
	const dir = $derived(
		opts.position === 'right' || opts.position === 'bottom' ? -1 : 1,
	);
	const trackEntryCount = $derived(
		groups.length + (opts.nodes ? actionIds.length : 0),
	);
	const NIA_REVEAL = { selected: 1.1, near: 2.2, wide: 3.6, all: 7 } as const;

	// ─── Niagara scrub state ────────────────────────────────────────────────────
	let scrubbing = $state(false);
	let activeIdx = $state(-1);
	let perp = $state(0); // perpendicular pull toward the finger
	let perpOver = $state(0); // rail-follow overshoot past the frame edge
	let shift = $state(0); // bidirectional rail-follow displacement with reversal hysteresis
	let glowX = $state(0);
	let glowY = $state(0);
	let engaged = $state(false); // wave follows after a hold / deliberate move
	let downAt = { x: 0, y: 0 };
	let downTargetKind: FloatingTocTrackTarget['kind'] | null = null;
	let gestureMoved = false;
	let lastJumpedGroupIndex = -1;
	let suppressNextTrackClick = false;
	let holdTimer: number | null = null;
	let clickResetTimer: number | null = null;
	const trackEls: Array<HTMLElement | undefined> = [];
	let railEl: HTMLElement | undefined = $state();

	function registerTrackEntry(el: HTMLElement, trackIndex: number) {
		let currentIndex = -1;
		const register = (nextIndex: number) => {
			if (currentIndex >= 0 && trackEls[currentIndex] === el) {
				trackEls[currentIndex] = undefined;
			}
			currentIndex = nextIndex;
			if (currentIndex >= 0) trackEls[currentIndex] = el;
		};
		register(trackIndex);
		return {
			update: register,
			destroy() {
				if (currentIndex >= 0 && trackEls[currentIndex] === el) {
					trackEls[currentIndex] = undefined;
				}
			},
		};
	}

	function groupTrackIndex(groupIndex: number): number {
		return (opts.nodes ? actionIds.length : 0) + groupIndex;
	}
	function targetForTrackIndex(index: number): FloatingTocTrackTarget | null {
		const target = niagaraTrackTarget(
			index,
			opts.nodes ? actionIds.length : 0,
			groups.length,
		);
		if (target?.kind === 'action') {
			const actionId = actionIds[target.actionIndex];
			return actionId ? { kind: 'action', actionId } : null;
		}
		return target;
	}
	function indexFromPointer(cx: number, cy: number): number {
		let best = -1;
		let bestDistance = Infinity;
		const along = horizontal ? cx : cy;
		for (let i = 0; i < trackEntryCount; i++) {
			const el = trackEls[i];
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const center = horizontal
				? rect.left + rect.width / 2
				: rect.top + rect.height / 2;
			const distance = Math.abs(along - center);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = i;
			}
		}
		return best;
	}
	function updateTrackShift(
		cx: number,
		cy: number,
		hostRect: DOMRect | null,
	): void {
		const first = trackEls[0];
		const last = trackEls[trackEntryCount - 1];
		if (!engaged || !first || !last) {
			shift = 0;
			return;
		}

		const firstRect = first.getBoundingClientRect();
		const lastRect = last.getBoundingClientRect();
		const firstSpread =
			activeIdx < 0
				? 0
				: niagaraNodeTransform(-activeIdx, trackEntryCount, dir, perp).spread;
		const lastSpread =
			activeIdx < 0
				? 0
				: niagaraNodeTransform(
						trackEntryCount - 1 - activeIdx,
						trackEntryCount,
						dir,
						perp,
					).spread;
		const firstCenter =
			(horizontal
				? firstRect.left + firstRect.width / 2
				: firstRect.top + firstRect.height / 2) -
			shift -
			firstSpread;
		const lastCenter =
			(horizontal
				? lastRect.left + lastRect.width / 2
				: lastRect.top + lastRect.height / 2) -
			shift -
			lastSpread;
		const along = horizontal ? cx : cy;
		const constrainedAlong = hostRect
			? niagaraClampToFrame(
					along,
					(horizontal ? hostRect.left : hostRect.top) + 8,
					(horizontal ? hostRect.right : hostRect.bottom) - 8,
				)
			: along;
		shift = niagaraTrackShift(constrainedAlong, firstCenter, lastCenter, shift);
	}
	function handleAt(cx: number, cy: number): void {
		const rail = railEl;
		if (rail) {
			const rect = rail.getBoundingClientRect();
			let pull: number;
			if (opts.position === 'right') pull = rect.right - cx;
			else if (opts.position === 'left') pull = cx - rect.left;
			else if (opts.position === 'top') pull = cy - rect.top;
			else pull = rect.bottom - cy;

			// The HOST is the pages viewport (the real explorer frame). The
			// nav's offsetParent is the thin rail wrap, whose rect made the
			// widen cap collapse to the 40px floor AND walled the body at ~0px
			// (the "rail can't move" regression).
			const host =
				rail.closest<HTMLElement>('.vaultman-pages-viewport') ??
				(rail.offsetParent instanceof HTMLElement
					? rail.offsetParent
					: rail.parentElement);
			let hostRect: DOMRect | null = null;
			let over = 0;
			if (host instanceof HTMLElement) {
				hostRect = host.getBoundingClientRect();
				const cap = Math.max(
					40,
					(horizontal ? hostRect.height : hostRect.width) - 54,
				);
				const raw = Math.max(0, pull);
				// The far-side wall (D44): the rail body may displace freely in
				// its one allowed direction but stops at the frame's 8px inset.
				const perpRoom =
					opts.position === 'right'
						? rect.left - hostRect.left - 8
						: opts.position === 'left'
							? hostRect.right - rect.right - 8
							: opts.position === 'top'
								? hostRect.bottom - rect.bottom - 8
								: rect.top - hostRect.top - 8;
				const split = niagaraPullSplit(
					raw,
					cap,
					perpRoom,
					opts.stretch === true,
				);
				pull = split.pull;
				over = split.over;
			}
			perpOver = engaged ? over : 0;
			perp = engaged ? Math.max(0, pull) : 0;
			glowX = horizontal
				? cx - rect.left
				: opts.position === 'left'
					? 0
					: rect.width;
			glowY = horizontal
				? opts.position === 'top'
					? 0
					: rect.height
				: cy - rect.top;
			// A quick tap must not slide or deform the rail (D25).
			if (engaged) updateTrackShift(cx, cy, hostRect);
		}

		const index = indexFromPointer(cx, cy);
		if (index < 0) return;
		if (engaged && index !== activeIdx) {
			activeIdx = index;
			if (navigator.vibrate) navigator.vibrate(3);
		}
		const target = targetForTrackIndex(index);
		if (target && target.kind === 'group') {
			const { groupIndex } = target;
			if (groupIndex !== lastJumpedGroupIndex) {
				lastJumpedGroupIndex = groupIndex;
				onJump(groups[groupIndex].firstId);
			}
		}
	}
	function clearHoldTimer(): void {
		if (holdTimer === null) return;
		window.clearTimeout(holdTimer);
		holdTimer = null;
	}
	function onPointerMove(ev: PointerEvent): void {
		ev.preventDefault();
		const distance =
			Math.abs(ev.clientX - downAt.x) + Math.abs(ev.clientY - downAt.y);
		if (!engaged && distance > NIAGARA_ENGAGE_MOVE_PX) {
			engaged = true;
			gestureMoved = true;
			clearHoldTimer();
		}
		handleAt(ev.clientX, ev.clientY);
	}
	function armClickSuppression(): void {
		suppressNextTrackClick = true;
		if (clickResetTimer !== null) window.clearTimeout(clickResetTimer);
		clickResetTimer = window.setTimeout(() => {
			suppressNextTrackClick = false;
			clickResetTimer = null;
		}, 0);
	}
	function endScrub(): void {
		const consumedGesture = shouldSuppressNiagaraClick(
			gestureMoved,
			engaged,
			downTargetKind,
		);
		clearHoldTimer();
		if (consumedGesture) armClickSuppression();
		scrubbing = false;
		activeIdx = -1;
		perp = 0;
		perpOver = 0;
		shift = 0;
		engaged = false;
		gestureMoved = false;
		downTargetKind = null;
		lastJumpedGroupIndex = -1;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', endScrub);
		window.removeEventListener('pointercancel', endScrub);
	}
	function onScrubDown(ev: PointerEvent): void {
		if (!niagara || ev.button !== 0) return;
		if (clickResetTimer !== null) {
			window.clearTimeout(clickResetTimer);
			clickResetTimer = null;
		}
		suppressNextTrackClick = false;
		scrubbing = true;
		engaged = false;
		gestureMoved = false;
		shift = 0;
		lastJumpedGroupIndex = -1;
		downAt = { x: ev.clientX, y: ev.clientY };
		downTargetKind =
			targetForTrackIndex(indexFromPointer(ev.clientX, ev.clientY))?.kind ??
			null;
		holdTimer = window.setTimeout(() => {
			holdTimer = null;
			engaged = true;
			handleAt(downAt.x, downAt.y);
		}, NIAGARA_ENGAGE_HOLD_MS);
		handleAt(ev.clientX, ev.clientY);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', endScrub);
		window.addEventListener('pointercancel', endScrub);
	}

	function consumeSuppressedClick(event: MouseEvent): boolean {
		if (!suppressNextTrackClick) return false;
		event.preventDefault();
		event.stopPropagation();
		return true;
	}
	function handleActionClick(
		event: MouseEvent,
		actionId: FloatingTocActionId,
	): void {
		if (consumeSuppressedClick(event)) return;
		invokeAction(actionId);
	}
	function handleGroupClick(event: MouseEvent, groupIndex: number): void {
		if (consumeSuppressedClick(event)) return;
		const group = groups[groupIndex];
		if (group) onJump(group.firstId);
	}

	// ─── Exact proto Niagara wave ───────────────────────────────────────────────
	// BT4-021: glyph color. 'static' mode drops the color the moment the rail
	// reacts (scrub engaged or displaced); 'always' keeps it.
	const railStatic = $derived(!scrubbing || !engaged);
	function glyphColorStyle(groupIndex: number): string {
		const choice = normalizeGlyphColorChoice(
			opts.glyphColor ?? 'default',
		).choice;
		if (choice === 'default') return '';
		if ((opts.glyphColorMode ?? 'static') === 'static' && !railStatic) {
			return '';
		}
		if (choice === 'rainbow') {
			return `color: ${rainbowGlyphColor(groupIndex, Math.max(1, groups.length))};`;
		}
		const css = resolveGlyphColorCss(choice, opts.glyphCustomColor ?? '');
		return css ? `color: ${css};` : '';
	}

	function entryTransform(index: number): string {
		if (!niagara || !scrubbing || activeIdx < 0) return '';
		const transform = niagaraNodeTransform(
			index - activeIdx,
			trackEntryCount,
			dir,
			perp,
		);
		return horizontal
			? `transform: translate(${transform.spread}px, ${transform.perpendicular}px) scale(${transform.scale})`
			: `transform: translate(${transform.perpendicular}px, ${transform.spread}px) scale(${transform.scale})`;
	}

	const revealR = $derived(NIA_REVEAL[opts.reveal] ?? NIA_REVEAL.all);
	function nameAlphaFor(groupIndex: number): number {
		const distance = Math.abs(groupTrackIndex(groupIndex) - activeIdx);
		if (scrubbing && activeIdx >= 0 && engaged)
			return Math.max(0.05, 1 - distance / revealR);
		return opts.labelMode === 'always' ? 0.85 : 0;
	}
	function showName(groupIndex: number): boolean {
		if (opts.glyphMode === 'name' || opts.labelMode === 'off') return false;
		const isSelected = groupTrackIndex(groupIndex) === activeIdx;
		if (opts.labelMode === 'selected') return scrubbing && isSelected;
		if (opts.labelMode === 'always') return true;
		return scrubbing && engaged && nameAlphaFor(groupIndex) > 0.04;
	}
	function nameLetters(group: IndexGroup): string[] {
		const name = (group.firstLabel || '').replace(/^[#=]\s*/, '').trim();
		const letters = Array.from(name);
		return opts.nameOrder === 'up' ? letters.slice().reverse() : letters;
	}
	const trackShift = $derived(
		horizontal
			? `translateX(${shift}px) translateY(${dir * perpOver}px)`
			: `translateY(${shift}px) translateX(${dir * perpOver}px)`,
	);
</script>

{#snippet actionButton(actionId: FloatingTocActionId, trackIndex: number)}
	<button
		type="button"
		class="vaultman-floating-toc-action {actionClass(actionId)}"
		class:is-active={actionId === 'drill' && pickMode}
		class:is-track-entry={trackIndex >= 0}
		class:is-scrub-active={scrubbing && trackIndex === activeIdx}
		aria-label={actionTitle(actionId)}
		use:tooltip={actionTitle(actionId)}
		use:registerTrackEntry={trackIndex}
		style={trackIndex >= 0 ? entryTransform(trackIndex) : ''}
		onclick={(event) => handleActionClick(event, actionId)}
	>
		<span
			class="vaultman-floating-toc-action-icon"
			use:icon={actionIcon(actionId)}
		></span>
	</button>
{/snippet}

<!-- Close is always action 0. Joined mode places every action and group on one track. -->
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
			{#if !opts.nodes}
				<div class="vaultman-floating-toc-actions">
					{#each actionIds as actionId (actionId)}
						{@render actionButton(actionId, -1)}
					{/each}
				</div>
			{/if}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="vaultman-floating-toc-glyphs"
				class:is-niagara={niagara}
				class:has-joined-actions={opts.nodes}
				style="transform: {trackShift}; transition: {scrubbing
					? 'none'
					: 'transform 0.2s ease'}"
				onpointerdown={onScrubDown}
			>
				{#if opts.nodes}
					{#each actionIds as actionId, i (actionId)}
						{@render actionButton(actionId, i)}
					{/each}
				{/if}
				{#each groups as group, i (group.key)}
					{@const trackIndex = groupTrackIndex(i)}
					<button
						type="button"
						class="vaultman-floating-toc-item"
						class:is-scrub-active={scrubbing && trackIndex === activeIdx}
						aria-label={group.label}
						use:tooltip={group.label}
						use:registerTrackEntry={trackIndex}
						style="{entryTransform(trackIndex)}{glyphColorStyle(i)}"
						onclick={(event) => handleGroupClick(event, i)}
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
										{#each nameLetters(group) as character, k (k)}
											<span class="vaultman-floating-toc-vletter"
												>{character === ' ' ? ' ' : character}</span
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
