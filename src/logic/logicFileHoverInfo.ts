import type { FilesHoverInfoField } from '../types/typeSettings';

export interface FileHoverInfoData {
	path: string;
	modified: string | null;
	created: string | null;
	words: number | null;
	characters: number | null;
	tasks: number | null;
}

export function buildFileHoverInfo(
	fields: readonly FilesHoverInfoField[],
	data: FileHoverInfoData,
	labels: Record<FilesHoverInfoField, string>,
): string {
	const lines: string[] = [];
	for (const field of fields) {
		const value = data[field];
		if (value === null || value === '') continue;
		lines.push(`${labels[field]}: ${String(value)}`);
	}
	return lines.join('\n');
}

export function filesHoverNeedsStatistics(
	fields: readonly FilesHoverInfoField[],
): boolean {
	return (
		fields.includes('words') ||
		fields.includes('characters') ||
		fields.includes('tasks')
	);
}
