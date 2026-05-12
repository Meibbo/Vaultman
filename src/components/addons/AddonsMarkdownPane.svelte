<script lang="ts">
	import {
		Component as ObsidianComponent,
		MarkdownRenderer,
		setIcon,
		type App,
		type TFile,
	} from 'obsidian';
	import { onDestroy, untrack } from 'svelte';
	import type {
		AddonsIslandService,
		AddonsQuickSwitcherApp,
	} from '../../services/serviceAddonsIsland.svelte';

	interface Props {
		service: AddonsIslandService;
		statsRenderer: () => string;
		markdownRenderer?: (path: string, mountPoint: HTMLElement) => void | Promise<void>;
		app?: AddonsQuickSwitcherApp;
	}

	let { service, statsRenderer, markdownRenderer, app }: Props = $props();

	let mdMount: HTMLDivElement | undefined = $state();
	let renderError = $state<string | null>(null);
	let noteRenderComponent: ObsidianComponent | null = null;

	$effect(() => {
		const path = service.activePane === 'markdown' ? service.notePath : null;
		const host = mdMount;
		if (!path || !host) {
			untrack(unloadMarkdownRenderer);
			return;
		}
		void untrack(() => renderMarkdown(path, host));
	});

	onDestroy(() => {
		unloadMarkdownRenderer();
	});

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	function openQuickSwitcher(): void {
		if (!app) return;
		void service.openQuickSwitcher(app);
	}

	async function renderMarkdown(path: string, host: HTMLElement): Promise<void> {
		disposeMarkdownComponent();
		renderError = null;
		host.replaceChildren();
		try {
			if (markdownRenderer) {
				await markdownRenderer(path, host);
				return;
			}
			if (!app) return;
			const file = resolveMarkdownFile(app, path);
			if (!file) {
				renderError = `Note not found: ${path}`;
				return;
			}
			const component = new ObsidianComponent();
			component.load();
			noteRenderComponent = component;
			const markdown = await readMarkdown(app, file);
			if (
				service.activePane !== 'markdown' ||
				service.notePath !== path ||
				noteRenderComponent !== component
			) {
				component.unload();
				return;
			}
			await MarkdownRenderer.render(app as App, markdown, host, file.path, component);
		} catch (error) {
			renderError = error instanceof Error ? error.message : String(error);
		}
	}

	function resolveMarkdownFile(appLike: AddonsQuickSwitcherApp, path: string): TFile | null {
		const vault = (appLike as Partial<App>).vault;
		if (!vault) return null;
		const file = vault.getFileByPath?.(path) ?? vault.getAbstractFileByPath?.(path) ?? null;
		if (!file || !('path' in file)) return null;
		return file as TFile;
	}

	async function readMarkdown(appLike: AddonsQuickSwitcherApp, file: TFile): Promise<string> {
		const vault = (appLike as Partial<App>).vault;
		if (!vault) return '';
		if (vault.cachedRead) return vault.cachedRead(file);
		return vault.read(file);
	}

	function unloadMarkdownRenderer(): void {
		disposeMarkdownComponent();
	}

	function disposeMarkdownComponent(): void {
		if (!noteRenderComponent) return;
		noteRenderComponent.unload();
		noteRenderComponent = null;
	}
</script>

<div class="vm-addons-toolbar" role="toolbar" aria-label="Add-ons">
	<button
		type="button"
		class="vm-addons-tool"
		data-vm-addon-action="open-note"
		disabled={!app || service.pendingQuickSwitcher}
		onclick={openQuickSwitcher}
		aria-label="Open note"
	>
		<span class="vm-addons-tool-icon" use:iconAction={'lucide-search'}></span>
		<span>Open note</span>
	</button>
	{#if service.activePane === 'markdown'}
		<button
			type="button"
			class="vm-addons-tool"
			data-vm-addon-action="show-stats"
			onclick={() => service.showStats()}
			aria-label="Show stats"
		>
			<span class="vm-addons-tool-icon" use:iconAction={'lucide-bar-chart-2'}></span>
			<span>Show stats</span>
		</button>
	{/if}
</div>

{#if service.quickSwitcherError}
	<div class="vm-addons-error">{service.quickSwitcherError}</div>
{/if}

{#if service.activePane === 'stats'}
	<div class="vm-addons-stats">{statsRenderer()}</div>
{:else}
	{#if renderError}
		<div class="vm-addons-error">{renderError}</div>
	{/if}
	<div bind:this={mdMount} class="vm-addons-markdown"></div>
{/if}

<style>
	.vm-addons-toolbar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.vm-addons-tool {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--background-modifier-border);
		border-radius: 0.375rem;
		background: var(--background-secondary);
		color: var(--text-normal);
		font-size: 0.75rem;
		line-height: 1.2;
	}

	.vm-addons-tool:disabled {
		opacity: 0.55;
	}

	.vm-addons-tool-icon {
		width: 1rem;
		height: 1rem;
		display: inline-flex;
	}

	.vm-addons-error {
		margin: 0.5rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--background-modifier-error);
		border-radius: 0.375rem;
		color: var(--text-error);
		font-size: 0.75rem;
	}

	.vm-addons-stats,
	.vm-addons-markdown {
		padding: 0.5rem;
		overflow: auto;
		height: 100%;
	}
</style>
