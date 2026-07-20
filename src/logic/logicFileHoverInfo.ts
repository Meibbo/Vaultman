import {
	normalizeFileHoverEnabled,
	type FileHoverInfoId,
} from './logicCellRegistry';

export interface FileHoverInfoData {
	[id: string]: string | number | null | undefined;
	label: string;
	path: string;
	mtime: string | null;
	ctime: string | null;
	ext: string;
	words: number | null;
	characters: number | null;
	tasks: number | null;
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
