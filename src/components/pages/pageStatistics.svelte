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

	let {
		plugin,
		active = false,
		onNavigateToDataTab,
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
		onNavigateToDataTab?: (tab: StatisticsDataTab) => void;
	} = $props();

	type Scope = StatisticsScope;
	let scope = $state<Scope>('vault');
	let statsRevision = $state(0);
	let statsReconciling = $state(false);
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
</script>

<div class="vaultman-statistics-page" class:is-reconciling={statsReconciling}>
	<div class="vaultman-stat-cards-grid">
		{#each statCards as card (card.icon)}
			<button
				type="button"
				class="vaultman-stat-card"
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
					class="vaultman-stat-scope-pill"
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
		<button
			type="button"
			class="vaultman-stat-meta-item vaultman-stat-meta-action"
			onclick={() => navigateFromCard('words')}
			aria-label={translate('stats.word_count')}
		>
			<span class="vaultman-meta-icon" use:iconAction={'lucide-type'}></span>
			<span class="vaultman-meta-label">{translate('stats.word_count')}</span>
			<span class="vaultman-meta-value"
				>{statsSnapshot.words > 0
					? statsSnapshot.words.toLocaleString()
					: '—'}</span
			>
		</button>
	</div>
</div>
