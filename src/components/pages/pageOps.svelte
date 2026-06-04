<script lang="ts">
	import { TFile } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import type { defOpsTab, ContentPreviewResult } from '../../types/typeUI';
	import { translate } from '../../i18n/index';
	import {
		type PendingChange,
		FIND_REPLACE_CONTENT,
	} from '../../types/typeOps';
	import { MenuCuratorPanel } from '../containers/panelCurator';
	import TabContent from './tabContent.svelte';

	// ─── Props ───────────────────────────────────────────────────────────────
	let {
		plugin,
		getSelectedFiles,
		filteredCount,
		icon,
	}: {
		plugin: VaultmanPlugin;
		getSelectedFiles: () => TFile[];
		openMovePopup: () => void;
		filteredCount: number;
		selectedCount: number;
		icon: (el: HTMLElement, name: string) => any;
	} = $props();

	// ─── State ───────────────────────────────────────────────────────────────
	let opsTab = $state<string>('content');

	// Find/Replace state
	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(true);
	let contentPreviewing = $state(false);
	let contentRegexError = $state('');

	const contentScopeHint = $derived.by(() => {
		const scope = plugin.settings.explorerOperationScope;
		const selected = getSelectedFiles();
		if (scope === 'selected' || (scope === 'auto' && selected.length > 0)) {
			return translate('content.scope_hint_selected').replace(
				'{count}',
				String(selected.length),
			);
		}
		return translate('content.scope_hint_filtered').replace(
			'{count}',
			String(filteredCount),
		);
	});

	// ─── Tabs definition ─────────────────────────────────────────────────────
	const Tabs: defOpsTab[] = [
		{
			id: 'content',
			label: translate('ops.tabs.fileops'),
			icon: 'lucide-files',
		},
		{
			id: 'template',
			label: translate('ops.tabs.template'),
			icon: 'lucide-layout-template',
		},
		{
			id: 'layout',
			label: translate('ops.tabs.layout'),
			icon: 'lucide-layout',
		},
	];

	// ─── Logic ───────────────────────────────────────────────────────────────

	async function previewContentReplace() {
		contentRegexError = '';
		if (!contentFind) {
			contentPreviewResult = null;
			return;
		}

		const flags = 'g' + (contentCaseSensitive ? '' : 'i');
		const escaped = contentIsRegex
			? contentFind
			: contentFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		try {
			new RegExp(escaped, flags);
		} catch (e) {
			contentRegexError = translate('content.invalid_regex');
			return;
		}

		contentPreviewing = true;
		const scope = plugin.settings.explorerOperationScope;
		const selected = getSelectedFiles();
		const files =
			scope === 'selected' || (scope === 'auto' && selected.length > 0)
				? selected
				: plugin.filterService.filteredFiles;

		let totalMatches = 0;
		const fileResults: ContentPreviewResult['files'] = [];
		const MAX_FILES = 10;
		const MAX_SNIPPETS = 3;
		const CONTEXT = 40;

		let matchFileCount = 0;

		for (const file of files) {
			try {
				const content = await plugin.app.vault.read(file);
				const matches = [...content.matchAll(new RegExp(escaped, flags))];
				if (matches.length > 0) {
					matchFileCount++;
					totalMatches += matches.length;
					if (fileResults.length < MAX_FILES) {
						fileResults.push({
							file,
							matchCount: matches.length,
							snippets: matches.slice(0, MAX_SNIPPETS).map((m) => {
								const start = m.index ?? 0;
								const end = start + m[0].length;
								return {
									before: content.slice(Math.max(0, start - CONTEXT), start),
									match: m[0],
									after: content.slice(end, end + CONTEXT),
								};
							}),
						});
					}
				}
			} catch (e) {
				console.error(e);
			}
			if (matchFileCount % 20 === 0) await new Promise((r) => setTimeout(r, 0));
		}

		contentPreviewResult = {
			totalMatches,
			files: fileResults,
			moreFiles: Math.max(0, matchFileCount - fileResults.length),
		};
		contentPreviewing = false;
		contentPreviewOpen = true;
	}

	function queueContentReplace() {
		if (!contentFind) return;
		const scope = plugin.settings.explorerOperationScope;
		const selected = getSelectedFiles();
		const files =
			scope === 'selected' || (scope === 'auto' && selected.length > 0)
				? selected
				: plugin.filterService.filteredFiles;

		plugin.queueService.add({
			type: 'content_replace',
			action: 'find_replace_content',
			details: `${contentFind} → ${contentReplace}`,
			files: [...files],
			find: contentFind,
			replace: contentReplace,
			isRegex: contentIsRegex,
			caseSensitive: contentCaseSensitive,
			logicFunc: () => ({
				[FIND_REPLACE_CONTENT]: {
					pattern: contentFind,
					replacement: contentReplace,
					isRegex: contentIsRegex,
					caseSensitive: contentCaseSensitive,
				},
			}),
			customLogic: true,
		} as PendingChange);
	}

	function mountCurator(el: HTMLElement) {
		const panel = new MenuCuratorPanel(el, plugin);
		panel.onload();
		return {
			destroy() {
				panel.unload();
			},
		};
	}
</script>

<div class="vaultman-tab-bar">
	{#each Tabs as tab (tab.id)}
		<div
			class="vaultman-tab nav-action-button"
			class:is-active={opsTab === tab.id}
			data-tab={tab.id}
			onclick={() => {
				opsTab = tab.id;
			}}
			role="tab"
			tabindex="0"
			aria-label={tab.label}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					opsTab = tab.id;
				}
			}}
		>
			<span class="vaultman-tab-icon" use:icon={tab.icon}></span>
			<span class="vaultman-tab-label">{tab.label}</span>
		</div>
	{/each}
</div>

<div class="vaultman-tab-area">
	<!-- File Ops tab (always in DOM so QueueListComponent persists) -->
	<div class="vaultman-tab-content" class:is-active={opsTab === 'content'}>
		<TabContent
			bind:contentFind
			bind:contentReplace
			bind:contentCaseSensitive
			bind:contentIsRegex
			bind:contentPreviewResult
			bind:contentPreviewOpen
			{contentPreviewing}
			{contentRegexError}
			{contentScopeHint}
			{previewContentReplace}
			{queueContentReplace}
		/>
	</div>

	<!-- Template tab -->
	<div class="vaultman-tab-content" class:is-active={opsTab === 'template'}>
		<div class="vaultman-coming-soon">
			{translate('ops.coming_soon')}
		</div>
	</div>

	<!-- Layout tab -->
	<div class="vaultman-tab-content" class:is-active={opsTab === 'layout'}>
		<div class="vaultman-layout-curator" use:mountCurator></div>
	</div>
</div>
