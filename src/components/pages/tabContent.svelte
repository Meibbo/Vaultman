<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { ContentPreviewResult } from '../../types/typeUI';
	import type { NodeBadge } from '../../types/typeTree';
	import type { BadgeCancelClickMode } from '../../utils/badgeInteraction';

	let {
		contentFind = $bindable(),
		contentReplace = $bindable(),
		contentCaseSensitive = $bindable(),
		contentIsRegex = $bindable(),
		contentIsExclusion = $bindable(),
		contentPreviewResult = $bindable(),
		contentPreviewOpen = $bindable(),
		contentRegexError,
		contentPreviewFileCount,
		contentHasActiveNonContentFilters,
		contentExcludedFileCount,
		activeContentRevealPath,
		activeContentFilePath,
		contentRevealRevision,
		sortedContentFiles,
		isContentFileExpanded,
		toggleContentFile,
		queueContentReplace,
		openContentMatch,
		onOpenFilters,
		queuedRenameBadge,
		cancelQueuedRename,
		badgeCancelClickMode,
		onContentContextMenu,
	}: {
		contentFind: string;
		contentReplace: string;
		contentCaseSensitive: boolean;
		contentIsRegex: boolean;
		contentIsExclusion: boolean;
		contentPreviewResult: ContentPreviewResult | null;
		contentPreviewOpen: boolean;
		contentRegexError: string;
		contentPreviewFileCount: number;
		contentHasActiveNonContentFilters: boolean;
		contentExcludedFileCount: number;
		activeContentRevealPath: string | null;
		activeContentFilePath: string | null;
		contentRevealRevision: number;
		sortedContentFiles: ContentPreviewResult['files'];
		isContentFileExpanded: (filePath: string) => boolean;
		toggleContentFile: (filePath: string) => void;
		queueContentReplace: () => void;
		openContentMatch: (file: TFile, line: number, ch: number) => Promise<void>;
		onOpenFilters?: () => void;
		queuedRenameBadge: (filePath: string) => NodeBadge | undefined;
		cancelQueuedRename: (queueIndex: number) => void;
		badgeCancelClickMode: BadgeCancelClickMode;
		/** BT5-036: open the configurable Content node menu (Rename/Delete). */
		onContentContextMenu?: (file: TFile, event: MouseEvent) => void;
	} = $props();

	let contentReplaceOpen = $state(false);
	let contentResultsEl = $state<HTMLElement | null>(null);

	$effect(() => {
		void contentRevealRevision;
		const path = activeContentRevealPath;
		if (!path || !contentResultsEl) return;
		const row = contentResultsEl.querySelector<HTMLElement>(
			`[data-vm-content-path="${CSS.escape(path)}"]`,
		);
		row?.scrollIntoView({ block: 'center' });
		row?.focus();
	});

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	function handleRenameBadgeClick(
		event: MouseEvent,
		badge: NodeBadge,
		double: boolean,
	): void {
		event.stopPropagation();
		const shouldCancel = double
			? badgeCancelClickMode === 'double'
			: badgeCancelClickMode === 'single';
		if (shouldCancel && badge.queueIndex !== undefined) {
			cancelQueuedRename(badge.queueIndex);
		}
	}

	function handleRenameBadgeKeydown(
		event: KeyboardEvent,
		badge: NodeBadge,
	): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		event.stopPropagation();
		if (badge.queueIndex !== undefined) cancelQueuedRename(badge.queueIndex);
	}
</script>

