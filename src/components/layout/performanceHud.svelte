<script lang="ts">
	import { onMount } from 'svelte';
	import { setIcon } from 'obsidian';
	import {
		vaultmanPerfMonitor,
		type VaultmanPerfAction,
		type VaultmanPerfSample,
	} from '../../utils/performanceMonitor';

	let collapsed = $state(false);
	let samples = $state<VaultmanPerfSample[]>([]);
	let actions = $state<VaultmanPerfAction[]>([]);
	let rootEl = $state<HTMLElement | null>(null);
	let position = $state({ x: 10, y: 10 });
	let dragging = $state(false);
	let dragStart = {
		pointerX: 0,
		pointerY: 0,
		x: 0,
		y: 0,
	};

	const latest = $derived(samples.at(-1));
	const fpsPoints = $derived.by(() =>
		pointsFor(samples, (sample) => sample.fps, 60),
	);
	const pressurePoints = $derived.by(() =>
		pointsFor(samples, (sample) => sample.mainThreadPressure * 60, 60),
	);

	function refresh(): void {
		samples = vaultmanPerfMonitor.samples(32);
		actions = vaultmanPerfMonitor.actions(4).slice().reverse();
	}

	function pointsFor(
		input: VaultmanPerfSample[],
		read: (sample: VaultmanPerfSample) => number,
		max: number,
	): string {
		if (input.length === 0) return '';
		const width = 160;
		const height = 34;
		return input
			.map((sample, index) => {
				const x =
					input.length === 1 ? width : (index / (input.length - 1)) * width;
				const value = Math.max(0, Math.min(max, read(sample)));
				const y = height - (value / max) * height;
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	}

	function fmt(value: number | undefined, suffix = ''): string {
		return typeof value === 'number' ? `${value}${suffix}` : 'n/a';
	}

	function bounds(): { width: number; height: number } {
		const viewport = window.visualViewport;
		return {
			width: viewport?.width ?? window.innerWidth,
			height: viewport?.height ?? window.innerHeight,
		};
	}

	function clamp(next: { x: number; y: number }): { x: number; y: number } {
		const box = bounds();
		const width = rootEl?.offsetWidth ?? 220;
		const height = rootEl?.offsetHeight ?? 120;
		return {
			x: Math.max(0, Math.min(box.width - width, next.x)),
			y: Math.max(0, Math.min(box.height - height, next.y)),
		};
	}

	function placeInitial(): void {
		if (!rootEl) return;
		const box = bounds();
		collapsed = false;
		position = clamp({
			x: Math.max(0, box.width - rootEl.offsetWidth - 10),
			y: 10,
		});
	}

	function clampCurrentPosition(): void {
		position = clamp(position);
	}

	function startDrag(event: PointerEvent): void {
		if (!rootEl) return;
		dragging = true;
		dragStart = {
			pointerX: event.clientX,
			pointerY: event.clientY,
			x: position.x,
			y: position.y,
		};
		event.preventDefault();
		window.addEventListener('pointermove', onDragMove);
		window.addEventListener('pointerup', stopDrag, { once: true });
	}

	function onDragMove(event: PointerEvent): void {
		if (!dragging) return;
		position = clamp({
			x: dragStart.x + event.clientX - dragStart.pointerX,
			y: dragStart.y + event.clientY - dragStart.pointerY,
		});
	}

	function stopDrag(): void {
		dragging = false;
		window.removeEventListener('pointermove', onDragMove);
	}

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	onMount(() => {
		const release = vaultmanPerfMonitor.retainSampling();
		refresh();
		window.requestAnimationFrame(placeInitial);
		const timer = window.setInterval(refresh, 2000);
		window.addEventListener('resize', clampCurrentPosition);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener('resize', clampCurrentPosition);
			window.removeEventListener('pointermove', onDragMove);
			release();
		};
	});
</script>

<div
	bind:this={rootEl}
	class="vaultman-performance-hud"
	class:is-collapsed={collapsed}
	class:is-dragging={dragging}
	style:left={`${position.x}px`}
	style:top={`${position.y}px`}
	data-vaultman-performance-hud
>
	<button
		type="button"
		class="clickable-icon nav-action-button vaultman-performance-toggle"
		onclick={() => (collapsed = !collapsed)}
		aria-label={collapsed
			? 'Show performance monitor'
			: 'Hide performance monitor'}
		title={collapsed ? 'Show performance monitor' : 'Hide performance monitor'}
	>
		<span use:iconAction={collapsed ? 'lucide-activity' : 'lucide-x'}></span>
	</button>

	{#if !collapsed}
		<div class="vaultman-performance-panel">
			<div
				class="vaultman-performance-head"
				role="button"
				tabindex="0"
				aria-label="Move performance monitor"
				onpointerdown={startDrag}
			>
				<span class="vaultman-performance-title">Perf</span>
				<span class="vaultman-performance-fps">{fmt(latest?.fps, ' fps')}</span>
			</div>
			<svg
				class="vaultman-performance-chart"
				viewBox="0 0 160 34"
				role="img"
				aria-label="Vaultman performance chart"
			>
				<polyline class="vaultman-performance-line" points={fpsPoints}
				></polyline>
				<polyline
					class="vaultman-performance-line vaultman-performance-line--pressure"
					points={pressurePoints}
				></polyline>
			</svg>
			<div class="vaultman-performance-metrics">
				<span>LT {latest?.longTasks ?? 0}</span>
				<span>RAM {fmt(latest?.memoryMb, ' MB')}</span>
				<span>CPU {fmt(latest?.cpuPercent, '%')}</span>
			</div>
			<div class="vaultman-performance-actions">
				{#each actions as action (`${action.at}-${action.surface}-${action.name}`)}
					<div class="vaultman-performance-action">
						<span>{action.surface}</span>
						<strong>{action.name}</strong>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
