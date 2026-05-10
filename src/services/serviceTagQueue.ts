import type { TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';

export function buildTagAddChange(tagPath: string, files: TFile[]): PendingChange | null {
	const tag = normalizeTag(tagPath);
	if (!tag || files.length === 0) return null;
	return {
		type: 'tag',
		tag,
		action: 'add',
		details: `Add tag "#${tag}"`,
		files,
		customLogic: true,
		logicFunc: (_file, fm: Record<string, unknown>) => {
			const tags = tagValues(fm.tags);
			if (tags.some((value) => normalizeTag(value) === tag)) return null;
			return { tags: [...tags, tag] };
		},
	};
}

export function buildTagDeleteChange(tagPath: string, files: TFile[]): PendingChange | null {
	const tag = normalizeTag(tagPath);
	if (!tag || files.length === 0) return null;
	return {
		type: 'tag',
		tag,
		action: 'delete',
		details: `Delete tag "#${tag}"`,
		files,
		customLogic: true,
		logicFunc: (_file, fm: Record<string, unknown>) => {
			if (!tagListContains(fm.tags, tag)) return null;
			return { tags: removeTagValue(fm.tags, tag) };
		},
	};
}

export function buildTagRenameChange(
	oldTagPath: string,
	newTagPath: string,
	files: TFile[],
): PendingChange | null {
	const oldTag = normalizeTag(oldTagPath);
	const newTag = normalizeTag(newTagPath);
	if (!oldTag || !newTag || oldTag === newTag || files.length === 0) return null;
	return {
		type: 'tag',
		tag: oldTag,
		action: 'rename',
		details: `Rename tag "#${oldTag}" to "#${newTag}"`,
		files,
		customLogic: true,
		logicFunc: (_file, fm: Record<string, unknown>) => {
			const tags = replaceTagValue(fm.tags, oldTag, newTag);
			return tags ? { tags } : null;
		},
	};
}

export function tagListContains(raw: unknown, tagPath: string): boolean {
	const expected = normalizeTag(tagPath);
	return tagValues(raw).some((tag) => normalizeTag(tag) === expected);
}

export function removeTagValue(raw: unknown, tagPath: string): string[] {
	const expected = normalizeTag(tagPath);
	return tagValues(raw).filter((tag) => normalizeTag(tag) !== expected);
}

export function replaceTagValue(
	raw: unknown,
	oldTagPath: string,
	newTagPath: string,
): string[] | null {
	const oldTag = normalizeTag(oldTagPath);
	const newTag = normalizeTag(newTagPath);
	if (!oldTag || !newTag || oldTag === newTag) return null;

	const values = tagValues(raw);
	let changed = false;
	let wroteNewTag = values.some(
		(tag) => normalizeTag(tag) === newTag && normalizeTag(tag) !== oldTag,
	);
	const next: string[] = [];

	for (const tag of values) {
		const normalized = normalizeTag(tag);
		if (normalized === oldTag) {
			changed = true;
			if (!wroteNewTag) {
				next.push(newTag);
				wroteNewTag = true;
			}
			continue;
		}
		next.push(tag);
	}

	return changed ? next : null;
}

export function tagValues(raw: unknown): string[] {
	if (Array.isArray(raw)) return (raw as unknown[]).map(tagValueToString);
	if (raw == null || raw === '') return [];
	return [tagValueToString(raw)];
}

export function normalizeTag(value: string): string {
	return value.trim().replace(/^#/, '');
}

function tagValueToString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	return JSON.stringify(value) ?? '';
}
