<script lang="ts">
	import { translate } from "../../i18n/index";
	import type { ContentPreviewResult } from "../../types/typeUI";

	let {
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

<!-- Find row: input + Aa + .* toggles -->
<div class="vaultman-content-find-row">
	<input
		class="vaultman-search-input"
		type="text"
		placeholder={translate("content.find_placeholder")}
		bind:value={contentFind}
	/>
	<button
		class="vaultman-icon-toggle"
		class:is-active={contentCaseSensitive}
		aria-label={translate("content.toggle_case")}
		title={translate("content.toggle_case")}
		onclick={() => {
			contentCaseSensitive = !contentCaseSensitive;
		}}>Aa</button
	>
	<button
		class="vaultman-icon-toggle"
		class:is-active={contentIsRegex}
		aria-label={translate("content.toggle_regex")}
		title={translate("content.toggle_regex")}
		onclick={() => {
			contentIsRegex = !contentIsRegex;
		}}>.*</button
	>
</div>
{#if contentRegexError}
	<div class="vaultman-content-regex-error">
		{contentRegexError}
	</div>
{/if}
<input
	class="vaultman-search-input"
	type="text"
	placeholder={translate("content.replace_placeholder")}
	bind:value={contentReplace}
/>
<div class="vaultman-content-scope-hint">
	{contentScopeHint}
</div>
<div class="vaultman-content-actions">
	<button
		class="vaultman-btn"
		disabled={!contentFind || contentPreviewing}
		onclick={() => {
			void previewContentReplace();
		}}>{contentPreviewing ? "…" : translate("content.preview")}</button
	>
	<button
		class="vaultman-btn mod-cta"
		disabled={!contentFind}
		onclick={queueContentReplace}
		>{translate("content.queue_replace")}</button
	>
</div>
{#if contentPreviewResult !== null}
	<div class="vaultman-content-preview">
		<div
			class="vaultman-content-preview-header"
			onclick={() => {
				contentPreviewOpen = !contentPreviewOpen;
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					contentPreviewOpen = !contentPreviewOpen;
				}
			}}
			role="button"
			tabindex="0"
		>
			<span class="vaultman-preview-chevron"
				>{contentPreviewOpen ? "▼" : "▶"}</span
			>
			{#if contentPreviewResult.totalMatches === 0}
				<span>{translate("content.no_matches")}</span>
			{:else}
				<span
					>{translate("content.preview_count")
						.replace(
							"{matches}",
							String(contentPreviewResult.totalMatches),
						)
						.replace(
							"{files}",
							String(
								contentPreviewResult.files.length +
									contentPreviewResult.moreFiles,
							),
						)}</span
				>
			{/if}
		</div>
		{#if contentPreviewOpen && contentPreviewResult.totalMatches > 0}
			{#each contentPreviewResult.files as fileResult}
				<div class="vaultman-content-preview-file">
					{fileResult.file.path} ({fileResult.matchCount})
				</div>
				{#each fileResult.snippets as snippet}
					<div class="vaultman-content-preview-snippet">
						<span>{snippet.before}</span><mark>{snippet.match}</mark
						><span>{snippet.after}</span>
					</div>
				{/each}
			{/each}
			{#if contentPreviewResult.moreFiles > 0}
				<div class="vaultman-text-faint">
					{translate("content.preview_more").replace(
						"{count}",
						String(contentPreviewResult.moreFiles),
					)}
				</div>
			{/if}
		{/if}
	</div>
{/if}
