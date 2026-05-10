<script lang="ts">
	import { translate } from '../../index/i18n/lang';
	import SortPopup from './overlays/overlaySortMenu.svelte';
	import ViewModePopup from './overlays/overlayViewMenu.svelte';
	import { explorerFiles } from '../../providers/explorerFiles';
	import { explorerProps } from '../../providers/explorerProps';
	import { explorerTags } from '../../providers/explorerTags';
	import { SEARCH_SEMANTICS_SOURCES } from '../frame/frameSearchSources';
	import type { ActiveFnRRenameHandoff, FnRState } from '../../types/typeFnR';
	import type { ExplorerExpansionSummary } from '../../types/typeExplorer';
	import { FnRIslandService, type FnRIslandMode } from '../../services/serviceFnRIsland.svelte';
	import { getAddOpBuilder } from '../../registry/explorerAddOps';
	import type { PendingChange } from '../../types/typeOps';
	import {
		COMMAND_MOUSE_GESTURE_CONFIG,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';
	import type { NodeFieldDefinition } from '../../services/serviceNodeFieldVisibility';
	import type { OperationScope } from '../../services/serviceOperationScope';

	type FiltersTab = 'props' | 'files' | 'tags' | 'content';
	type HeaderMode = 'header' | 'sort' | 'viewmode';

	// Map an explorer tab id to the kind expected by `getAddOpBuilder`.
	function tabToExplorerKind(tab: FiltersTab): string {
		if (tab === 'tags') return 'tag';
		if (tab === 'props') return 'prop';
		if (tab === 'files') return 'file';
		return 'content';
	}

	const MODES: FnRIslandMode[] = ['search', 'rename', 'replace', 'add'];
	const OPERATION_SCOPE_ORDER: OperationScope[] = ['auto', 'selected', 'filtered'];
	const MODE_LABELS: Record<FnRIslandMode, string> = {
		search: 'search',
		rename: 'rename',
		replace: 'replace',
		add: 'add',
		'add-prop': 'add prop',
	};

	let {
		activeTab,
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0, content: 0 }),
		onSearchChange,
		searchHistory = [],
		onSearchHistoryCommit,
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		viewMode = $bindable('tree'),
		addMode = $bindable(false),
		operationScope = $bindable('auto'),
		filesShowSelectedOnly = $bindable(false),
		filesShowHidden = $bindable(false),
		manualDndEnabled = $bindable(false),
		onOperationScopeChange,
		onFilesShowHiddenChange,
		onManualDndChange,
		fnrState,
		onRenameReplacementChange,
		onRenameConfirm,
		onRenameCancel,
		nodeExpansionSummary = { canToggle: false, hasExpandedParents: false },
		onToggleNodeExpansion,
		icon,
		addOpCount = 0,
		fnrIslandService,
		onCrear,
		mouseGestureConfig,
		fieldDefinitions = [],
		visibleFields = [],
		onVisibleFieldsChange,
	}: {
		activeTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<FiltersTab, number>;
		onSearchChange?: (term: string) => void;
		searchHistory?: string[];
		onSearchHistoryCommit?: (term: string) => void;
		sortBy: string;
		sortDirection: 'asc' | 'desc';
		viewMode: any;
		addMode: boolean;
		operationScope: OperationScope;
		filesShowSelectedOnly?: boolean;
		filesShowHidden?: boolean;
		manualDndEnabled?: boolean;
		onOperationScopeChange?: (value: OperationScope) => void;
		onFilesShowHiddenChange?: (active: boolean) => void;
		onManualDndChange?: (active: boolean) => void;
		tagsExplorer: explorerTags | null | undefined;
		propExplorer: explorerProps | undefined;
		fileList: explorerFiles | undefined;
		fnrState?: FnRState;
		onRenameReplacementChange?: (replacement: string) => void;
		onRenameConfirm?: () => void;
		onRenameCancel?: () => void;
		nodeExpansionSummary?: ExplorerExpansionSummary;
		onToggleNodeExpansion?: () => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
		addOpCount?: number;
		fnrIslandService?: FnRIslandService;
		onCrear?: (change: PendingChange) => void;
		mouseGestureConfig?: MouseGestureConfig;
		fieldDefinitions?: readonly NodeFieldDefinition[];
		visibleFields?: readonly string[];
		onVisibleFieldsChange?: (fields: string[]) => void;
	} = $props();

	const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
		props: [translate('filter.category.props'), translate('filter.category.values')],
		tags: [translate('filter.category.all_tags'), translate('filter.category.leaf_tags')],
		files: [translate('filter.category.files'), translate('filter.category.folders')],
		content: [translate('filter.tab.content'), translate('content.search.placeholder')],
	};

	const currentCategoryLabel = $derived(
		CATEGORY_LABELS[activeTab]?.[filtersSearchCategory[activeTab] ?? 0] ??
			translate('filter.search_mode'),
	);

	let headerMode = $state<HeaderMode>('header');
	let headerExitDir = $state<'left' | 'right'>('right');
	let searchFocused = $state(false);
	let helpOpen = $state(false);
	let renameInput = $state<HTMLInputElement | undefined>();
	let searchboxRoot = $state<HTMLDivElement | undefined>();
	const mouse = createMouseGestureService();
	const toolbarMouseConfig = $derived(
		mergeMouseGestureConfig(COMMAND_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());

	// Local mirror of the rune service so the template stays reactive when
	// the parent forwards a service instance.
	let islandSnapshotVersion = $state(0);
	$effect(() => {
		if (!fnrIslandService) return;
		return fnrIslandService.subscribe(() => {
			islandSnapshotVersion += 1;
		});
	});
	const islandSnapshot = $derived.by(() => {
		void islandSnapshotVersion;
		return fnrIslandService?.snapshot() ?? null;
	});
	const islandMode = $derived<FnRIslandMode>(islandSnapshot?.mode ?? 'search');
	const islandExpanded = $derived(islandSnapshot?.expanded ?? false);
	const islandFlags = $derived(
		islandSnapshot?.flags ?? { matchCase: false, wholeWord: false, regex: false },
	);
	const islandTokenErrors = $derived(islandSnapshot?.errors ?? []);
	const islandRegexError = $derived(islandSnapshot?.regexError ?? null);
	const hasIslandErrors = $derived(islandTokenErrors.length > 0 || islandRegexError !== null);
	const islandErrorMessage = $derived.by(() => {
		if (islandRegexError) return `regex: ${islandRegexError}`;
		if (islandTokenErrors.length > 0) return islandTokenErrors[0].message;
		return '';
	});

	const historyItems = $derived(searchHistory.slice(0, 3));
	const activeRename = $derived.by((): ActiveFnRRenameHandoff | null => {
		const rename = fnrState?.rename;
		if (rename?.status === 'editing' || rename?.status === 'ready') return rename;
		return null;
	});
	const renameFocusKey = $derived(
		activeRename ? `${activeRename.sourceKind}:${activeRename.original}` : '',
	);

	// `crear` button availability is gated by the explorer registry. When a
	// builder exists the button is enabled; otherwise it stays disabled with a
	// localised tooltip explaining the explorer kind has no add semantics yet.
	const addBuilder = $derived(getAddOpBuilder(tabToExplorerKind(activeTab)));
	const crearDisabled = $derived(
		!addBuilder || filtersSearch.trim().length === 0 || hasIslandErrors,
	);
	const crearTooltip = $derived(
		!addBuilder
			? 'no soportado por este explorer'
			: hasIslandErrors
				? islandErrorMessage
				: translate('filter.search_placeholder'),
	);

	function toggleIslandFlag(flag: 'matchCase' | 'wholeWord' | 'regex') {
		if (!fnrIslandService) return;
		const next = !islandFlags[flag];
		fnrIslandService.setFlag(flag, next);
	}

	function openSortPopup() {
		headerExitDir = 'right';
		headerMode = 'sort';
	}
	function openViewModePopup() {
		headerExitDir = 'left';
		headerMode = 'viewmode';
	}
	function toggleSortPopup() {
		if (headerMode === 'sort') {
			headerMode = 'header';
			return;
		}
		openSortPopup();
	}
	function toggleViewModePopup() {
		if (headerMode === 'viewmode') {
			headerMode = 'header';
			return;
		}
		openViewModePopup();
	}
	function cycleOperationScope() {
		const currentIndex = OPERATION_SCOPE_ORDER.indexOf(operationScope);
		const next = OPERATION_SCOPE_ORDER[(currentIndex + 1) % OPERATION_SCOPE_ORDER.length];
		operationScope = next;
		onOperationScopeChange?.(next);
	}
	function resetViewMode() {
		viewMode = 'tree';
		addMode = false;
	}
	function resetSortMode() {
		sortBy = 'name';
		sortDirection = 'desc';
	}
	function handleViewButtonClick(e: MouseEvent) {
		e.stopPropagation();
		mouse.handleClick(
			{ key: 'toolbar:view-mode', eventTarget: e.target },
			e,
			{
				primary: openViewModePopup,
				secondary: cycleOperationScope,
				tertiary: resetViewMode,
			},
			toolbarMouseConfig,
		);
	}
	function handleSortButtonClick(e: MouseEvent) {
		e.stopPropagation();
		mouse.handleClick(
			{ key: 'toolbar:sort', eventTarget: e.target },
			e,
			{
				primary: openSortPopup,
				secondary: () => onToggleNodeExpansion?.(),
				tertiary: resetSortMode,
			},
			toolbarMouseConfig,
		);
	}
	function handleViewButtonAuxClick(e: MouseEvent) {
		e.stopPropagation();
		mouse.handleAuxClick(
			{ key: 'toolbar:view-mode', eventTarget: e.target },
			e,
			{ tertiary: resetViewMode },
			toolbarMouseConfig,
		);
	}
	function handleSortButtonAuxClick(e: MouseEvent) {
		e.stopPropagation();
		mouse.handleAuxClick(
			{ key: 'toolbar:sort', eventTarget: e.target },
			e,
			{ tertiary: resetSortMode },
			toolbarMouseConfig,
		);
	}
	export function openSortMenu(): void {
		toggleSortPopup();
	}
	export function openViewMenu(): void {
		toggleViewModePopup();
	}
	function closeHeaderPopup() {
		headerMode = 'header';
	}

	function cycleSearchCategory() {
		if (activeTab === 'content') return;
		const tab = activeTab;
		filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
		filtersSearchCategory = { ...filtersSearchCategory };
	}

	function updateFiltersSearch(term: string) {
		filtersSearch = term;
		onSearchChange?.(term);
		fnrIslandService?.setQuery(term);
	}

	function commitSearchHistory(term = filtersSearch) {
		onSearchHistoryCommit?.(term);
	}

	function chooseHistory(term: string) {
		updateFiltersSearch(term);
		commitSearchHistory(term);
		searchFocused = false;
	}

	function cycleIslandMode() {
		if (!fnrIslandService) return;
		const idx = MODES.indexOf(islandMode);
		const next = MODES[(idx + 1) % MODES.length];
		fnrIslandService.setMode(next);
		// Rename/replace expand the island into a toolbar takeover; the other
		// modes never expand from the pill click.
		if (next === 'rename' || next === 'replace') {
			fnrIslandService.expand();
		} else if (islandExpanded) {
			fnrIslandService.collapse();
		}
	}

	function handleCrearClick() {
		if (crearDisabled || !addBuilder) return;
		const change = addBuilder(filtersSearch.trim());
		if (!change) return;
		fnrIslandService?.setMode('add');
		fnrIslandService?.submit();
		onCrear?.(change);
		// Clear the searchbox after a successful crear so the user can chain.
		updateFiltersSearch('');
	}

	function renameContext(rename: ActiveFnRRenameHandoff): string {
		if (rename.sourceKind === 'value' && rename.propName) {
			return translate('fnr.rename.context_value', {
				original: rename.original,
				prop: rename.propName,
				count: rename.files.length,
			});
		}
		return translate('fnr.rename.context', {
			kind: translate(`fnr.rename.kind.${rename.sourceKind}`),
			original: rename.original,
			count: rename.files.length,
		});
	}

	function handleRenameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && activeRename?.status === 'ready') {
			onRenameConfirm?.();
		}
		if (event.key === 'Escape') {
			onRenameCancel?.();
			fnrIslandService?.collapse();
		}
	}

	function handleSearchboxKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (fnrIslandService && islandExpanded) {
			fnrIslandService.collapse();
		}
	}

	function handleDocumentPointerDown(event: MouseEvent) {
		if (!fnrIslandService || !islandExpanded) return;
		const target = event.target instanceof Node ? event.target : null;
		if (target && searchboxRoot?.contains(target)) return;
		fnrIslandService.collapse();
	}

	$effect(() => {
		if (!renameFocusKey) return;
		queueMicrotask(() => {
			renameInput?.focus();
			renameInput?.select();
		});
	});

	// Auto-expand into the toolbar takeover whenever a rename handoff arrives,
	// so the legacy parent contract still drives the visual takeover even
	// without the parent owning the FnRIslandService directly.
	$effect(() => {
		if (!fnrIslandService) return;
		if (activeRename) {
			fnrIslandService.setMode('rename');
			fnrIslandService.expand();
		}
	});
