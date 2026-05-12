// src/logic/FilesLogic.ts
import type { App, TFile } from 'obsidian';
import type { TreeNode, FileMeta } from '../types/typeNode';

export class FilesLogic {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/** Returns flat sorted file list from filteredFiles (passed in, not re-computed) */
	flatList(filteredFiles: TFile[]): TFile[] {
		return [...filteredFiles];
	}

	/** Returns folder-hierarchy tree from filteredFiles */
	buildFileTree(
		filteredFiles: TFile[],
		options: { foldersFirst?: boolean } = {},
	): TreeNode<FileMeta>[] {
		const root: TreeNode<FileMeta>[] = [];
		const folderMap = new Map<string, TreeNode<FileMeta>>();

		const sortedFiles = [...filteredFiles].sort((a, b) => a.path.localeCompare(b.path));

		const ensureFolder = (folderPath: string): TreeNode<FileMeta> | null => {
			if (!folderPath) return null;
			const existing = folderMap.get(folderPath);
			if (existing) return existing;

			const parts = folderPath.split('/').filter(Boolean);
			const parentPath = parts.slice(0, -1).join('/');
			const parentNode = ensureFolder(parentPath);
			const folderNode: TreeNode<FileMeta> = {
				id: `folder:${folderPath}`,
				label: parts[parts.length - 1] ?? folderPath,
				depth: Math.max(0, parts.length - 1),
				children: [],
				meta: { file: null, isFolder: true, folderPath },
			};
			folderMap.set(folderPath, folderNode);
			(parentNode?.children ?? root).push(folderNode);
			return folderNode;
		};

		for (const file of sortedFiles) {
			const rawPath = file.parent?.path ?? '';
			const folderPath = rawPath === '/' ? '' : rawPath;
			const parentFolder = folderPath ? ensureFolder(folderPath) : null;
			const cache = this.app.metadataCache.getFileCache(file);
			const propCount = Object.keys(cache?.frontmatter ?? {}).filter(
				(k) => k !== 'position',
			).length;
			const extension = file.extension?.trim() ?? '';
			const isMarkdown = extension.toLowerCase() === 'md';

			const fileNode: TreeNode<FileMeta> = {
				id: file.path,
				label: file.basename,
				count: isMarkdown ? propCount : undefined,
				countLabel: !isMarkdown && extension ? extension : undefined,
				depth: folderPath.split('/').filter(Boolean).length,
				children: [],
				meta: { file, isFolder: false, folderPath },
			};

			(parentFolder?.children ?? root).push(fileNode);
		}
		if (options.foldersFirst) orderFoldersFirst(root);
		return root;
	}

	/** Filter flat file list by name/folder substring */
	filterFlat(
		files: TFile[],
		name: string,
		folder: string,
		getSearchBuffer?: (path: string) => string,
	): TFile[] {
		const nameQuery = name.trim().toLowerCase();
		const folderQuery = folder.trim().toLowerCase();
		if (!nameQuery && !folderQuery) return files;

		return files.filter((file) => {
			if (getSearchBuffer) {
				const buffer = getSearchBuffer(file.path);
				return (
					(!nameQuery || buffer.includes(nameQuery)) &&
					(!folderQuery || buffer.includes(folderQuery))
				);
			}
			return (
				(!nameQuery || file.basename.toLowerCase().includes(nameQuery)) &&
				(!folderQuery || file.path.toLowerCase().includes(folderQuery))
			);
		});
	}
}

function orderFoldersFirst(nodes: TreeNode<FileMeta>[]): void {
	nodes.sort((a, b) => Number(b.meta.isFolder) - Number(a.meta.isFolder));
	for (const node of nodes) {
		if (node.children?.length) orderFoldersFirst(node.children);
	}
}
