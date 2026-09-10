import type { TFile } from 'obsidian';

interface OpenLeaf {
	view?: unknown;
}

export interface OpenFilesWorkspace {
	getLeavesOfType(type: string): readonly OpenLeaf[];
}

export function orderedOpenFilePaths(
	workspace: OpenFilesWorkspace,
	scopeFiles: readonly TFile[],
	activePath: string | null = null,
): string[] {
	const scope = new Set(scopeFiles.map((file) => file.path));
	const paths: string[] = [];
	const seen = new Set<string>();
	for (const leaf of workspace.getLeavesOfType('markdown')) {
		const view = leaf.view as { file?: { path?: string } | null } | undefined;
		const path = view?.file?.path;
		if (!path || !scope.has(path) || seen.has(path)) continue;
		seen.add(path);
		paths.push(path);
	}
	if (activePath && seen.has(activePath)) {
		return [activePath, ...paths.filter((path) => path !== activePath)];
	}
	return paths;
}
