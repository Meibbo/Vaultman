<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	// TODO: por quÃ© importo los tabs y los explorer?
	import FiltersPropsTab from './tabProps.svelte';
	import FiltersFilesTab from './tabFiles.svelte';
	import FiltersTagsTab from './tabTags.svelte';
	import ContentTab from './tabContent.svelte';
	// TODO: por quÃ© importa navbartabs??
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import NavbarExplorer from '../layout/navbarExplorer.svelte';
	import PanelExplorer from '../containers/panelExplorer.svelte';
	import { FTabs, type FilTab } from '../../types/typeTab';
	import { explorerProps } from '../../providers/explorerProps';
	import { explorerFiles } from '../../providers/explorerFiles';
	import { explorerTags } from '../../providers/explorerTags';
	import { explorerBasesImport } from '../containers/explorerBasesImport';
	import { createBasesImportTargetsIndex } from '../../index/indexBasesImportTargets';
	import { extractBasesFencedBlocks, previewBasesImport } from '../../services/serviceBasesInterop';
	import {
		buildRenameHandoffChange,
		cancelRenameHandoff,
		createFnRState,
		markRenameHandoffQueued,
		updateRenameHandoffReplacement,
	} from '../../services/serviceFnR';
	import type { ActiveFnRRenameHandoff, FnRRenameHandoff, FnRState } from '../../types/typeFnR';
	import type {
		ExplorerExpansionCommand,
		ExplorerExpansionSummary,
		ExplorerSortTarget,
	} from '../../types/typeExplorer';
	import type { ExplorerViewMode } from '../../types/typeViews';
	import type { FilterGroup } from '../../types/typeFilter';
	import type { BasesImportTarget } from '../../types/typeBasesInterop';
	import {
		addFiltersSearchHistory,
		createFiltersSearchState,
		getFiltersSearch,
		getFiltersSearchHistory,
		setFiltersSearch,
		type FiltersSearchTab,
		type FiltersSearchState,
	} from '../frame/frameFiltersSearch';
	import { FnRIslandService } from '../../services/serviceFnRIsland.svelte';
	import type { FnRIslandSubmitPayload } from '../../services/serviceFnRIsland.svelte';
	import {
		buildPropSetChange,
		parsePropSetSubmission,
		prefillPropSetIsland,
	} from '../../services/serviceFnRPropSet';
	import type { PendingChange } from '../../types/typeOps';
	import {
		fieldDefinitionsFor,
		setVisibleFieldsForSettings,
		visibleFieldsFromSettings,
	} from '../../services/serviceNodeFieldVisibility';
	import {
		resolveOperationScopeFiles,
		type OperationScope,
	} from '../../services/serviceOperationScope';
	// TODO: por quÃ© setIcon?
	import { setIcon, type TFile } from 'obsidian';

	type NavbarExplorerApi = {
		openViewMenu: () => void;
		openSortMenu: () => void;
	};

	let {
		plugin,
		filtersActiveTab = $bindable('props'),
		filtersSearchByTab = $bindable(createFiltersSearchState()),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0, content: 0 }),
		filtersFnRState = $bindable(createFnRState()),
		filtersOperationScope = $bindable('auto'),
		onOperationScopeChange,
		filtersSortBy = $bindable('name'),
		filtersSortDir = $bindable('asc'),
		filtersSortTarget = $bindable('top'),
		filtersViewMode = $bindable('tree'),
		filtersBaseChooseMode = $bindable(false),
		addMode = $bindable(false),
		filesShowSelectedOnly = $bindable(false),
		filesShowHidden = $bindable(plugin.settings.explorerFilesShowHidden === true),
		manualDndEnabled = $bindable(plugin.settings.manualDndEnabled === true),
		showTabs = true,
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		selectedFilePaths = $bindable(new Set<string>()),
		addOpCount = 0,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersSearchTab;
		filtersSearchByTab: FiltersSearchState;
		filtersSearchCategory: Record<FilTab, number>;
		filtersFnRState: FnRState;
		filtersOperationScope?: OperationScope;
		onOperationScopeChange?: (value: OperationScope) => void;
		filtersSortBy?: string;
		filtersSortDir?: 'asc' | 'desc';
		filtersSortTarget?: ExplorerSortTarget;
		filtersViewMode?: any;
		filtersBaseChooseMode?: boolean;
		addMode?: boolean;
		filesShowSelectedOnly?: boolean;
		filesShowHidden?: boolean;
		manualDndEnabled?: boolean;
		showTabs?: boolean;
		tagsExplorer?: explorerTags | undefined;
		propExplorer?: explorerProps | undefined;
		fileList?: explorerFiles | undefined;
		selectedCount?: number;
		selectedFilePaths?: Set<string>;
		addOpCount?: number;
	} = $props();

	const basesImportTargetsIndex = $derived(createBasesImportTargetsIndex(plugin.app));
	const basesImportProvider = $derived(
		new explorerBasesImport({
			index: basesImportTargetsIndex,
			onImportTarget: (target) => {
				void handleBasesImportTarget(target);
			},
		}),
	);
	let basesImportVersion = $state(0);
	let lastBasesImportPreview = $state<ReturnType<typeof previewBasesImport> | null>(null);
	let nodeExpansionSerial = $state(0);
	let nodeExpansionSummaries = $state<Record<FiltersSearchTab, ExplorerExpansionSummary>>(
		createExpansionSummaryState(),
	);
	let nodeExpansionCommands = $state<Record<FiltersSearchTab, ExplorerExpansionCommand | null>>(
		createExpansionCommandState(),
	);
	let fieldVisibilityVersion = $state(0);

	const activeNodeExpansionSummary = $derived(
		nodeExpansionSummaries[filtersActiveTab] ?? emptyExpansionSummary(),
	);
	const activeFieldDefinitions = $derived(
		fieldDefinitionsFor(providerIdForTab(filtersActiveTab), filtersViewMode as ExplorerViewMode),
	);
	const activeVisibleFields = $derived(
		visibleFieldsFor(filtersActiveTab, filtersViewMode as ExplorerViewMode),
	);

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}

	function initialFnRFlags(): { regex: boolean } {
		return { regex: plugin.settings.fnrRegexDefault === true };
	}

	const activeFiltersSearch = $derived(getFiltersSearch(filtersSearchByTab, filtersActiveTab));
	const activeFiltersSearchHistory = $derived(
		getFiltersSearchHistory(filtersSearchByTab, filtersActiveTab),
	);
	const disabledChooseTabs = $derived(
		filtersBaseChooseMode ? FTabs.filter((tab) => tab.id !== 'files').map((tab) => tab.id) : [],
	);

	$effect(() => {
		if (!filtersBaseChooseMode) return;
		filtersActiveTab = 'files';
		filtersViewMode = 'tree';
		void refreshBasesImportTargets();
	});

	// Panel-scoped FnR island service. Single instance per page so the
	// searchbox-mounted island does not double-mount. Initial regex flag
	// state honours the `fnrRegexDefault` setting (Phase 8 multifacet 2).
	const fnrIslandService = new FnRIslandService({
		initialFlags: initialFnRFlags(),
		dispatch: handleFnRSubmit,
	});
	let navbarExplorerApi = $state<NavbarExplorerApi | null>(null);

	$effect(() => {
		fnrIslandService.setActiveExplorer(filtersActiveTab);
	});

	// Surface the panel-scoped FnR island service to the plugin so the
	// `vaultman:open-find-replace-active-explorer` command can drive it.
	// Cleared on unmount so stale refs do not survive a re-mount.
	$effect(() => {
		(
			plugin as VaultmanPlugin & {
				activeFnRIslandService?: FnRIslandService | null;
			}
		).activeFnRIslandService = fnrIslandService;
		return () => {
			(
				plugin as VaultmanPlugin & {
					activeFnRIslandService?: FnRIslandService | null;
				}
			).activeFnRIslandService = null;
		};
	});

	$effect(() => {
		const openViewMenu = () => navbarExplorerApi?.openViewMenu();
		const openSortMenu = () => navbarExplorerApi?.openSortMenu();
		const openContentSearch = (term: string) => {
			filtersActiveTab = 'content';
			setContentSearch(term);
			plugin.contentIndex.setQuery(term);
		};

		plugin.openViewMenuHook = openViewMenu;
		plugin.openSortMenuHook = openSortMenu;
		plugin.openContentSearchHook = openContentSearch;

		return () => {
			if (plugin.openViewMenuHook === openViewMenu) plugin.openViewMenuHook = null;
			if (plugin.openSortMenuHook === openSortMenu) plugin.openSortMenuHook = null;
			if (plugin.openContentSearchHook === openContentSearch) plugin.openContentSearchHook = null;
		};
	});

	function handleCrear(change: PendingChange): void {
		const scopedChange = withScopeFiles(change);
		if (scopedChange.files.length === 0) return;
		void plugin.queueService.add(scopedChange);
	}

	function handleFnRSubmit(payload: FnRIslandSubmitPayload): void {
		const parsed = parsePropSetSubmission(payload);
		if (!parsed) return;
		const change = buildPropSetChange(operationScopeFiles(), parsed.key, parsed.value);
		if (!change) return;
		void plugin.queueService.add(change);
	}

	function openPropSetIsland(propName: string): void {
		prefillPropSetIsland(fnrIslandService, propName);
	}

	function withScopeFiles(change: PendingChange): PendingChange {
		if (change.files.length > 0) return change;
		return { ...change, files: operationScopeFiles() } as PendingChange;
	}

	function operationScopeFiles(): TFile[] {
		const filteredFiles = [...(plugin.filterService.filteredFiles ?? [])] as TFile[];
		const selectedFiles = selectedOperationFiles();
		const scope = filtersOperationScope ?? plugin.settings.explorerOperationScope ?? 'auto';
		return resolveOperationScopeFiles({ scope, selectedFiles, filteredFiles });
	}

	function selectedOperationFiles(): TFile[] {
		const fromPaths = [...selectedFilePaths]
			.map((path) => plugin.app.vault.getFileByPath(path) ?? null)
			.filter((file): file is TFile => Boolean(file));
		if (fromPaths.length > 0) return fromPaths;
		return [...(plugin.filterService.selectedFiles ?? [])] as TFile[];
	}

	function setActiveFiltersSearch(term: string): void {
		filtersSearchByTab = setFiltersSearch(filtersSearchByTab, filtersActiveTab, term);
	}

	function commitActiveFiltersSearch(term: string): void {
		filtersSearchByTab = addFiltersSearchHistory(filtersSearchByTab, filtersActiveTab, term);
	}

	function setNodeExpansionSummary(tab: FiltersSearchTab, summary: ExplorerExpansionSummary): void {
		const current = nodeExpansionSummaries[tab];
		if (
			current?.canToggle === summary.canToggle &&
			current?.hasExpandedParents === summary.hasExpandedParents
		) {
			return;
		}
		nodeExpansionSummaries = { ...nodeExpansionSummaries, [tab]: summary };
	}

	function requestNodeExpansionToggle(): void {
		if (!activeNodeExpansionSummary.canToggle) return;
		nodeExpansionSerial += 1;
		nodeExpansionCommands = {
			...nodeExpansionCommands,
			[filtersActiveTab]: {
				serial: nodeExpansionSerial,
				action: activeNodeExpansionSummary.hasExpandedParents ? 'collapse-all' : 'expand-all',
			},
		};
	}

	function setFilesShowHidden(active: boolean): void {
		filesShowHidden = active;
		plugin.settings.explorerFilesShowHidden = active;
		void plugin.saveSettings?.();
	}

	function setManualDndEnabled(active: boolean): void {
		manualDndEnabled = active;
		plugin.settings.manualDndEnabled = active;
		void plugin.saveSettings?.();
	}

	function providerIdForTab(tab: FiltersSearchTab): string {
		return tab;
	}

	function visibleFieldsFor(tab: FiltersSearchTab, mode: ExplorerViewMode): string[] {
		void fieldVisibilityVersion;
		return visibleFieldsFromSettings(plugin.settings, providerIdForTab(tab), mode);
	}

	async function setActiveVisibleFields(fields: string[]): Promise<void> {
		await setVisibleFieldsForSettings(
			plugin,
			providerIdForTab(filtersActiveTab),
			filtersViewMode as ExplorerViewMode,
			fields,
		);
		fieldVisibilityVersion += 1;
	}

	function setContentSearch(term: string): void {
		filtersSearchByTab = setFiltersSearch(filtersSearchByTab, 'content', term);
	}

	async function refreshBasesImportTargets(): Promise<void> {
		await basesImportTargetsIndex.refresh();
		basesImportVersion++;
	}

	async function handleBasesImportTarget(target: BasesImportTarget): Promise<void> {
		const file = plugin.app.vault.getFileByPath(target.sourcePath);
		if (!file) return;

		const sourceContent = await plugin.app.vault.read(file);
		const block =
			target.kind === 'markdown-fence'
				? extractBasesFencedBlocks(sourceContent).find(
						(candidate) => candidate.blockIndex === target.blockIndex,
					)
				: undefined;
		const preview = previewBasesImport({
			sourcePath: target.sourcePath,
			content: block?.rawContent ?? sourceContent,
			kind: target.kind,
			blockIndex: target.blockIndex,
			lineStart: block?.lineStart ?? target.lineStart,
			targetViewName: target.targetViewName,
		});
		lastBasesImportPreview = preview;

		if (preview.filter) {
			plugin.filterService.setFilter(preview.filter as FilterGroup);
			void plugin.activeFiltersIndex.refresh();
		}
		filtersBaseChooseMode = false;
		filtersActiveTab = 'files';
	}

	function startRenameHandoff(handoff: FnRRenameHandoff): void {
		if (isActiveRenameHandoff(handoff)) {
			filtersFnRState = {
				...filtersFnRState,
				expanded: true,
				replace: handoff.replacement,
				scope: handoff.scope,
				rename: handoff,
			};
			return;
		}
		filtersFnRState = { ...filtersFnRState, rename: handoff };
	}

	function updateRenameReplacement(replacement: string): void {
		filtersFnRState = updateRenameHandoffReplacement(filtersFnRState, replacement);
	}

	function cancelRename(): void {
		filtersFnRState = cancelRenameHandoff(filtersFnRState);
	}

	function queueRename(): void {
		const change = buildRenameHandoffChange(filtersFnRState.rename);
		if (!change) return;
		void plugin.queueService.add(change);
		filtersFnRState = markRenameHandoffQueued(filtersFnRState);
	}

	function isActiveRenameHandoff(handoff: FnRRenameHandoff): handoff is ActiveFnRRenameHandoff {
		return handoff.status === 'editing' || handoff.status === 'ready';
	}

	function emptyExpansionSummary(): ExplorerExpansionSummary {
		return { canToggle: false, hasExpandedParents: false };
	}

	function createExpansionSummaryState(): Record<FiltersSearchTab, ExplorerExpansionSummary> {
		return {
			props: emptyExpansionSummary(),
			files: emptyExpansionSummary(),
			tags: emptyExpansionSummary(),
			content: emptyExpansionSummary(),
		};
	}

	function createExpansionCommandState(): Record<
		FiltersSearchTab,
		ExplorerExpansionCommand | null
	> {
		return {
			props: null,
			files: null,
			tags: null,
			content: null,
		};
	}
