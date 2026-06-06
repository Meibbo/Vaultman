import type { TFile } from 'obsidian';
import type { StatisticsScope } from '../services/serviceStatisticsCache';

export interface StatisticsScopeContext {
	markdownFiles: TFile[];
	filteredFiles: TFile[];
	activeFile: TFile | null;
}

export function filesForStatisticsScope(
	scope: StatisticsScope,
	context: StatisticsScopeContext,
): TFile[] {
	if (scope === 'vault') return context.markdownFiles;
	if (scope === 'filtered') return context.filteredFiles;
	return context.activeFile ? [context.activeFile] : [];
}

export function folderCountForStatisticsFiles(files: TFile[]): number {
	const folders = new Set<string>();
	for (const file of files) {
		const parts = (file.parent?.path ?? '').split('/').filter(Boolean);
		for (let index = 0; index < parts.length; index += 1) {
			folders.add(parts.slice(0, index + 1).join('/'));
		}
	}
	return folders.size;
}
