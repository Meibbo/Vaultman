<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { TFile } from 'obsidian';
	import { translate } from '../../i18n/index';
	import type { VaultmanPlugin } from '../../main';

	let { plugin }: { plugin: VaultmanPlugin } = $props();

	type Scope = 'vault' | 'filtered' | 'selected';
	let scope = $state<Scope>('vault');
	let statsRevision = $state(0);

	let metaStats = $state({ links: 0, words: 0, loading: false });
	let metaStatsRun = 0;

	function scopedFiles(): TFile[] {
		if (scope === 'vault') return plugin.app.vault.getMarkdownFiles();
		if (scope === 'filtered') return plugin.filterService.filteredFiles;
		return plugin.filterService.selectedFiles;
	}

	function countWords(content: string): number {
		const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '');
		const words = withoutFrontmatter.trim().match(/\S+/g);
		return words?.length ?? 0;
	}

	function folderCountForFiles(files: TFile[]): number {
		if (scope === 'vault') return plugin.app.vault.getAllFolders(true).length;
		const folders = new Set<string>();
		for (const file of files) {
			const parts = (file.parent?.path ?? '').split('/').filter(Boolean);
			for (let index = 0; index < parts.length; index += 1) {
				folders.add(parts.slice(0, index + 1).join('/'));
			}
		}
		return folders.size;
	}

	function frontmatterEntriesForFiles(files: TFile[]): {
		props: Set<string>;
		values: Set<string>;
		tags: Set<string>;
	} {
		const props = new Set<string>();
		const values = new Set<string>();
		const tags = new Set<string>();

		for (const file of files) {
			const cache = plugin.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter ?? {};
			for (const [key, rawValue] of Object.entries(frontmatter)) {
				if (key === 'position') continue;
				props.add(key);
				const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
				for (const value of rawValues) {
					if (value === undefined || value === null) continue;
					values.add(`${key}:${String(value)}`);
				}
			}

			const frontmatterTags = frontmatter.tags as unknown;
			const normalizedFrontmatterTags = Array.isArray(frontmatterTags)
				? frontmatterTags
				: typeof frontmatterTags === 'string'
					? [frontmatterTags]
					: [];
			for (const tag of normalizedFrontmatterTags) {
				const clean = String(tag).replace(/^#/, '');
				if (clean) tags.add(clean);
			}
			for (const tagCache of cache?.tags ?? []) {
				const clean = tagCache.tag.replace(/^#/, '');
				if (clean) tags.add(clean);
			}
		}

		return { props, values, tags };
	}

	$effect(() => {
		void statsRevision;
		const files = scopedFiles();
		const runId = ++metaStatsRun;
		let cancelled = false;
		metaStats = { links: 0, words: 0, loading: true };
		let totalLinks = 0;
		let totalWords = 0;

		const compute = async () => {
			for (let index = 0; index < files.length; index += 1) {
				if (cancelled || runId !== metaStatsRun) return;
				const file = files[index];
				const cache = plugin.app.metadataCache.getFileCache(file);
				totalLinks +=
					(cache?.links?.length ?? 0) + (cache?.embeds?.length ?? 0);
				const content = await plugin.app.vault.cachedRead(file);
				totalWords += countWords(content);
				if ((index + 1) % 20 === 0) {
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
			}
			if (cancelled || runId !== metaStatsRun) return;
			metaStats = {
				links: totalLinks,
				words: totalWords,
				loading: false,
			};
		};
		void compute();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const bump = () => {
			statsRevision += 1;
		};
		const metadataCache = plugin.app.metadataCache as unknown as {
			on(name: string, callback: () => void): unknown;
			off(name: string, callback: () => void): void;
		};
		const vault = plugin.app.vault as unknown as {
			on(name: string, callback: () => void): unknown;
			off(name: string, callback: () => void): void;
		};

		plugin.filterService.on('changed', bump);
		plugin.queueService.on('executed', bump);
		metadataCache.on('resolved', bump);
		vault.on('modify', bump);
		vault.on('create', bump);
		vault.on('delete', bump);
		vault.on('rename', bump);

		return () => {
			plugin.filterService.off('changed', bump);
			plugin.queueService.off('executed', bump);
			metadataCache.off('resolved', bump);
			vault.off('modify', bump);
			vault.off('create', bump);
			vault.off('delete', bump);
			vault.off('rename', bump);
		};
	});

	let counts = $derived.by(() => {
		void statsRevision;
		const files = scopedFiles();
		const entries = frontmatterEntriesForFiles(files);
		return {
			folders: folderCountForFiles(files),
			files: files.length,
			props: entries.props.size,
			values: entries.values.size,
			tags: entries.tags.size,
		};
	});

	const statCards = $derived([
		{
			label: translate('stats.folders'),
			icon: 'lucide-folder',
			value: counts.folders,
			color: 'var(--color-blue)',
		},
		{
			label: translate('stats.files'),
			icon: 'lucide-file-text',
			value: counts.files,
			color: 'var(--color-green)',
		},
		{
			label: translate('stats.props'),
			icon: 'lucide-tag',
			value: counts.props,
			color: 'var(--color-orange)',
		},
		{
			label: translate('stats.values'),
			icon: 'lucide-list',
			value: counts.values,
			color: 'var(--color-purple)',
		},
		{
			label: translate('stats.tags'),
			icon: 'lucide-hash',
			value: counts.tags,
			color: 'var(--color-red)',
		},
	]);

	const scopeOptions: { id: Scope; label: string; icon: string }[] = [
		{ id: 'vault', label: translate('scope.all'), icon: 'lucide-database' },
		{
			id: 'filtered',
			label: translate('scope.filtered'),
			icon: 'lucide-filter',
		},
		{
			id: 'selected',
			label: translate('scope.selected'),
			icon: 'lucide-check-square',
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
</script>

<div class="vaultman-statistics-page">
	<div class="vaultman-stat-cards-grid">
		{#each statCards as card (card.icon)}
			<div class="vaultman-stat-card" style="--card-color: {card.color}">
				<div class="vaultman-stat-card-icon" use:iconAction={card.icon}></div>
				<div class="vaultman-stat-card-info">
					<span class="vaultman-stat-card-value"
						>{card.value.toLocaleString()}</span
					>
					<span class="vaultman-stat-card-label">{card.label}</span>
				</div>
			</div>
		{/each}
	</div>
	<div class="vaultman-stat-header">
		<div class="vaultman-stat-scope-pills">
			{#each scopeOptions as opt (opt.id)}
				<button
					class="vaultman-stat-scope-pill"
					class:is-active={scope === opt.id}
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
		<div class="vaultman-stat-meta-item">
			<span class="vaultman-meta-icon" use:iconAction={'lucide-link'}></span>
			<span class="vaultman-meta-label">{translate('stats.total_links')}</span>
			<span class="vaultman-meta-value">{metaStats.links.toLocaleString()}</span
			>
		</div>
		<div class="vaultman-stat-meta-item">
			<span class="vaultman-meta-icon" use:iconAction={'lucide-type'}></span>
			<span class="vaultman-meta-label">{translate('stats.word_count')}</span>
			<span class="vaultman-meta-value"
				>{metaStats.words > 0 ? metaStats.words.toLocaleString() : '—'}</span
			>
		</div>
	</div>
</div>
