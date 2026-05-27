<script lang="ts">
	import type { VaultmanPlugin } from "../../main";
	import type { ContentPreviewResult } from "../../types/typeUI";
	import ContentOpsComponent from "../containers/panelContent.svelte";

	let {
		// Content find/replace props
		contentFind = $bindable(),
		contentReplace = $bindable(),
		contentCaseSensitive = $bindable(),
		contentIsRegex = $bindable(),
		contentPreviewResult = $bindable(),
		contentPreviewOpen = $bindable(),
		contentPreviewing,
		contentRegexError,
		contentScopeHint,
		previewContentReplace,
		queueContentReplace,
	}: {
		plugin: VaultmanPlugin;
		openFileRename: () => void;
		openPropertyManager: () => void;
		openMovePopup: () => void;
		initQueueList: (node: HTMLElement) => any;
		icon: (node: HTMLElement, name: string) => any;
		contentFind: string;
		contentReplace: string;
		contentCaseSensitive: boolean;
		contentIsRegex: boolean;
		contentPreviewResult: ContentPreviewResult | null;
		contentPreviewOpen: boolean;
		contentPreviewing: boolean;
		contentRegexError: string;
		contentScopeHint: string;
		previewContentReplace: () => Promise<void>;
		queueContentReplace: () => void;
	} = $props();
</script>

<div class="vaultman-ops-files-tab">
	<div class="vaultman-ops-separator"></div>

	<!-- Content Operations Component -->
	<ContentOpsComponent
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

	<div class="vaultman-ops-separator"></div>
</div>

<style>
	.vaultman-ops-files-tab {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.vaultman-ops-separator {
		height: 1px;
		background: var(--vaultman-border);
		margin: 4px 0;
		opacity: 0.5;
	}
</style>
