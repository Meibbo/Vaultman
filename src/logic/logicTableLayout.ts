export type FileTableColumnId =
	| 'icon'
	| 'name'
	| 'count'
	| 'ext'
	| 'date'
	| 'path';
export type FileTableSortColumn =
	| 'name'
	| 'props'
	| 'path'
	| 'mtime'
	| 'ctime'
	| 'ext';

export interface FileTableColumn {
	id: FileTableColumnId;
	left: number;
	width: number;
	sortColumn?: FileTableSortColumn;
	dataProperty?: string;
	modClass?: string;
}

export interface FileTableLayout {
	columns: FileTableColumn[];
	totalWidth: number;
}

export type FileTableColumnWidths = Partial<Record<FileTableColumnId, number>>;

const COLUMN_ORDER: FileTableColumnId[] = [
	'icon',
	'name',
	'count',
	'ext',
	'date',
	'path',
];

const COLUMN_WIDTHS: Record<FileTableColumnId, number> = {
	icon: 34,
	name: 300,
	count: 96,
	ext: 111,
	date: 213,
	path: 201,
};

const MIN_COLUMN_WIDTHS: Record<FileTableColumnId, number> = {
	icon: 34,
	name: 120,
	count: 64,
	ext: 72,
	date: 120,
	path: 100,
};

export function clampFileTableColumnWidth(
	id: FileTableColumnId,
	width: number,
): number {
	return Math.max(MIN_COLUMN_WIDTHS[id], Math.round(width));
}

export function resolveFileTableLayout(
	visibleCells: Set<string>,
	dateSortColumn: Extract<FileTableSortColumn, 'mtime' | 'ctime'> = 'mtime',
	columnWidths: FileTableColumnWidths = {},
): FileTableLayout {
	const columns: FileTableColumn[] = [];
	let left = 0;

	for (const id of COLUMN_ORDER) {
		if (!visibleCells.has(id)) continue;
		const width = clampFileTableColumnWidth(
			id,
			columnWidths[id] ?? COLUMN_WIDTHS[id],
		);
		columns.push({
			id,
			left,
			width,
			...columnMetadata(id, dateSortColumn),
		});
		left += width;
	}

	return {
		columns,
		totalWidth: left,
	};
}

export function formatFileTableName(file: {
	basename: string;
	extension: string;
	name: string;
}): string {
	return file.extension === 'md' || file.extension === 'markdown'
		? file.basename
		: file.name;
}

function columnMetadata(
	id: FileTableColumnId,
	dateSortColumn: Extract<FileTableSortColumn, 'mtime' | 'ctime'>,
): Pick<FileTableColumn, 'sortColumn' | 'dataProperty' | 'modClass'> {
	if (id === 'icon') return {};
	if (id === 'name')
		return {
			sortColumn: 'name',
			dataProperty: 'file.name',
			modClass: 'mod-implicit',
		};
	if (id === 'count')
		return { sortColumn: 'props', dataProperty: 'vaultman.props' };
	if (id === 'ext')
		return {
			sortColumn: 'ext',
			dataProperty: 'file.ext',
			modClass: 'mod-implicit',
		};
	if (id === 'date')
		return {
			sortColumn: dateSortColumn,
			dataProperty: dateSortColumn === 'ctime' ? 'file.ctime' : 'file.mtime',
		};
	return {
		sortColumn: 'path',
		dataProperty: 'file.folder',
		modClass: 'mod-implicit',
	};
}
