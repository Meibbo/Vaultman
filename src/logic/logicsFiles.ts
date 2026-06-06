// src/logic/FilesLogic.ts
import { TFolder, type App, type TFile } from 'obsidian';
import type { TreeNode, FileMeta } from '../types/typeTree';

const IMAGE_EXTENSIONS = new Set([
	'apng',
	'avif',
	'bmp',
	'gif',
	'ico',
	'jpeg',
	'jpg',
	'png',
	'svg',
	'webp',
]);

const CODE_EXTENSIONS = new Set([
	'css',
	'html',
	'js',
	'jsx',
	'json',
	'mdx',
	'scss',
	'ts',
	'tsx',
	'xml',
	'yaml',
	'yml',
]);

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
		knownFolders: TFolder[] = [],
	): TreeNode<FileMeta>[] {
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
					icon: 'lucide-folder',
					showCaret: true,
					depth: index,
					children: [],
					meta: {
						file: null,
						folder: resolveFolder(currentPath),
						isFolder: true,
						folderPath: currentPath,
					},
				};
				folderMap.set(currentPath, folderNode);
				(parentNode?.children ?? root).push(folderNode);
				parentNode = folderNode;
			}

			return folderMap.get(folderPath) ?? null;
		};

		const sortTree = (nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta>[] => {
			const folders = nodes
				.filter((node) => node.meta?.isFolder)
				.sort((a, b) => a.label.localeCompare(b.label));
			const files = nodes.filter((node) => !node.meta?.isFolder);
			nodes.splice(0, nodes.length, ...folders, ...files);

			for (const node of nodes) {
				if (node.children?.length) sortTree(node.children);
			}

			return nodes;
		};

		for (const folder of knownFolders) {
			const folderPath = folder.path === '/' ? '' : folder.path;
			if (folderPath) ensureFolder(folderPath);
		}

		for (const file of filteredFiles) {
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
				icon: this.iconForExtension(file.extension),
				typeText:
					file.extension && file.extension !== 'md'
						? file.extension
						: undefined,
				count: propCount,
				depth: folderPath.split('/').filter(Boolean).length,
				children: [],
				meta: { file, isFolder: false, folderPath },
			};

			(parentFolder?.children ?? root).push(fileNode);
		}
		return sortTree(root);
	}

	private iconForExtension(extension: string): string {
		const ext = extension.toLowerCase();
		if (!ext || ext === 'md' || ext === 'markdown') return 'lucide-file-text';
		if (ext === 'base') return 'lucide-database';
		if (ext === 'canvas') return 'lucide-layout-dashboard';
		if (IMAGE_EXTENSIONS.has(ext)) return 'lucide-image';
		if (ext === 'pdf') return 'lucide-file-text';
		if (CODE_EXTENSIONS.has(ext)) return 'lucide-file-code';
		return 'lucide-file-question';
	}

	/** Filter flat file list by name/folder substring */
	filterFlat(files: TFile[], name: string, folder: string): TFile[] {
		let result = files;
		if (name) {
			const term = name.toLowerCase();
			result = result.filter(
				(f) =>
					f.basename.toLowerCase().includes(term) ||
					f.name.toLowerCase().includes(term) ||
					f.path.toLowerCase().includes(term),
			);
		}
		if (folder)
			result = result.filter((f) =>
				f.path.toLowerCase().includes(folder.toLowerCase()),
			);
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

	getAncestorFolderIdsFromPaths(folderPaths: string[]): string[] {
		const ids = new Set<string>();
		for (const folderPath of folderPaths) {
			const parts = folderPath.split('/').filter(Boolean);
			for (let index = 0; index < parts.length; index += 1) {
				ids.add(`folder:${parts.slice(0, index + 1).join('/')}`);
			}
		}
		return Array.from(ids);
	}
}
