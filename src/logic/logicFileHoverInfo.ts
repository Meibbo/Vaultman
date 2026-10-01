import {
	normalizeFileHoverEnabled,
	type FileHoverInfoId,
} from './logicCellRegistry';

export const FOLDER_HOVER_INFO_FIELDS = [
	'files',
	'folders',
	'words',
	'tags',
	'tasks',
] as const;
export type FolderHoverInfoField = (typeof FOLDER_HOVER_INFO_FIELDS)[number];
export const DEFAULT_FOLDER_HOVER_INFO: readonly FolderHoverInfoField[] = [
	'files',
	'folders',
	'words',
];

export function normalizeFolderHoverInfo(value: unknown): FolderHoverInfoField[] {
	if (!Array.isArray(value)) return [...DEFAULT_FOLDER_HOVER_INFO];
	const allowed = new Set<string>(FOLDER_HOVER_INFO_FIELDS);
	return [...new Set(value.filter((field): field is FolderHoverInfoField =>
		typeof field === 'string' && allowed.has(field),
	))];
}

export interface FileHoverInfoData {
	[id: string]: string | number | null | undefined;
	label: string;
	path: string;
	mtime: string | null;
	ctime: string | null;
	opened: string | null;
	ext: string;
	words: number | null;
	characters: number | null;
	tasks: number | string | null;
	count: number | null;
}

export function buildFileHoverInfo(
	fields: readonly string[],
	data: FileHoverInfoData,
	labels: Readonly<Record<FileHoverInfoId, string>>,
): string {
	const lines: string[] = [];
	for (const field of normalizeFileHoverEnabled(fields)) {
		const value = data[field];
		if (value == null || value === '') continue;
		lines.push(`${labels[field] ?? field}: ${String(value)}`);
	}
	return lines.join('\n');
}

export function filesHoverNeedsStatistics(fields: readonly string[]): boolean {
	const normalized = normalizeFileHoverEnabled(fields);
	return (
		normalized.includes('words') ||
		normalized.includes('characters') ||
		normalized.includes('tasks')
	);
}
