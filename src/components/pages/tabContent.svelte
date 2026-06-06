<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { ContentPreviewResult } from '../../types/typeUI';

	let {
		contentFind = $bindable(),
		contentReplace = $bindable(),
		contentCaseSensitive = $bindable(),
		contentIsRegex = $bindable(),
		contentPreviewResult = $bindable(),
		contentPreviewOpen = $bindable(),
		contentRegexError,
		contentScopeHint,
		queueContentReplace,
		openContentMatch,
	}: {
		contentFind: string;
		contentReplace: string;
		contentCaseSensitive: boolean;
		contentIsRegex: boolean;
		contentPreviewResult: ContentPreviewResult | null;
		contentPreviewOpen: boolean;
		contentRegexError: string;
		contentScopeHint: string;
		queueContentReplace: () => void;
		openContentMatch: (file: TFile, line: number, ch: number) => Promise<void>;
	} = $props();

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}
</script>

<!-- Find row: input + Aa + .* toggles -->
<div class="vaultman-content-find-row">
	<input
		class="vaultman-search-input"
		type="text"
		placeholder={translate('content.find_placeholder')}
		bind:value={contentFind}
	/>
	<button
		class="vaultman-icon-toggle"
		class:is-active={contentCaseSensitive}
		aria-label={translate('content.toggle_case')}
		title={translate('content.toggle_case')}
		onclick={() => {
			contentCaseSensitive = !contentCaseSensitive;
		}}>Aa</button
	>
	<button
		class="vaultman-icon-toggle"
		class:is-active={contentIsRegex}
		aria-label={translate('content.toggle_regex')}
		title={translate('content.toggle_regex')}
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
<div class="vaultman-content-replace-row">
	<input
		class="vaultman-search-input"
		type="text"
		placeholder={translate('content.replace_placeholder')}
		bind:value={contentReplace}
	/>
	<button
		class="vaultman-icon-toggle vaultman-content-queue-btn"
		disabled={!contentFind ||
			!!contentRegexError ||
			contentPreviewResult?.isLoading}
		aria-label={translate('content.queue_replace')}
		title={translate('content.queue_replace')}
		onclick={queueContentReplace}
		use:iconAction={'lucide-list-plus'}
	></button>
</div>
<div class="vaultman-content-scope-hint">
	{contentScopeHint}
</div>
{#if contentPreviewResult !== null}
	<div
		class={`search-result-container mod-global-search node-insert-event${contentPreviewResult.isLoading ? ' is-loading' : ''}`}
	>
		<div
			class="tree-item-self search-result-file-title is-clickable vaultman-content-preview-header"
			onclick={() => {
				contentPreviewOpen = !contentPreviewOpen;
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					contentPreviewOpen = !contentPreviewOpen;
				}
			}}
			role="button"
			tabindex="0"
		>
			<span class="tree-item-icon collapse-icon vaultman-preview-chevron"
				>{contentPreviewOpen ? '▼' : '▶'}</span
			>
			<span class="tree-item-inner">
				{#if contentPreviewResult.totalMatches === 0}
					<span class="tree-item-inner-text"
						>{translate('content.no_matches')}</span
					>
				{:else}
					<span class="tree-item-inner-text"
						>{translate('content.preview_count')
							.replace('{matches}', String(contentPreviewResult.totalMatches))
							.replace(
								'{files}',
								String(
									contentPreviewResult.files.length +
										contentPreviewResult.moreFiles,
								),
							)}</span
					>
				{/if}
			</span>
		</div>
		{#if contentPreviewOpen && contentPreviewResult.totalMatches > 0}
			<div class="search-results-children">
				{#each contentPreviewResult.files as fileResult (fileResult.file.path)}
					<div class="tree-item search-result">
						<div
							class="tree-item-self search-result-file-title is-clickable"
							role="button"
							tabindex="0"
							onclick={() => {
								const first = fileResult.snippets[0];
								if (first)
									void openContentMatch(fileResult.file, first.line, first.ch);
							}}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									const first = fileResult.snippets[0];
									if (first)
										void openContentMatch(
											fileResult.file,
											first.line,
											first.ch,
										);
								}
							}}
						>
							<div class="tree-item-inner">
								<div class="tree-item-inner-text">{fileResult.file.path}</div>
							</div>
							<div class="tree-item-flair-outer">
								<span class="tree-item-flair">{fileResult.matchCount}</span>
							</div>
						</div>
						<div class="search-result-file-matches">
							{#each fileResult.snippets as snippet, snippetIndex (`${fileResult.file.path}-${snippetIndex}-${snippet.match}`)}
								<div
									class="search-result-file-match tappable is-clickable"
									role="button"
									tabindex="0"
									onclick={() =>
										openContentMatch(fileResult.file, snippet.line, snippet.ch)}
									onkeydown={(e: KeyboardEvent) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											void openContentMatch(
												fileResult.file,
												snippet.line,
												snippet.ch,
											);
										}
									}}
								>
									<span>{snippet.before}</span><span
										class="search-result-file-matched-text"
										>{snippet.match}</span
									><span>{snippet.after}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
				{#if contentPreviewResult.moreFiles > 0}
					<div class="tree-item search-result vaultman-text-faint">
						{translate('content.preview_more').replace(
							'{count}',
							String(contentPreviewResult.moreFiles),
						)}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