</script>

<svelte:document onpointerdown={handleDocumentPointerDown} />

<div class="vm-navbar-filters vm-glass vm-glass--top" class:vm-toolbar-takeover={islandExpanded}>
	<div class="vm-filters-header-wrap">
		{#if headerMode === 'header'}
			<div class="vm-filters-header">
				<div
					class="vm-filters-header-search-wrap"
					bind:this={searchboxRoot}
					onkeydown={handleSearchboxKeydown}
					role="presentation"
				>
					{#if fnrIslandService && hasIslandErrors}
						<div
							class="vm-filters-search-error"
							role="alert"
							aria-live="polite"
							data-error-kind={islandRegexError ? 'regex' : 'token'}
						>
							{islandErrorMessage}
						</div>
					{/if}
					<div class="vm-filters-header-search-pill">
						{#if fnrIslandService}
							<button
								type="button"
								class="vm-filters-search-modepill"
								aria-label={translate('filter.search_mode')}
								title={translate('filter.search_mode')}
								data-mode={islandMode}
								onclick={cycleIslandMode}
							>
								<span>{MODE_LABELS[islandMode]}</span>
							</button>
						{/if}
						<input
							class="vm-filters-search-input"
							type="text"
							autocomplete="off"
							autocorrect="off"
							autocapitalize="off"
							spellcheck="false"
							placeholder={translate('filter.search_placeholder')}
							value={filtersSearch}
							onfocus={() => {
								searchFocused = true;
								helpOpen = false;
							}}
							onblur={() => {
								commitSearchHistory();
								window.setTimeout(() => {
									searchFocused = false;
								}, 120);
							}}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter') {
									commitSearchHistory();
									(e.currentTarget as HTMLInputElement).blur();
								}
							}}
							oninput={(e) => {
								updateFiltersSearch((e.currentTarget as HTMLInputElement).value);
							}}
						/>
						{#if filtersSearch}
							<button
								class="vm-filters-search-clear"
								aria-label={translate('filter.search_clear')}
								use:icon={'lucide-x'}
								onclick={() => {
									updateFiltersSearch('');
								}}
							></button>
						{/if}
						<button
							class="vm-filters-search-mode has-label"
							aria-label={currentCategoryLabel}
							title={currentCategoryLabel}
							onclick={cycleSearchCategory}
						>
							<span>{currentCategoryLabel}</span>
						</button>
						{#if fnrIslandService}
							<div class="vm-filters-search-flags" role="group" aria-label="search modifiers">
								<button
									type="button"
									class="vm-filters-search-flag"
									class:is-active={islandFlags.matchCase}
									aria-label="match case"
									aria-pressed={islandFlags.matchCase}
									title="match case"
									data-flag="matchCase"
									onclick={() => toggleIslandFlag('matchCase')}>Aa</button
								>
								<button
									type="button"
									class="vm-filters-search-flag"
									class:is-active={islandFlags.wholeWord}
									class:is-disabled={islandFlags.regex}
									aria-label="whole word"
									aria-pressed={islandFlags.wholeWord}
									title="whole word"
									data-flag="wholeWord"
									disabled={islandFlags.regex}
									onclick={() => toggleIslandFlag('wholeWord')}>W</button
								>
								<button
									type="button"
									class="vm-filters-search-flag"
									class:is-active={islandFlags.regex}
									aria-label="regex (JS)"
									aria-pressed={islandFlags.regex}
									title="regex (JS)"
									data-flag="regex"
									onclick={() => toggleIslandFlag('regex')}>.*</button
								>
							</div>
						{/if}
						<div class="vm-filters-help-wrap">
							<button
								class="vm-filters-search-help"
								aria-label={translate('filter.search_help')}
								title={translate('filter.search_help')}
								use:icon={'lucide-circle-help'}
								onclick={() => {
									helpOpen = !helpOpen;
									searchFocused = false;
								}}
							></button>
							{#if helpOpen}
								<div
									class="vm-filters-help-popover"
									aria-label={translate('filter.search_read_more')}
								>
									{#each SEARCH_SEMANTICS_SOURCES as source (source.id)}
										<a
											class="vm-filters-help-link"
											href={source.href}
											target="_blank"
											rel="noreferrer"
										>
											{source.label}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>
					{#if activeRename}
						<div
							class="vm-fnr-island vm-fnr-rename"
							aria-label={translate('fnr.rename.title')}
							title={renameContext(activeRename)}
						>
							<div class="vm-fnr-row">
								<input
									bind:this={renameInput}
									class="vm-fnr-input"
									type="text"
									autocomplete="off"
									autocorrect="off"
									autocapitalize="off"
									spellcheck="false"
									aria-label={translate('fnr.rename.replacement')}
									title={renameContext(activeRename)}
									placeholder={translate('prop.new_name')}
									value={activeRename.replacement}
									onkeydown={handleRenameKeydown}
									oninput={(event) =>
										onRenameReplacementChange?.((event.currentTarget as HTMLInputElement).value)}
								/>
								<button
									class="vm-fnr-action"
									type="button"
									disabled={activeRename.status !== 'ready'}
									aria-label={translate('fnr.rename.queue')}
									title={translate('fnr.rename.queue')}
									use:icon={'lucide-check'}
									onclick={onRenameConfirm}
								></button>
								<button
									class="vm-fnr-action"
									type="button"
									aria-label={translate('fnr.rename.cancel')}
									title={translate('fnr.rename.cancel')}
									use:icon={'lucide-x'}
									onclick={onRenameCancel}
								></button>
							</div>
						</div>
					{/if}
					{#if searchFocused && historyItems.length > 0}
						<div
							class="vm-filters-search-history"
							role="listbox"
							aria-label={translate('filter.search_history')}
						>
							{#each historyItems as term (term)}
								<button
									class="vm-filters-search-history-item"
									type="button"
									onmousedown={(e) => e.preventDefault()}
									onclick={() => chooseHistory(term)}
								>
									<span class="vm-filters-search-history-icon" use:icon={'lucide-clock'}></span>
									<span class="vm-filters-search-history-label">{term}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
				{#if fnrIslandService}
					<button
						type="button"
						class="vm-filters-crear"
						class:is-disabled={crearDisabled}
						aria-label="crear"
						title={crearTooltip}
						disabled={crearDisabled}
						onclick={handleCrearClick}
					>
						<span class="vm-filters-crear-icon" use:icon={'lucide-plus'}></span>
						<span class="vm-filters-crear-label">crear</span>
					</button>
				{/if}
				<div class="vm-toolbar-menu-min" role="group" aria-label={translate('filter.search_mode')}>
					<div
						class="vm-nav-icon vm-nav-icon-min is-active"
						role="button"
						tabindex="0"
						aria-label={translate('filter.viewmode_btn')}
						onclick={handleViewButtonClick}
						onauxclick={handleViewButtonAuxClick}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') openViewModePopup();
						}}
						use:icon={'lucide-layout-list'}
					></div>
					<div
						class="vm-nav-icon vm-nav-icon-min is-active"
						role="button"
						tabindex="0"
						aria-label={translate('filter.sort_btn')}
						onclick={handleSortButtonClick}
						onauxclick={handleSortButtonAuxClick}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') openSortPopup();
						}}
						use:icon={'lucide-arrow-up-down'}
					></div>
				</div>
			</div>
		{:else if headerMode === 'sort'}
			<div
				class="vm-filters-popup-slot"
				class:popup-enter-from-left={headerExitDir === 'right'}
				class:popup-enter-from-right={headerExitDir === 'left'}
			>
				<SortPopup
					{activeTab}
					onClose={closeHeaderPopup}
					bind:sortBy
					bind:sortDir={sortDirection}
					bind:operationScope
					bind:filesShowSelectedOnly
					bind:filesShowHidden
					bind:manualDndEnabled
					{nodeExpansionSummary}
					{onToggleNodeExpansion}
					{onOperationScopeChange}
					{onFilesShowHiddenChange}
					{onManualDndChange}
					{icon}
				/>
			</div>
		{:else if headerMode === 'viewmode'}
			<div
				class="vm-filters-popup-slot"
				class:popup-enter-from-left={headerExitDir === 'right'}
				class:popup-enter-from-right={headerExitDir === 'left'}
			>
				<ViewModePopup
					{activeTab}
					onClose={closeHeaderPopup}
					bind:viewMode
					bind:addMode
					{addOpCount}
					{fieldDefinitions}
					{visibleFields}
					{onVisibleFieldsChange}
					{icon}
				/>
			</div>
		{/if}
	</div>
</div>
