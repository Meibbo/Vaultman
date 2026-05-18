import type { ActiveFilterEntry } from '../types/typeContracts';
import type { FilterGroup, FilterRule } from '../types/typeFilter';

export interface ActiveFilterReorderRequest {
	source?: ActiveFilterEntry;
	target?: ActiveFilterEntry;
	root: FilterGroup;
}

export function activeFilterLabel(entry: ActiveFilterEntry): string {
	if (entry.kind === 'group') {
		return entry.group.label ?? `${entry.group.logic}: ${entry.group.children.length}`;
	}
	const rule = entry.rule;
	const prop = rule.property ?? '';
	const vals = rule.values ?? [];
	switch (rule.filterType) {
		case 'has_property':
			return `has: ${prop}`;
		case 'missing_property':
			return `missing: ${prop}`;
		case 'specific_value':
			return `${prop}: ${vals[0] ?? ''}`;
		case 'multiple_values':
			return `${prop}: ${vals.join(', ')}`;
		case 'has_tag':
			return `tag: ${vals[0] ?? ''}`;
		case 'folder':
			return `folder: ${vals[0] ?? ''}`;
		case 'folder_exclude':
			return `excl. folder: ${vals[0] ?? ''}`;
		case 'file_name':
			return `name: ${vals[0] ?? ''}`;
		case 'file_name_exclude':
			return `excl. name: ${vals[0] ?? ''}`;
		case 'file_path':
			return `file: ${vals[0] ?? ''}`;
		case 'file_folder':
			return `folder: ${vals[0] ?? ''}`;
		default:
			return prop || 'filter';
	}
}

export function activeFilterDetail(entry: ActiveFilterEntry): string | undefined {
	if (entry.kind === 'group') {
		return entry.group.kind === 'selected_files'
			? `${entry.group.children.length} files`
			: `${entry.group.logic} group`;
	}
	if (entry.parent?.id === 'selected-files' && entry.rule.filterType === 'file_path') {
		return 'selected file';
	}
	return undefined;
}

export function canReorderActiveFilterEntries({
	source,
	target,
	root,
}: ActiveFilterReorderRequest): boolean {
	if (!source || !target) return false;
	if (source.source === 'search' || target.source === 'search') return false;
	return activeFilterParent(source, root) === activeFilterParent(target, root);
}

function activeFilterParent(entry: ActiveFilterEntry, root: FilterGroup): FilterGroup {
	return entry.parent ?? root;
}

export type { FilterRule };
