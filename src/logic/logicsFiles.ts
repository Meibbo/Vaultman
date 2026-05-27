// src/logic/FilesLogic.ts
import type { App, TFile } from 'obsidian';
import type { TreeNode, FileMeta } from '../types/typeTree';

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
	buildFileTree(filteredFiles: TFile[]): TreeNode<FileMeta>[] {
		const root: TreeNode<FileMeta>[] = [];
		const folderMap = new Map<string, TreeNode<FileMeta>>();

		const sortedFiles = [...filteredFiles].sort((a, b) =>
			a.path.localeCompare(b.path),
		);

		for (const file of sortedFiles) {
			const rawPath = file.parent?.path ?? '';
			const folderPath = rawPath === '/' ? '' : rawPath;
			if (folderPath && !folderMap.has(folderPath)) {
				const parts = folderPath.split('/');
				const folderNode: TreeNode<FileMeta> = {
					id: `folder:${folderPath}`,
					label: parts[parts.length - 1],
					depth: parts.length - 1,
					children: [],
					meta: { file: null, isFolder: true, folderPath },
				};
				folderMap.set(folderPath, folderNode);
				// attach to correct parent folder or root
				const parentPath = parts.slice(0, -1).join('/');
				const parentNode = parentPath ? folderMap.get(parentPath) : null;
				(parentNode?.children ?? root).push(folderNode);
			}

			const cache = this.app.metadataCache.getFileCache(file);
			const propCount = Object.keys(cache?.frontmatter ?? {}).filter(
				(k) => k !== 'position',
			).length;

			const fileNode: TreeNode<FileMeta> = {
				id: file.path,
				label: file.basename,
				count: propCount,
				depth: folderPath.split('/').filter(Boolean).length,
				children: [],
				meta: { file, isFolder: false, folderPath },
			};

			const parentFolder = folderPath ? folderMap.get(folderPath) : null;
			(parentFolder?.children ?? root).push(fileNode);
		}
		return root;
	}

	/** Filter flat file list by name/folder substring */
	filterFlat(files: TFile[], name: string, folder: string): TFile[] {
		let result = files;
		if (name) result = result.filter(f => f.basename.toLowerCase().includes(name.toLowerCase()));
		if (folder) result = result.filter(f => f.path.toLowerCase().includes(folder.toLowerCase()));
		return result;
	}
}
