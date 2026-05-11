import type { App } from 'obsidian';
import type { FileNode, IFilesIndex } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

export function createFilesIndex(app: App): IFilesIndex {
	return createNodeIndex<FileNode>({
		build: () =>
			(app.vault.getFiles?.() ?? app.vault.getMarkdownFiles()).map((file) => ({
				id: file.path,
				path: file.path,
				basename: file.basename,
				file,
			})),
		searchText: (node) => `${node.basename}\n${node.path}\n${node.file.extension ?? ''}`,
	});
}
