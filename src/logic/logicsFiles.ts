// src/logic/FilesLogic.ts
import { TFolder, type App, type TFile } from 'obsidian';
import type { TreeNode, FileMeta } from '../types/typeTree';
import type { ScopeSort } from '../types/typeUI';

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

interface FolderRebaseInfo {
	rootPath: string;
	visualPath: string;
}

export interface BuildFileTreeOptions {
	rebaseFolderPaths?: string[];
	parentsFirst?: boolean;
	sorts?: Partial<Record<'all' | 'drill', ScopeSort>>;
	drillNodeId?: string | null;
	compareNodes?: (
		a: TreeNode<FileMeta>,
		b: TreeNode<FileMeta>,
		sort: ScopeSort,
	) => number;
}

export class FilesLogic {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/** Returns flat sorted file list from filteredFiles (passed in, not re-computed) */
	flatList(filteredFiles: TFile[]): TFile[] {
		return [...filteredFiles];
	}

	/** Returns path-labeled file nodes without structural folder rows. */
	buildFlatFileNodes(
		filteredFiles: TFile[],
		options: BuildFileTreeOptions = {},
	): TreeNode<FileMeta>[] {
		const rebaseFolderPaths = normalizeRebaseFolderPaths(
			options.rebaseFolderPaths ?? [],
		);

		return filteredFiles.flatMap((file) => {
			const rawPath = file.parent?.path ?? '';
			const folderPath = rawPath === '/' ? '' : rawPath;
			const rebaseInfo = rebaseFolderInfo(folderPath, rebaseFolderPaths);
			if (!rebaseInfo) return [];

			const labelPrefix = rebaseInfo.visualPath
				? `${rebaseInfo.visualPath}/`
				: '';
			return [
				{
					id: file.path,
					label: `${labelPrefix}${file.basename}`,
					icon: this.iconForExtension(file.extension),
					showCaret: false,
					depth: 0,
					coreCls: 'tree-item-self nav-file-title tappable is-clickable',
					typeText:
						file.extension && file.extension !== 'md'
							? file.extension
							: undefined,
					count: this.propCountForFile(file),
					children: [],
					meta: { file, isFolder: false, folderPath },
				},
			];
		});
	}

	/** Returns folder-hierarchy tree from filteredFiles */
	buildFileTree(
		filteredFiles: TFile[],
		knownFolders: TFolder[] = [],
		options: BuildFileTreeOptions = {},
	): TreeNode<FileMeta>[] {
		const root: TreeNode<FileMeta>[] = [];
		const folderMap = new Map<string, TreeNode<FileMeta>>();
		const rebaseFolderPaths = normalizeRebaseFolderPaths(
			options.rebaseFolderPaths ?? [],
		);
		const parentsFirst = options.parentsFirst ?? true;

		const resolveFolder = (folderPath: string): TFolder | null => {
			const vault = this.app.vault as
				| { getAbstractFileByPath?(path: string): unknown }
				| undefined;
			const abstractFile = vault?.getAbstractFileByPath?.(folderPath);
			if (!(abstractFile instanceof TFolder)) return null;
			return abstractFile;
		};

		const ensureFolder = (
			folderPath: string,
		): TreeNode<FileMeta> | null | undefined => {
			if (!folderPath) return null;
			const rebaseInfo = rebaseFolderInfo(folderPath, rebaseFolderPaths);
			if (!rebaseInfo) return undefined;
			if (!rebaseInfo.visualPath) return null;

			const parts = rebaseInfo.visualPath.split('/').filter(Boolean);
			let parentNode: TreeNode<FileMeta> | null = null;

			for (let index = 0; index < parts.length; index += 1) {
				const currentVisualPath = parts.slice(0, index + 1).join('/');
				const currentPath = rebaseInfo.rootPath
					? `${rebaseInfo.rootPath}/${currentVisualPath}`
					: currentVisualPath;
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
					coreCls: 'tree-item-self nav-folder-title is-clickable',
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

		const numericLocale = { numeric: true, sensitivity: 'base' } as const;
		const sortTree = (
			nodes: TreeNode<FileMeta>[],
			parentId: string | null = null,
		): TreeNode<FileMeta>[] => {
			// A null parentId (the root level) must never match a null/absent
			// drill target — that let a lingering drill sort capture L1 while
			// every other level followed the all-scope sort (BT4-009).
			const scopeSort =
				parentId !== null && parentId === options.drillNodeId
					? (options.sorts?.drill ?? options.sorts?.all)
					: options.sorts?.all;
			if (options.compareNodes && scopeSort) {
				nodes.sort((a, b) => options.compareNodes!(a, b, scopeSort));
			}

			if (parentsFirst) {
				const folders = nodes
					.filter((node) => node.meta?.isFolder)
					.sort((a, b) =>
						options.compareNodes && scopeSort
							? options.compareNodes(a, b, scopeSort)
							: a.label.localeCompare(b.label, undefined, numericLocale),
					);
				const files = nodes.filter((node) => !node.meta?.isFolder);
				nodes.splice(0, nodes.length, ...folders, ...files);
			}

			for (const node of nodes) {
				if (node.children?.length) sortTree(node.children, node.id);
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
			const rebaseInfo = rebaseFolderInfo(folderPath, rebaseFolderPaths);
			if (!rebaseInfo) continue;
			const parentFolder = ensureFolder(folderPath);
			if (parentFolder === undefined) continue;

			const fileNode: TreeNode<FileMeta> = {
				id: file.path,
				label: file.basename,
				icon: this.iconForExtension(file.extension),
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
				typeText:
					file.extension && file.extension !== 'md'
						? file.extension
						: undefined,
				count: this.propCountForFile(file),
				depth: rebaseInfo.visualPath.split('/').filter(Boolean).length,
				children: [],
				meta: { file, isFolder: false, folderPath },
			};

			(parentFolder?.children ?? root).push(fileNode);
		}
		return sortTree(root);
	}

	private propCountForFile(file: TFile): number {
		const cache = this.app.metadataCache.getFileCache(file);
		return Object.keys(cache?.frontmatter ?? {}).filter(
			(key) => key !== 'position',
		).length;
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

function normalizeRebaseFolderPaths(folderPaths: string[]): string[] {
	return Array.from(
		new Set(
			folderPaths
				.map((path) => path.trim().replace(/^\/|\/$/g, ''))
				.filter((path) => path.length > 0),
		),
	).sort((a, b) => b.length - a.length);
}

function rebaseFolderInfo(
	folderPath: string,
	rebaseFolderPaths: string[],
): FolderRebaseInfo | null {
	const normalizedFolder = folderPath.trim().replace(/^\/|\/$/g, '');
	if (rebaseFolderPaths.length === 0) {
		return { rootPath: '', visualPath: normalizedFolder };
	}
	for (const rootPath of rebaseFolderPaths) {
		if (normalizedFolder === rootPath) {
			return { rootPath, visualPath: '' };
		}
		if (normalizedFolder.startsWith(`${rootPath}/`)) {
			return {
				rootPath,
				visualPath: normalizedFolder.slice(rootPath.length + 1),
			};
		}
	}
	return null;
}