<!-- Find row: input + Aa + .* toggles -->
<div class="vaultman-content-find-row">
	<div class="search-input-container vaultman-content-search-container">
		<span
			class="vaultman-content-input-icon"
			aria-hidden="true"
			use:iconAction={'lucide-search'}
		></span>
		<input
			class="vaultman-search-input vaultman-content-input"
			type="search"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder={translate('content.find_placeholder')}
			bind:value={contentFind}
		/>
		{#if contentFind}
			<button
				type="button"
				class="clickable-icon vaultman-content-clear-button"
				aria-label={translate('filter.search_clear')}
				onclick={() => {
					contentFind = '';
				}}
				use:iconAction={'lucide-x'}
			></button>
		{/if}
	</div>
	<button
		class="clickable-icon vaultman-icon-toggle"
		class:is-active={contentIsExclusion}
		aria-label={contentIsExclusion
			? translate('filter.text_not_contains')
			: translate('filter.text_contains')}
		title={contentIsExclusion
			? translate('filter.text_not_contains')
			: translate('filter.text_contains')}
		onclick={() => {
			contentIsExclusion = !contentIsExclusion;
		}}
		use:iconAction={contentIsExclusion
			? 'lucide-file-minus'
			: 'lucide-file-text'}
	></button>
	<button
		class="clickable-icon vaultman-icon-toggle"
		class:is-active={contentCaseSensitive}
		aria-label={translate('content.toggle_case')}
		title={translate('content.toggle_case')}
		onclick={() => {
			contentCaseSensitive = !contentCaseSensitive;
		}}>Aa</button
	>
	<button
		class="clickable-icon vaultman-icon-toggle"
		class:is-active={contentIsRegex}
		aria-label={translate('content.toggle_regex')}
		title={translate('content.toggle_regex')}
		onclick={() => {
			contentIsRegex = !contentIsRegex;
		}}>.*</button
	>
	<button
		class="clickable-icon vaultman-icon-toggle vaultman-content-replace-toggle"
		class:is-active={contentReplaceOpen || !!contentReplace}
		aria-label={translate('content.toggle_replace')}
		title={translate('content.toggle_replace')}
		onclick={() => {
			contentReplaceOpen = !contentReplaceOpen;
		}}
		use:iconAction={'lucide-replace'}
	></button>
</div>
{#if contentRegexError}
	<div class="vaultman-content-regex-error">
		{contentRegexError}
	</div>
{/if}
{#if contentReplaceOpen || contentReplace}
	<div class="vaultman-content-replace-row">
		<div
			class="search-input-container vaultman-content-search-container vaultman-content-replace-container"
		>
			<span
				class="vaultman-content-input-icon"
				aria-hidden="true"
				use:iconAction={'lucide-replace'}
			></span>
			<input
				class="vaultman-search-input vaultman-content-input"
				type="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				placeholder={translate('content.replace_placeholder')}
				bind:value={contentReplace}
			/>
			{#if contentReplace}
				<button
					type="button"
					class="clickable-icon vaultman-content-clear-button"
					aria-label={translate('filter.search_clear')}
					onclick={() => {
						contentReplace = '';
					}}
					use:iconAction={'lucide-x'}
				></button>
			{/if}
		</div>
		<button
			class="clickable-icon vaultman-icon-toggle vaultman-content-queue-btn"
			disabled={!contentFind ||
				!!contentRegexError ||
				contentPreviewResult?.isLoading}
			aria-label={translate('content.queue_replace')}
			title={translate('content.queue_replace')}
			onclick={queueContentReplace}
			use:iconAction={'lucide-list-plus'}
		></button>
	</div>
{/if}
{#if contentPreviewResult === null}
	<div class="vaultman-content-landing">
		<div
			class="vaultman-content-landing-icon"
			aria-hidden="true"
			use:iconAction={'lucide-file-search'}
		></div>
		<div class="vaultman-content-landing-title">
			{translate('content.landing_title')}
		</div>
		<div class="vaultman-content-landing-desc">
			{translate('content.landing_desc')}
		</div>
	</div>
{/if}
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
								String(contentPreviewFileCount),
							)}{#if contentHasActiveNonContentFilters}<span
								class="vaultman-content-filter-link"
								role="button"
								tabindex="0"
								onclick={(e: MouseEvent) => {
									e.stopPropagation();
									onOpenFilters?.();
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										e.stopPropagation();
										onOpenFilters?.();
									}
								}}
								>{' '}{translate('content.with_excluded').replace(
									'{count}',
									String(contentExcludedFileCount),
								)}</span
							>{/if}</span
					>
				{/if}
			</span>
		</div>
		{#if contentPreviewOpen && contentPreviewResult.totalMatches > 0}
			<div class="search-results-children" bind:this={contentResultsEl}>
				{#each sortedContentFiles as fileResult (fileResult.file.path)}
					{@const pendingRename = queuedRenameBadge(fileResult.file.path)}
					<div
						class="tree-item search-result"
						class:is-active={activeContentFilePath === fileResult.file.path}
						data-vm-content-path={fileResult.file.path}
						tabindex="-1"
					>
						<div
							class="tree-item-self search-result-file-title is-clickable"
							role="button"
							tabindex="0"
							onclick={() => {
								toggleContentFile(fileResult.file.path);
							}}
							oncontextmenu={(e: MouseEvent) => {
								if (!onContentContextMenu) return;
								e.preventDefault();
								onContentContextMenu(fileResult.file, e);
							}}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleContentFile(fileResult.file.path);
								}
							}}
						>
							<span
								class="tree-item-icon collapse-icon vaultman-preview-chevron"
								>{isContentFileExpanded(fileResult.file.path) ? '▼' : '▶'}</span
							>
							<div class="tree-item-inner">
								<div class="tree-item-inner-text">
									{fileResult.file.path}
								</div>
							</div>
							<div class="tree-item-flair-outer">
								{#if pendingRename}
									<span
										class="vaultman-badge vaultman-badge--blue is-undoable"
										role="button"
										tabindex="0"
										aria-label={pendingRename.text}
										title={pendingRename.text}
										onclick={(event) =>
											handleRenameBadgeClick(event, pendingRename, false)}
										ondblclick={(event) =>
											handleRenameBadgeClick(event, pendingRename, true)}
										onkeydown={(event) =>
											handleRenameBadgeKeydown(event, pendingRename)}
									>
										<span
											class="vaultman-badge-icon"
											aria-hidden="true"
											use:iconAction={pendingRename.icon ?? 'lucide-pencil'}
										></span>
									</span>
								{/if}
								<span class="tree-item-flair">{fileResult.matchCount}</span>
							</div>
						</div>
						{#if isContentFileExpanded(fileResult.file.path)}
							<div class="search-result-file-matches">
								{#each fileResult.snippets as snippet, snippetIndex (`${fileResult.file.path}-${snippetIndex}-${snippet.match}`)}
									<div
										class="search-result-file-match tappable is-clickable"
										role="button"
										tabindex="0"
										onclick={() =>
											openContentMatch(
												fileResult.file,
												snippet.line,
												snippet.ch,
											)}
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
						{/if}
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
		{:else if !contentPreviewResult.isLoading && contentPreviewResult.totalMatches === 0}
			<div class="vaultman-content-landing vaultman-content-landing--empty">
				<div
					class="vaultman-content-landing-icon"
					aria-hidden="true"
					use:iconAction={'lucide-search-x'}
				></div>
				<div class="vaultman-content-landing-title">
					{translate('content.no_matches')}
				</div>
				<div class="vaultman-content-landing-desc">
					{translate('content.empty_desc')}
				</div>
			</div>
		{/if}
	</div>
{/if}
