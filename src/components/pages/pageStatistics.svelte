<script lang="ts">
	import { setIcon, TFile } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { VaultmanPlugin } from '../../main';
	import type {
		StatisticsSnapshot,
		StatisticsScope,
	} from '../../services/serviceStatisticsCache';
	import {
		filesForStatisticsScope,
		folderCountForStatisticsFiles,
	} from '../../logic/logicStatisticsScope';
	import {
		dataTabForStatisticsCard,
		type StatisticsDataTab,
		type StatisticsNavigationCard,
	} from '../../logic/logicStatisticsNavigation';
	import NavbarFilters from '../layout/navbarFilters.svelte';

	let {
		plugin,
		active = false,
		settingsRevision = 0,
		onNavigateToDataTab,
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
		settingsRevision?: number;
		onNavigateToDataTab?: (tab: StatisticsDataTab) => void;
	} = $props();
	const minimalStyle = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.minimalStyle;
	});

	type Scope = StatisticsScope;
	let scope = $state<Scope>('vault');
	let statsRevision = $state(0);
	let statsReconciling = $state(false);
	let headerSearch = $state('');
	let headerSearchCategory = $state({ files: 0, props: 0, tags: 0 });
	let metaStatsRun = 0;
	let lastStatsSignature = '';
	let computingSignature = '';

	let statsSnapshot = $state<StatisticsSnapshot>({
		folders: 0,
		files: 0,
		props: 0,
		values: 0,
		tags: 0,
		links: 0,
		words: 0,
		tasks: 0,
		cacheHits: 0,
		filesRead: 0,
		durationMs: 0,
	});

	function scopedFiles(): TFile[] {
		return filesForStatisticsScope(scope, {
			markdownFiles: plugin.app.vault.getMarkdownFiles(),
			filteredFiles: plugin.filterService.filteredFiles,
			activeFile: plugin.app.workspace.getActiveFile(),
		});
	}

	function folderCountForFiles(files: TFile[]): number {
		return folderCountForStatisticsFiles(files);
	}

	$effect(() => {
		void statsRevision;
		if (!active) {
			metaStatsRun += 1;
			computingSignature = '';
			statsReconciling = false;
			return;
		}

		const files = scopedFiles();
		const folders = folderCountForFiles(files);
		const signature = plugin.statisticsCache.snapshotSignatureFor(
			files,
			folders,
		);
		if (signature === lastStatsSignature) return;
		lastStatsSignature = signature;
		if (computingSignature === signature) return;

		const runId = ++metaStatsRun;
		computingSignature = signature;
		const lastGood =
			plugin.statisticsCache.getLastGoodSnapshot(signature) ??
			plugin.statisticsCache.getLastGoodSnapshotForScope(scope);
		if (lastGood) statsSnapshot = lastGood;
		statsReconciling = true;

		void plugin.statisticsCache
			.computeSnapshot({
				files,
				folders,
				scope,
				shouldContinue: () => runId === metaStatsRun,
				onPartial: lastGood
					? undefined
					: (snapshot) => {
							if (runId === metaStatsRun) statsSnapshot = snapshot;
						},
			})
			.then((snapshot) => {
				if (runId !== metaStatsRun) return;
				statsSnapshot = snapshot;
				statsReconciling = false;
				computingSignature = '';
			})
			.catch((error) => {
				if (runId !== metaStatsRun) return;
				statsReconciling = false;
				computingSignature = '';
				console.warn('[Vaultman] Failed to compute statistics', error);
			});
	});

	$effect(() => {
		const bump = () => {
			lastStatsSignature = '';
			statsRevision += 1;
		};

		plugin.statisticsCache.on('changed', bump);
		plugin.filterService.on('changed', bump);
		plugin.queueService.on('executed', bump);
		const fileOpenRef = plugin.app.workspace.on('file-open', bump);

		return () => {
			plugin.statisticsCache.off('changed', bump);
			plugin.filterService.off('changed', bump);
			plugin.queueService.off('executed', bump);
			plugin.app.workspace.offref(fileOpenRef);
		};
	});

	let counts = $derived({
		folders: statsSnapshot.folders,
		files: statsSnapshot.files,
		props: statsSnapshot.props,
		values: statsSnapshot.values,
		tags: statsSnapshot.tags,
	});

	const openedTodayCount = $derived.by(() => {
		void statsRevision;
		return plugin.lastOpenedService.openedTodayCount();
	});

	const statCards = $derived([
		{
			id: 'folders' as StatisticsNavigationCard,
			label: translate('stats.folders'),
			icon: 'lucide-folder',
			value: counts.folders,
			color: 'var(--color-blue)',
		},
		{
			id: 'files' as StatisticsNavigationCard,
			label: translate('stats.files'),
			icon: 'lucide-file-text',
			value: counts.files,
			color: 'var(--color-green)',
		},
		{
			id: 'props' as StatisticsNavigationCard,
			label: translate('stats.props'),
			icon: 'lucide-tag',
			value: counts.props,
			color: 'var(--color-orange)',
		},
		{
			id: 'values' as StatisticsNavigationCard,
			label: translate('stats.values'),
			icon: 'lucide-list',
			value: counts.values,
			color: 'var(--color-purple)',
		},
		{
			id: 'tags' as StatisticsNavigationCard,
			label: translate('stats.tags'),
			icon: 'lucide-hash',
			value: counts.tags,
			color: 'var(--color-red)',
		},
		{
			id: 'words' as StatisticsNavigationCard,
			label: translate('stats.word_count'),
			icon: 'lucide-type',
			value: statsSnapshot.words,
			color: 'var(--color-cyan)',
		},
		{
			id: 'tasks' as StatisticsNavigationCard,
			label: translate('stats.remaining_tasks'),
			icon: 'lucide-square-check-big',
			value: statsSnapshot.tasks,
			color: 'var(--color-yellow)',
		},
		{
			id: 'opened-today' as StatisticsNavigationCard,
			label: translate('stats.opened_today'),
			icon: 'lucide-history',
			// BT5-037: a usage metric, not a vault-content count — it reads the
			// last-opened store directly and ignores the scope pills.
			value: openedTodayCount,
			color: 'var(--color-pink)',
		},
	]);

	const scopeOptions: {
		id: Scope;
		label: string;
		icon: string;
		color: string;
	}[] = [
		{
			id: 'vault',
			label: translate('scope.all'),
			icon: 'lucide-database',
			color: 'var(--color-blue)',
		},
		{
			id: 'filtered',
			label: translate('scope.filtered'),
			icon: 'lucide-filter',
			color: 'var(--color-green)',
		},
		{
			id: 'selected',
			label: translate('scope.selected'),
			icon: 'lucide-check-square',
			color: 'var(--color-orange)',
		},
	];

	// Match the explorer toolbar exactly (same labels + icons); statistics can
	// only navigate to the four data surfaces, so it lists just those.
	const statsTabOptions = $derived([
		{
			id: 'files',
			label: translate('filter.tab.files'),
			icon: 'lucide-folder',
		},
		{
			id: 'props',
			label: translate('filter.tab.props'),
			icon: 'lucide-archive',
		},
		{ id: 'tags', label: translate('filter.tab.tags'), icon: 'lucide-tag' },
		{
			id: 'content',
			label: translate('filter.tab.content'),
			icon: 'lucide-file-search',
		},
	]);

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	function navigateFromCard(card: StatisticsNavigationCard) {
		onNavigateToDataTab?.(dataTabForStatisticsCard(card));
	}

	function navigateFromHeader(tab: string) {
		if (tab === 'statistics') return;
		if (
			tab === 'files' ||
			tab === 'props' ||
			tab === 'tags' ||
			tab === 'content'
		) {
			onNavigateToDataTab?.(tab as StatisticsDataTab);
		}
	}
