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

const COLUMN_ORDER: NodeTableColumnId[] = ['icon', 'text', 'type', 'count'];

const COLUMN_WIDTHS: Record<NodeTableColumnId, number> = {
	icon: 34,
	text: 300,
	type: 116,
	count: 82,
};

const COLUMN_LABELS: Record<NodeTableColumnId, string> = {
	icon: 'viewmode.pill.icon',
	text: 'viewmode.pill.text',
	type: 'viewmode.pill.type',
	count: 'viewmode.pill.count',
};

export function resolveNodeTableLayout(
	_surface: NodeTableSurface,
	visibleCells: Set<string>,
): NodeTableLayout {
	const columns: NodeTableColumn[] = [];
	let left = 0;

	for (const id of COLUMN_ORDER) {
		if (!visibleCells.has(id)) continue;
		const width = COLUMN_WIDTHS[id];
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
