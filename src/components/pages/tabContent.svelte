<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { ContentPreviewResult } from '../../types/typeUI';
	import type { NodeBadge } from '../../types/typeTree';
	import type { BadgeCancelClickMode } from '../../utils/badgeInteraction';
	import { untrack } from 'svelte';
	import {
		CONTENT_MATCH_WINDOW_STEP,
		CONTENT_WINDOW_INITIAL,
		grownContentWindow,
		remainingContentFiles,
		shouldGrowContentWindow,
		visibleContentCount,
	} from '../../logic/logicContentRenderWindow';

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
		onHeaderMenu,
		onShowMoreContext,
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
		openContentMatch: (file: TFile, offset: number) => Promise<void>;
		onOpenFilters?: () => void;
		queuedRenameBadge: (filePath: string) => NodeBadge | undefined;
		cancelQueuedRename: (queueIndex: number) => void;
		badgeCancelClickMode: BadgeCancelClickMode;
		/** BT5-036: open the configurable Content node menu (Rename/Delete). */
		onContentContextMenu?: (file: TFile, event: MouseEvent) => void;
		/**
		 * U121-019 #51: opens the result-header overflow menu. The entries and
		 * every Obsidian call behind them belong to the host; this component only
		 * reports the click.
		 */
		onHeaderMenu?: (event: MouseEvent) => void;
		/**
		 * U121-019 #51: open one match further out. Core gives every match row two
		 * hover chevrons that move that match's own bounds and re-render it alone.
		 */
		onShowMoreContext?: (
			filePath: string,
			matchIndex: number,
			direction: 'before' | 'after',
		) => void;
		/** U121-019 #51: current context level for a file row, 0 = the default slice. */
		contentContextLevel?: (filePath: string) => number;
		/** U121-019 #51: widen or narrow one node's context. */
		onContextLevelChange?: (
			filePath: string,
			direction: 'more' | 'less',
		) => void;
	} = $props();

	let contentReplaceOpen = $state(false);
	let contentResultsEl = $state<HTMLElement | null>(null);
	// U121-019 #51: the caps are gone from the results, so the document is what
	// needs bounding now. This window only delays rows — every match is in the
	// model and reachable by scrolling. It never shrinks, so nothing on screen
	// disappears under the user.
	let contentWindow = $state(CONTENT_WINDOW_INITIAL);
	// One window per expanded file, for the same reason: every match is in the
	// model, but a file with thousands of them must not put thousands of rows in
	// the document just because its row is open.
	let contentMatchWindows = $state<Record<string, number>>({});

	function matchWindowFor(filePath: string): number {
		return contentMatchWindows[filePath] ?? CONTENT_MATCH_WINDOW_STEP;
	}

	function growMatchWindow(filePath: string, total: number): void {
		contentMatchWindows = {
			...contentMatchWindows,
			[filePath]: grownContentWindow(
				matchWindowFor(filePath),
				total,
				CONTENT_MATCH_WINDOW_STEP,
			),
		};
	}

	const visibleContentFiles = $derived(
		sortedContentFiles.slice(
			0,
			visibleContentCount(sortedContentFiles.length, contentWindow),
		),
	);
	const hiddenContentFiles = $derived(
		remainingContentFiles(sortedContentFiles.length, contentWindow),
	);

	/** A new result set starts a new window; a growing one keeps its place. */
	$effect(() => {
		void contentFind;
		untrack(() => {
			contentWindow = CONTENT_WINDOW_INITIAL;
			contentMatchWindows = {};
		});
	});

	function growContentWindow(): void {
		contentWindow = grownContentWindow(
			contentWindow,
			sortedContentFiles.length,
		);
	}

	function onContentScroll(event: Event): void {
		const el = event.currentTarget as HTMLElement | null;
		if (!el) return;
		if (
			!shouldGrowContentWindow({
				scrollTop: el.scrollTop,
				scrollHeight: el.scrollHeight,
				clientHeight: el.clientHeight,
				total: sortedContentFiles.length,
				windowSize: contentWindow,
			})
		) {
			return;
		}
		growContentWindow();
	}

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
	<!-- U121-029 owns this control's placement. It sat here on 1.2.0 and is put
	     back so that lane's change applies without a conflict. -->
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
	<!-- This element is the scroller: measured live, `overflow-y: auto` with the
	     children taller than its box. The window grows from here. -->
	<div
		onscroll={onContentScroll}
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
			<!-- U121-019 #51: core prints its result count as plain text, with
			     neither a triangle nor a caret. The collapse affordance stays on
			     the per-file rows below, where core has one too. Clicking the
			     header still toggles the preview. -->
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
			<!-- U121-019 #51: one overflow menu, not a row of cells. The header is
			     narrow and both entries are occasional, so they live behind a vertical
			     ellipsis and the count keeps the horizontal space the caret used to
			     take. Has/Hasn't is deliberately NOT here: it belongs to U121-029 and
			     that lane owns its placement. -->
			<div class="tree-item-flair-outer vaultman-content-header-actions">
				{#if onHeaderMenu}
					<button
						class="clickable-icon vaultman-content-header-menu"
						aria-label={translate('content.result_actions')}
						title={translate('content.result_actions')}
						onclick={(e: MouseEvent) => {
							e.stopPropagation();
							onHeaderMenu?.(e);
						}}
						use:iconAction={'lucide-more-vertical'}
					></button>
				{/if}
			</div>
		</div>
		{#if contentPreviewOpen && contentPreviewResult.totalMatches > 0}
			<div class="search-results-children" bind:this={contentResultsEl}>
				{#each visibleContentFiles as fileResult (fileResult.file.path)}
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
							<!-- Core's own collapse icon, probed on 1.12.3: a stroked
							     caret that it rotates, not a filled text triangle. Copied
							     as markup rather than through `setIcon` because this row
							     is rendered by Svelte, and inheriting `currentColor` and
							     the theme's icon sizing is the whole point of the swap. -->
							<span
								class="tree-item-icon collapse-icon vaultman-preview-chevron"
								class:is-collapsed={!isContentFileExpanded(
									fileResult.file.path,
								)}
								aria-hidden="true"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="svg-icon right-triangle"
									><path d="M3 8L12 17L21 8" /></svg
								>
							</span>
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
							{@const matchWindow = matchWindowFor(fileResult.file.path)}
							{@const shownSnippets = fileResult.snippets.slice(0, matchWindow)}
							{@const hiddenMatches =
								fileResult.snippets.length - shownSnippets.length}
							<div class="search-result-file-matches">
								{#each shownSnippets as snippet, snippetIndex (`${fileResult.file.path}-${snippetIndex}-${snippet.match}`)}
									<div
										class="search-result-file-match tappable is-clickable"
										role="button"
										tabindex="0"
										onclick={() =>
											openContentMatch(fileResult.file, snippet.offset)}
										onkeydown={(e: KeyboardEvent) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												void openContentMatch(fileResult.file, snippet.offset);
											}
										}}
									>
										<span>{snippet.before}</span><span
											class="search-result-file-matched-text"
											>{snippet.match}</span
										><span>{snippet.after}</span>
										{#if onShowMoreContext}
											<!-- Core's own affordance, class for class: every match row
											     carries a `.search-result-hover-button.mod-top` and a
											     `.mod-bottom`, which call `showMoreBefore` /
											     `showMoreAfter` on that match alone. -->
											<div
												class="search-result-hover-button mod-top"
												role="button"
												tabindex="-1"
												aria-label={translate('content.show_more_context')}
												onclick={(e: MouseEvent) => {
													e.stopPropagation();
													onShowMoreContext?.(
														fileResult.file.path,
														snippetIndex,
														'before',
													);
												}}
												onkeydown={(e: KeyboardEvent) => {
													if (e.key !== 'Enter' && e.key !== ' ') return;
													e.preventDefault();
													e.stopPropagation();
													onShowMoreContext?.(
														fileResult.file.path,
														snippetIndex,
														'before',
													);
												}}
												use:iconAction={'lucide-chevron-up'}
											></div>
											<div
												class="search-result-hover-button mod-bottom"
												role="button"
												tabindex="-1"
												aria-label={translate('content.show_more_context')}
												onclick={(e: MouseEvent) => {
													e.stopPropagation();
													onShowMoreContext?.(
														fileResult.file.path,
														snippetIndex,
														'after',
													);
												}}
												onkeydown={(e: KeyboardEvent) => {
													if (e.key !== 'Enter' && e.key !== ' ') return;
													e.preventDefault();
													e.stopPropagation();
													onShowMoreContext?.(
														fileResult.file.path,
														snippetIndex,
														'after',
													);
												}}
												use:iconAction={'lucide-chevron-down'}
											></div>
										{/if}
									</div>
								{/each}
								{#if hiddenMatches > 0}
									<!-- Every match is in the model; this is the slice with rows.
									     Without it, a file expanded by default put its whole match
									     list in the document — 25521 rows on a common letter. -->
									<button
										class="vaultman-content-window-more vaultman-content-window-more--matches"
										onclick={(e: MouseEvent) => {
											e.stopPropagation();
											growMatchWindow(
												fileResult.file.path,
												fileResult.snippets.length,
											);
										}}
									>
										{translate('content.show_more_matches').replace(
											'{count}',
											String(hiddenMatches),
										)}
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
				{#if hiddenContentFiles > 0}
					<!-- This replaced the `moreFiles` notice, which announced results the
					     `MAX_FILES` cap had thrown away. These files are in the result and
					     simply have no row yet: scrolling to the end pulls in the next
					     step, and the button is here for anyone who would rather not
					     scroll for it. -->
					<button
						class="vaultman-content-window-more"
						onclick={growContentWindow}
					>
						{translate('content.show_more_files').replace(
							'{count}',
							String(hiddenContentFiles),
						)}
					</button>
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