</script>

<div class="vaultman-statistics-page" class:is-reconciling={statsReconciling}>
	<NavbarFilters
		activeTab="files"
		bind:filtersSearch={headerSearch}
		bind:filtersSearchCategory={headerSearchCategory}
		tagsExplorer={undefined}
		propExplorer={undefined}
		fileList={undefined}
		icon={iconAction}
		{minimalStyle}
		showDock={false}
		tabOptions={statsTabOptions}
		activeSectionTab="statistics"
		onSectionTabChange={navigateFromHeader}
		showExplorerControls={false}
	/>
	<div class="vaultman-stat-cards-grid">
		{#each statCards as card (card.icon)}
			<button
				type="button"
				class="clickable-icon vaultman-stat-card"
				style="--card-color: {card.color}"
				aria-label={`${card.label}: ${card.value.toLocaleString()}`}
				onclick={() => navigateFromCard(card.id)}
			>
				<div class="vaultman-stat-card-icon" use:iconAction={card.icon}></div>
				<div class="vaultman-stat-card-info">
					<span class="vaultman-stat-card-value"
						>{card.value.toLocaleString()}</span
					>
					<span class="vaultman-stat-card-label">{card.label}</span>
				</div>
			</button>
		{/each}
	</div>
	<div class="vaultman-stat-header">
		<div class="vaultman-stat-scope-pills">
			{#each scopeOptions as opt (opt.id)}
				<button
					class="clickable-icon vaultman-stat-scope-pill"
					class:is-active={scope === opt.id}
					style="--scope-color: {opt.color}"
					onclick={() => (scope = opt.id)}
					aria-label={opt.label}
				>
					<span class="vaultman-pill-icon" use:iconAction={opt.icon}></span>
					<span class="vaultman-pill-label">{opt.label}</span>
				</button>
			{/each}
		</div>
	</div>
	<div class="vaultman-stat-meta-island">
		{#if statsReconciling}
			<div class="vaultman-stat-meta-item vaultman-stat-reconcile-status">
				<span class="vaultman-meta-icon" use:iconAction={'lucide-refresh-cw'}
				></span>
				<span class="vaultman-meta-label">{translate('stats.reconciling')}</span
				>
			</div>
		{/if}
		<div class="vaultman-stat-meta-item">
			<span class="vaultman-meta-icon" use:iconAction={'lucide-link'}></span>
			<span class="vaultman-meta-label">{translate('stats.total_links')}</span>
			<span class="vaultman-meta-value"
				>{statsSnapshot.links.toLocaleString()}</span
			>
		</div>
	</div>
</div>