</script>

{#if showTabs}
	<NavbarTabs
		tabs={FTabs}
		bind:active={filtersActiveTab as string}
		showLabels={plugin.settings.filtersShowTabLabels}
		disabledTabIds={disabledChooseTabs}
		faintTabIds={disabledChooseTabs}
	/>
{/if}

<NavbarExplorer
	bind:this={navbarExplorerApi}
	activeTab={filtersActiveTab}
	filtersSearch={activeFiltersSearch}
	onSearchChange={setActiveFiltersSearch}
	searchHistory={activeFiltersSearchHistory}
	onSearchHistoryCommit={commitActiveFiltersSearch}
	bind:filtersSearchCategory
	bind:sortBy={filtersSortBy}
	bind:sortDirection={filtersSortDir}
	bind:sortTarget={filtersSortTarget}
	bind:viewMode={filtersViewMode}
	bind:addMode
	bind:operationScope={filtersOperationScope}
	bind:filesShowSelectedOnly
	bind:filesShowHidden
	bind:manualDndEnabled
	{onOperationScopeChange}
	onFilesShowHiddenChange={setFilesShowHidden}
	onManualDndChange={setManualDndEnabled}
	{tagsExplorer}
	{propExplorer}
	{fileList}
	fnrState={filtersFnRState}
	onRenameReplacementChange={updateRenameReplacement}
	onRenameConfirm={queueRename}
	onRenameCancel={cancelRename}
	nodeExpansionSummary={activeNodeExpansionSummary}
	onToggleNodeExpansion={requestNodeExpansionToggle}
	{addOpCount}
	{icon}
	{fnrIslandService}
	mouseGestureConfig={plugin.settings?.mouseGestures?.toolbar}
	onCrear={handleCrear}
	fieldDefinitions={activeFieldDefinitions}
	visibleFields={activeVisibleFields}
	onVisibleFieldsChange={(fields) => void setActiveVisibleFields(fields)}
/>

<div
	class="vm-tab-area"
	data-bases-import-applied={lastBasesImportPreview?.report.applied.length}
	data-bases-import-unsupported={lastBasesImportPreview?.report.unsupported.length}
>
	{#if filtersBaseChooseMode}
		<div class="vm-tab-content is-active">
			{#key basesImportVersion}
				<PanelExplorer
					{plugin}
					provider={basesImportProvider}
					active={filtersBaseChooseMode}
					bind:viewMode={filtersViewMode}
					searchTerm={filtersSearchByTab.files}
					searchMode={filtersSearchCategory.files}
					bind:sortBy={filtersSortBy}
					bind:sortDirection={filtersSortDir}
					sortTarget={filtersSortTarget}
					nodeExpansionCommand={nodeExpansionCommands.files}
					onNodeExpansionSummaryChange={(summary) => setNodeExpansionSummary('files', summary)}
					visibleFields={visibleFieldsFor('files', filtersViewMode as ExplorerViewMode)}
					{manualDndEnabled}
					{icon}
				/>
			{/key}
		</div>
	{:else}
		<div class="vm-tab-content" class:is-active={filtersActiveTab === 'props'}>
			<FiltersPropsTab
				{plugin}
				searchTerm={filtersSearchByTab.props}
				searchMode={filtersSearchCategory.props}
				bind:sortBy={filtersSortBy}
				bind:sortDirection={filtersSortDir}
				sortTarget={filtersSortTarget}
				bind:viewMode={filtersViewMode}
				bind:explorer={propExplorer}
				active={filtersActiveTab === 'props'}
				nodeExpansionCommand={nodeExpansionCommands.props}
				onNodeExpansionSummaryChange={(summary) => setNodeExpansionSummary('props', summary)}
				visibleFields={visibleFieldsFor('props', filtersViewMode as ExplorerViewMode)}
				{manualDndEnabled}
				{startRenameHandoff}
				{openPropSetIsland}
			/>
		</div>
		<div class="vm-tab-content" class:is-active={filtersActiveTab === 'files'}>
			<FiltersFilesTab
				{plugin}
				searchTerm={filtersSearchByTab.files}
				searchMode={filtersSearchCategory.files}
				bind:sortBy={filtersSortBy}
				bind:sortDirection={filtersSortDir}
				sortTarget={filtersSortTarget}
				bind:viewMode={filtersViewMode}
				bind:fileList
				bind:selectedFilePaths
				showSelectedOnly={filesShowSelectedOnly}
				showHiddenFiles={filesShowHidden}
				onSelectionChange={(c) => (selectedCount = c)}
				active={filtersActiveTab === 'files'}
				nodeExpansionCommand={nodeExpansionCommands.files}
				onNodeExpansionSummaryChange={(summary) => setNodeExpansionSummary('files', summary)}
				visibleFields={visibleFieldsFor('files', filtersViewMode as ExplorerViewMode)}
				{manualDndEnabled}
				{startRenameHandoff}
			/>
		</div>
		<div class="vm-tab-content" class:is-active={filtersActiveTab === 'tags'}>
			<FiltersTagsTab
				{plugin}
				searchTerm={filtersSearchByTab.tags}
				searchMode={filtersSearchCategory.tags}
				bind:sortBy={filtersSortBy}
				bind:sortDirection={filtersSortDir}
				sortTarget={filtersSortTarget}
				bind:viewMode={filtersViewMode}
				bind:explorer={tagsExplorer}
				active={filtersActiveTab === 'tags'}
				nodeExpansionCommand={nodeExpansionCommands.tags}
				onNodeExpansionSummaryChange={(summary) => setNodeExpansionSummary('tags', summary)}
				visibleFields={visibleFieldsFor('tags', filtersViewMode as ExplorerViewMode)}
				{manualDndEnabled}
				{startRenameHandoff}
			/>
		</div>
		<div class="vm-tab-content" class:is-active={filtersActiveTab === 'content'}>
			<ContentTab
				{plugin}
				query={filtersSearchByTab.content}
				onQueryChange={setContentSearch}
				bind:fnrState={filtersFnRState}
				{selectedFilePaths}
				bind:sortBy={filtersSortBy}
				bind:sortDirection={filtersSortDir}
				sortTarget={filtersSortTarget}
				bind:viewMode={filtersViewMode}
				active={filtersActiveTab === 'content'}
				nodeExpansionCommand={nodeExpansionCommands.content}
				onNodeExpansionSummaryChange={(summary) => setNodeExpansionSummary('content', summary)}
				visibleFields={visibleFieldsFor('content', filtersViewMode as ExplorerViewMode)}
				{manualDndEnabled}
				{icon}
			/>
		</div>
	{/if}
</div>
