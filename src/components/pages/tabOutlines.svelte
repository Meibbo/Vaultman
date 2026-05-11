<script lang="ts">
	import { onMount } from 'svelte';
	import type { TFile } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import type { AdoptedNode } from '../../types/typeAdoptedNode';
	import { buildOutlineForFile } from '../../providers/explorerOutline';
	import { AdoptionService } from '../../services/serviceAdoption.svelte';
	import { ThemeService } from '../../services/serviceTheme.svelte';
	import ViewOutlineExplorer from '../views/viewOutlineExplorer.svelte';

	let {
		plugin,
		active = true,
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
	} = $props();

	let tree = $state.raw<AdoptedNode[]>([]);
	let loadError = $state<string | null>(null);
	let loading = $state(false);
	let loadSerial = 0;

	const adoptionService = new AdoptionService();
	adoptionService.enabled = true;
	adoptionService.adoptTasks = true;
	adoptionService.adoptBlocks = true;

	const fallbackThemeService = new ThemeService();
	const themeService = $derived(plugin.themeService ?? fallbackThemeService);
	const visibleTree = $derived(adoptionService.filterChildren(tree));

	async function loadActiveFile(): Promise<void> {
		const serial = ++loadSerial;
		const file = plugin.app.workspace.getActiveFile();
		loading = true;
		loadError = null;

		if (!file) {
			tree = [];
			loading = false;
			return;
		}

		try {
			const content = await readFileContent(file);
			if (serial !== loadSerial) return;
			tree = buildOutlineForFile({ path: file.path, file, content });
		} catch (err) {
			if (serial !== loadSerial) return;
			tree = [];
			loadError = err instanceof Error ? err.message : String(err);
		} finally {
			if (serial === loadSerial) loading = false;
		}
	}

	function readFileContent(file: TFile): Promise<string> {
		return plugin.app.vault.cachedRead?.(file) ?? plugin.app.vault.read(file);
	}

	function releaseEventRef(ref: unknown): void {
		const off = (ref as { off?: () => void }).off;
		if (typeof off === 'function') off();
	}

	onMount(() => {
		void loadActiveFile();
		const activeLeafRef = plugin.app.workspace.on('active-leaf-change', () => {
			void loadActiveFile();
		});
		const fileOpenRef = plugin.app.workspace.on('file-open', () => {
			void loadActiveFile();
		});

		return () => {
			loadSerial++;
			releaseEventRef(activeLeafRef);
			releaseEventRef(fileOpenRef);
		};
	});
</script>

<div
	class="vm-outlines-tab-content"
	class:is-active={active}
	data-vm-outline-loading={loading}
	data-vm-outline-error={loadError}
>
	<ViewOutlineExplorer tree={visibleTree} {themeService} {adoptionService} />
</div>
