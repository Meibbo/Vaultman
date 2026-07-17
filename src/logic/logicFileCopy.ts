import type { TFile } from 'obsidian';

export interface FileCopyVault {
	getAbstractFileByPath(path: string): unknown;
	readBinary(file: TFile): Promise<ArrayBuffer>;
	createBinary(path: string, data: ArrayBuffer): Promise<TFile>;
}

export interface FolderCopyPlan {
	folderPaths: string[];
	files: Array<{ file: TFile; targetPath: string }>;
}

export function fileCopyPath(path: string): string {
	const slashIndex = path.lastIndexOf('/');
	const dir = slashIndex >= 0 ? `${path.slice(0, slashIndex)}/` : '';
	const name = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
	const dotIndex = name.lastIndexOf('.');
	const hasExtension = dotIndex > 0;
	const stem = hasExtension ? name.slice(0, dotIndex) : name;
	const extension = hasExtension ? name.slice(dotIndex) : '';
	return `${dir}${stem} copy${extension}`;
}

export function nextAvailableVaultPath(
	path: string,
	exists: (candidate: string) => boolean,
): string {
	const slashIndex = path.lastIndexOf('/');
	const dir = slashIndex >= 0 ? `${path.slice(0, slashIndex)}/` : '';
	const name = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
	const dotIndex = name.lastIndexOf('.');
	const hasExtension = dotIndex > 0;
	const base = `${dir}${hasExtension ? name.slice(0, dotIndex) : name}`;
	const extension = hasExtension ? name.slice(dotIndex) : '';
	let candidate = path;
	let counter = 1;
	while (exists(candidate)) {
		candidate = `${base} ${counter}${extension}`;
		counter += 1;
	}
	return candidate;
}

export async function copyFileBinary(
	vault: FileCopyVault,
	file: TFile,
	targetPath: string,
): Promise<TFile> {
	const uniqueTargetPath = nextAvailableVaultPath(targetPath, (candidate) =>
		Boolean(vault.getAbstractFileByPath(candidate)),
	);
	const data = await vault.readBinary(file);
	return vault.createBinary(uniqueTargetPath, data);
}

export function buildFolderCopyPlan(
	sourceRoot: string,
	targetRoot: string,
	nestedFolderPaths: string[],
	files: TFile[],
): FolderCopyPlan {
	const prefix = `${sourceRoot}/`;
	const relativeTarget = (path: string): string =>
		joinVaultPath(targetRoot, path.slice(prefix.length));
	return {
		folderPaths: nestedFolderPaths
			.filter((path) => path.startsWith(prefix))
			.map(relativeTarget)
			.sort((a, b) => a.localeCompare(b)),
		files: files
			.filter((file) => file.path.startsWith(prefix))
			.map((file) => ({ file, targetPath: relativeTarget(file.path) }))
			.sort((a, b) => a.targetPath.localeCompare(b.targetPath)),
	};
}

function joinVaultPath(...parts: string[]): string {
	return parts
		.map((part) => part.replace(/^\/|\/$/g, ''))
		.filter((part) => part.length > 0)
		.join('/');
}
