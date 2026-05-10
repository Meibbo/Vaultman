<script lang="ts">
	import { onMount } from 'svelte';
	import { Filemanager, Willow, WillowDark } from '@svar-ui/svelte-filemanager';
	import { FilesLogic } from '../../logic/logicsFiles';
	import type { VaultmanPlugin } from '../../main';
	import type { TreeNode } from '../../types/typeNode';
	import type { ExplorerProvider } from '../../types/typeExplorer';

	let {
		plugin,
		provider,
	}: {
		plugin: VaultmanPlugin;
		provider?: ExplorerProvider<any>;
	} = $props();

	let data = $state<any[]>([]);
	let isDark = $state(false);

	function refreshData() {
		if (provider) {
			const tree = provider.getTree();
			data = mapTreeToSvar(tree);
			return;
		}

		// Fallback to old whole-vault logic if no provider passed
		const allFiles = plugin.app.vault.getFiles();
		const logic = new FilesLogic(plugin.app);
		const tree = logic.buildFileTree(allFiles);
		data = mapTreeToSvar(tree);
	}

	function updateTheme() {
		isDark = document.body.classList.contains('theme-dark');
	}

	function mapTreeToSvar(nodes: TreeNode<any>[]): any[] {
		return nodes.map((node) => {
			const meta = node.meta;
			const isFolder =
				meta && typeof meta === 'object' && 'isFolder' in meta ? meta.isFolder : !!node.children;

			const item: any = {
				id: node.id,
				name: node.label,
				type: isFolder ? 'folder' : 'file',
			};

			// Metadata extraction based on meta type
			if (meta && typeof meta === 'object') {
				if ('file' in meta && meta.file) {
					item.size = meta.file.stat.size;
					item.date = new Date(meta.file.stat.mtime);
					item.extension = meta.file.extension;
				}
				if ('propType' in meta) {
					item.propType = meta.propType;
				}
				if ('count' in node) {
					item.count = node.count;
				}
			}

			if (node.children && node.children.length > 0) {
				item.data = mapTreeToSvar(node.children);
			}

			return item;
		});
	}

	onMount(() => {
		refreshData();
		updateTheme();

		const observer = new MutationObserver(() => updateTheme());
		observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

		// Sync with index updates if provider present
		let unsubscribe: (() => void) | undefined;
		if (provider?.subscribe) {
			unsubscribe = provider.subscribe(() => refreshData());
		} else {
			// Sync with vault changes (fallback mode)
			const sync = () => refreshData();
			const eventRefs = [
				plugin.app.vault.on('create', sync),
				plugin.app.vault.on('delete', sync),
				plugin.app.vault.on('rename', sync),
				plugin.app.vault.on('modify', sync),
			];
			unsubscribe = () => {
				for (const eventRef of eventRefs) plugin.app.vault.offref(eventRef);
			};
		}

		return () => {
			observer.disconnect();
			unsubscribe?.();
		};
	});

	function init(api: any) {
		api.on('rename-file', ({ id, name }: { id: string; name: string }) => {
			const file = plugin.app.vault.getAbstractFileByPath(id);
			if (file) {
				const newPath = id.substring(0, id.lastIndexOf('/') + 1) + name;
				void plugin.app.fileManager.renameFile(file, newPath);
			}
		});

		api.on('delete-files', ({ ids }: { ids: string[] }) => {
			for (const id of ids) {
				const file = plugin.app.vault.getAbstractFileByPath(id);
				if (file) {
					void plugin.app.fileManager.trashFile(file);
				}
			}
		});
	}
</script>

<div class="vm-svar-container">
	{#if isDark}
		<WillowDark>
			<Filemanager {data} {init} />
		</WillowDark>
	{:else}
		<Willow>
			<Filemanager {data} {init} />
		</Willow>
	{/if}
</div>

<style>
	.vm-svar-container {
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	:global(.vm-svar-container .svar-filemanager) {
		flex: 1;
	}
</style>
