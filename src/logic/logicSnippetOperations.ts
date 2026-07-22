import type { TFile } from 'obsidian';

import { RENAME_FILE, type SnippetRenameChange } from '../types/typeOps';

export function buildSnippetRenameChange(
	file: TFile,
	newName: string,
): SnippetRenameChange {
	const separator = file.path.lastIndexOf('/');
	const parent = separator >= 0 ? file.path.slice(0, separator + 1) : '';
	const targetPath = `${parent}${newName}`;

	return {
		type: 'snippet_rename',
		action: 'rename',
		sourcePath: file.path,
		targetPath,
		details: `${file.name} → ${newName}`,
		files: [file],
		customLogic: true,
		logicFunc: () => ({ [RENAME_FILE]: newName }),
	};
}
