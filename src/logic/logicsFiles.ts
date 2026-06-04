// src/logic/FilesLogic.ts
import { TFolder, type App, type TFile } from 'obsidian';
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

		const resolveFolder = (folderPath: string): TFolder | null => {
			const vault = this.app.vault as
				| { getAbstractFileByPath?(path: string): unknown }
				| undefined;
			const abstractFile = vault?.getAbstractFileByPath?.(folderPath);
			if (!(abstractFile instanceof TFolder)) return null;
			return abstractFile;
		};

		const ensureFolder = (folderPath: string): TreeNode<FileMeta> | null => {
			if (!folderPath) return null;

			const parts = folderPath.split('/').filter(Boolean);
			let parentNode: TreeNode<FileMeta> | null = null;

			for (let index = 0; index < parts.length; index += 1) {
				const currentPath = parts.slice(0, index + 1).join('/');
				const existing = folderMap.get(currentPath);
				if (existing) {
					parentNode = existing;
					continue;
				}

				const folderNode: TreeNode<FileMeta> = {
					id: `folder:${currentPath}`,
					label: parts[index],
					depth: index,
					children: [],
					meta: { file: null, folder: resolveFolder(currentPath), isFolder: true, folderPath: currentPath },
				};
				folderMap.set(currentPath, folderNode);
				(parentNode?.children ?? root).push(folderNode);
				parentNode = folderNode;
			}

			return folderMap.get(folderPath) ?? null;
		};

		const sortTree = (nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta>[] => {
			nodes.sort((a, b) => {
				const aFolder = Boolean(a.meta?.isFolder);
				const bFolder = Boolean(b.meta?.isFolder);
				if (aFolder !== bFolder) return aFolder ? -1 : 1;
				return a.label.localeCompare(b.label);
			});

			for (const node of nodes) {
				if (node.children?.length) sortTree(node.children);
			}

			return nodes;
		};

		const sortedFiles = [...filteredFiles].sort((a, b) =>
			a.path.localeCompare(b.path),
		);

		for (const file of sortedFiles) {
			const rawPath = file.parent?.path ?? '';
			const folderPath = rawPath === '/' ? '' : rawPath;
			const parentFolder = ensureFolder(folderPath);

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

			(parentFolder?.children ?? root).push(fileNode);
		}
		return sortTree(root);
	}

	/** Filter flat file list by name/folder substring */
	filterFlat(files: TFile[], name: string, folder: string): TFile[] {
		let result = files;
		if (name) result = result.filter(f => f.basename.toLowerCase().includes(name.toLowerCase()));
		if (folder) result = result.filter(f => f.path.toLowerCase().includes(folder.toLowerCase()));
		return result;
	}

	getAncestorFolderIds(files: TFile[]): string[] {
		const ids = new Set<string>();
		for (const file of files) {
			const rawPath = file.parent?.path ?? '';
			const folderPath = rawPath === '/' ? '' : rawPath;
			const parts = folderPath.split('/').filter(Boolean);
			for (let index = 0; index < parts.length; index += 1) {
				ids.add(`folder:${parts.slice(0, index + 1).join('/')}`);
			}
		}
		return Array.from(ids);
	}
}
