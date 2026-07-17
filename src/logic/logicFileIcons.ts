import type { FilesIconScope } from '../types/typeSettings';

export interface ExplorerIconValue {
	icon?: string;
	color?: string;
}

export interface ResolvedExplorerIcon {
	icon: string;
	color?: string;
}

export function normalizeFilesIconScope(value: unknown): FilesIconScope {
	return value === 'files' ||
		value === 'folders' ||
		value === 'custom' ||
		value === 'all'
		? value
		: 'all';
}

export function resolveScopedFileIcon(
	scope: FilesIconScope,
	isFolder: boolean,
	defaultIcon: string,
	iconic: ExplorerIconValue | null,
): ResolvedExplorerIcon | null {
	if (scope === 'files' && isFolder) return null;
	if (scope === 'folders' && !isFolder) return null;
	if (scope === 'custom' && !iconic) return null;

	return {
		icon: iconic?.icon ?? defaultIcon,
		...(iconic?.color ? { color: iconic.color } : {}),
	};
}
