<script lang="ts">
	import type { VfsChain } from '../../services/serviceVfsChain';
	import type { ThemeService } from '../../services/serviceTheme.svelte';
	import { resolveDiffKeyboardAction } from '../../logic/logicKeyboard';

	interface Props {
		chains: Map<string, VfsChain>;
		themeService: ThemeService;
		activePath?: string;
		activeIndex?: number;
		onNavigate?: (e: { path: string; index: number }) => void;
	}

	let {
		chains,
		themeService,
		activePath = $bindable(),
		activeIndex = $bindable(),
		onNavigate,
	}: Props = $props();

	const paths = $derived([...chains.keys()].filter((p) => (chains.get(p)?.length ?? 0) > 1));
	const activeChainLength = $derived(activePath ? (chains.get(activePath)?.length ?? 1) - 1 : 0);

	function navigate(path: string, index: number): void {
		activePath = path;
		activeIndex = index;
		onNavigate?.({ path, index });
	}

	function nextChange(): void {
		if (!activePath || activeIndex === undefined) return;
		const chain = chains.get(activePath);
		if (!chain) return;
		const target = Math.min(activeIndex + 1, chain.length - 1);
		if (target !== activeIndex) navigate(activePath, target);
	}

	function prevChange(): void {
		if (!activePath || activeIndex === undefined) return;
		const target = Math.max((activeIndex ?? 1) - 1, 1);
		navigate(activePath, target);
	}

	function nextFile(): void {
		if (!paths.length) return;
		const i = activePath ? paths.indexOf(activePath) : -1;
		const nextPath = paths[(i + 1) % paths.length];
		navigate(nextPath, 1);
	}

	function prevFile(): void {
		if (!paths.length) return;
		const i = activePath ? paths.indexOf(activePath) : 0;
		const prev = paths[(i - 1 + paths.length) % paths.length];
		navigate(prev, 1);
	}

	function handleKeydown(event: KeyboardEvent): void {
		const action = resolveDiffKeyboardAction(event);
		if (!action) return;
		event.preventDefault();
		if (action === 'diff.prev-change') prevChange();
		else if (action === 'diff.next-change') nextChange();
		else if (action === 'diff.prev-file') prevFile();
		else nextFile();
	}
</script>

<div
	class="vm-diff-navbar"
	class:vm-faint={themeService.faintActive}
	role="toolbar"
	aria-label="Diff navigation"
	tabindex="0"
	onkeydown={handleKeydown}
>
	<div class="vm-diff-navbar-pills">
		{#each paths as p (p)}
			<button
				type="button"
				data-vm-file-pill
				class:active={p === activePath}
				onclick={() => navigate(p, 1)}>{p}</button
			>
		{/each}
	</div>

	<div class="vm-diff-navbar-actions">
		<button
			type="button"
			data-vm-nav="prev-file"
			onclick={prevFile}
			title="Prev file (Ctrl+Alt+[)"
			aria-label="Previous file"
		>
			<span class="i-lucide-chevrons-left" aria-hidden="true"></span>
		</button>
		<button
			type="button"
			data-vm-nav="prev-change"
			onclick={prevChange}
			title="Prev change (Alt+[)"
			aria-label="Previous change"
		>
			<span class="i-lucide-chevron-left" aria-hidden="true"></span>
		</button>
		<span class="vm-diff-navbar-meta">
			{activePath ?? '—'} · {activeIndex ?? 0} / {activeChainLength}
		</span>
		<button
			type="button"
			data-vm-nav="next-change"
			onclick={nextChange}
			title="Next change (Alt+])"
			aria-label="Next change"
		>
			<span class="i-lucide-chevron-right" aria-hidden="true"></span>
		</button>
		<button
			type="button"
			data-vm-nav="next-file"
			onclick={nextFile}
			title="Next file (Ctrl+Alt+])"
			aria-label="Next file"
		>
			<span class="i-lucide-chevrons-right" aria-hidden="true"></span>
		</button>
	</div>
</div>

<style>
	.vm-diff-navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-bottom: 1px solid var(--vm-border, var(--background-modifier-border));
		background: var(--vm-bg-alt, var(--background-secondary));
	}
	.vm-diff-navbar-pills {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}
	.vm-diff-navbar-pills button {
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: transparent;
		border: 1px solid var(--vm-border, var(--background-modifier-border));
		color: var(--vm-fg, var(--text-normal));
		cursor: pointer;
	}
	.vm-diff-navbar-pills button.active {
		background: var(--vm-accent, var(--text-accent));
		color: var(--background-primary);
	}
	.vm-diff-navbar-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.vm-diff-navbar-meta {
		font-family: var(--font-monospace);
		font-size: 0.85em;
		padding: 0 0.5rem;
	}
</style>
