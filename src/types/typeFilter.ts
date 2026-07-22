/** Filter types matching the Python pkm_manager filter system */

export type FilterType =
	| 'has_property'
	| 'missing_property'
	| 'specific_value'
	| 'multiple_values'
	| 'folder'
	| 'folder_exclude'
	| 'file_name'
	| 'file_name_exclude'
	| 'file_exclude'   // excludes one exact file path (BT5-009)
	| 'file_folder'    // matches folder path only (not filename)
	| 'content_search' // transient content-search result set
	| 'content_search_exclude' // transient content-search exclusion
	| 'has_tag'        // matches files with a specific tag
	| 'not_has_tag'
	| 'not_specific_value';

export type GroupLogic = 'all' | 'any' | 'none';

export interface FilterGroup {
	type: 'group';
	logic: GroupLogic;
	children: FilterNode[];
	id?: string;
	enabled?: boolean;
}

export interface FilterRule {
	type: 'rule';
	filterType: FilterType;
	property: string;
	values: string[];
	id?: string;
	enabled?: boolean;
}

export type FilterNode = FilterGroup | FilterRule;

export interface FilterTemplate {
	name: string;
	root: FilterGroup;
}
