export type NodeTableSurface = 'props' | 'tags';
export type NodeTableColumnId = 'icon' | 'text' | 'type' | 'count';

export interface NodeTableColumn {
	id: NodeTableColumnId;
	left: number;
	width: number;
	labelKey: string;
}

export interface NodeTableLayout {
	columns: NodeTableColumn[];
	totalWidth: number;
}

export type NodeTableColumnWidths = Partial<Record<NodeTableColumnId, number>>;

const COLUMN_ORDER: NodeTableColumnId[] = ['icon', 'text', 'type', 'count'];

const COLUMN_WIDTHS: Record<NodeTableColumnId, number> = {
	icon: 34,
	text: 300,
	type: 116,
	count: 82,
};

const MIN_COLUMN_WIDTHS: Record<NodeTableColumnId, number> = {
	icon: 34,
	text: 120,
	type: 80,
	count: 56,
};

export function clampNodeTableColumnWidth(
	id: NodeTableColumnId,
	width: number,
): number {
	return Math.max(MIN_COLUMN_WIDTHS[id], Math.round(width));
}

const COLUMN_LABELS: Record<NodeTableColumnId, string> = {
	icon: 'viewmode.pill.icon',
	text: 'viewmode.pill.text',
	type: 'viewmode.pill.type',
	count: 'viewmode.pill.count',
};

export function resolveNodeTableLayout(
	_surface: NodeTableSurface,
	visibleCells: Set<string>,
	columnWidths: NodeTableColumnWidths = {},
): NodeTableLayout {
	const columns: NodeTableColumn[] = [];
	let left = 0;

	for (const id of COLUMN_ORDER) {
		if (!visibleCells.has(id)) continue;
		const width = clampNodeTableColumnWidth(
			id,
			columnWidths[id] ?? COLUMN_WIDTHS[id],
		);
		columns.push({
			id,
			left,
			width,
			labelKey: COLUMN_LABELS[id],
		});
		left += width;
	}

	return { columns, totalWidth: left };
}
