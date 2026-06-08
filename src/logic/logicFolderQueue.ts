import type { TFile } from 'obsidian';

export function filesInsideFolder(files: TFile[], folderPath: string): TFile[] {
	const prefix = normalizedFolderPrefix(folderPath);
	return files.filter((file) => file.path.startsWith(prefix));
}

export function movedParentPathForFolderFile(
	filePath: string,
	fromFolderPath: string,
	toFolderPath: string,
): string {
	const prefix = normalizedFolderPrefix(fromFolderPath);
	if (!filePath.startsWith(prefix)) return parentPath(filePath);
	const relative = filePath.slice(prefix.length);
	const relativeParent = parentPath(relative);
	return joinPath(toFolderPath, relativeParent);
}

function normalizedFolderPrefix(folderPath: string): string {
	return folderPath.replace(/^\/|\/$/g, '') + '/';
}

function parentPath(path: string): string {
	const parts = path.split('/');
	parts.pop();
	return parts.join('/');
}

function joinPath(...parts: string[]): string {
	return parts
		.map((part) => part.replace(/^\/|\/$/g, ''))
		.filter((part) => part.length > 0)
		.join('/');
}
