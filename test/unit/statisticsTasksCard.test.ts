import type { App, CachedMetadata, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { StatisticsCacheService } from '../../src/services/serviceStatisticsCache';
import statisticsPageSource from '../../src/components/pages/pageStatistics.svelte?raw';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path.split('/').pop() ?? path,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: makeFolder(
			path.includes('/') ? path.split('/').slice(0, -1).join('/') : '/',
		),
		path,
		stat: { ctime: 0, mtime: 1, size: 10 },
		vault,
	} satisfies TFile;
}

function makeApp(contentByPath: Record<string, string>): App {
	return {
		vault: {
			cachedRead: async (file: TFile) => contentByPath[file.path] ?? '',
		},
		metadataCache: {
			getFileCache: () => ({ frontmatter: {} }) as unknown as CachedMetadata,
		},
	} as unknown as App;
}

describe('BT5-014 remaining-tasks statistics card', () => {
	it('aggregates remaining tasks from the shared cache into the snapshot', async () => {
		const a = makeFile('a.md');
		const b = makeFile('b.md');
		const service = new StatisticsCacheService(
			makeApp({
				'a.md': '- [ ] one\n- [x] done\n- [ ] two',
				'b.md': '- [ ] three',
			}),
		);

		const snapshot = await service.computeSnapshot({
			files: [a, b],
			folders: 0,
			scope: 'vault',
		});
		// Two unchecked in a.md plus one in b.md; the checked one does not count.
		expect(snapshot.tasks).toBe(3);
	});

	it('reads the aggregate from cache on the second pass, no rescan', async () => {
		const a = makeFile('a.md');
		const service = new StatisticsCacheService(
			makeApp({ 'a.md': '- [ ] one\n- [ ] two' }),
		);
		await service.computeSnapshot({ files: [a], folders: 0, scope: 'vault' });
		const second = await service.computeSnapshot({
			files: [a],
			folders: 0,
			scope: 'vault',
		});
		expect(second.tasks).toBe(2);
		expect(second.filesRead).toBe(0);
	});

	it('renders a Tasks card that projects the snapshot value', () => {
		expect(statisticsPageSource).toContain("id: 'tasks'");
		expect(statisticsPageSource).toContain('statsSnapshot.tasks');
		expect(statisticsPageSource).toContain('stats.remaining_tasks');
	});
});
