export interface VirtualGridWindowInput<T> {
	rows: T[];
	scrollTop: number;
	viewportHeight: number;
	rowHeight: number;
	columnCount: number;
	overscanRows?: number;
}

export interface VirtualGridItem<T> {
	row: T;
	index: number;
	rowNumber: number;
	column: number;
	top: number;
}

export interface VirtualGridWindow<T> {
	visibleRows: VirtualGridItem<T>[];
	totalHeight: number;
	startRow: number;
	endRow: number;
}

export function buildVirtualGridWindow<T>({
	rows,
	scrollTop,
	viewportHeight,
	rowHeight,
	columnCount,
	overscanRows = 2,
}: VirtualGridWindowInput<T>): VirtualGridWindow<T> {
	const safeColumnCount = Math.max(1, Math.floor(columnCount));
	const safeRowHeight = Math.max(1, rowHeight);
	const rowCount = Math.ceil(rows.length / safeColumnCount);
	const totalHeight = rowCount * safeRowHeight;
	if (rows.length === 0 || rowCount === 0) {
		return { visibleRows: [], totalHeight: 0, startRow: 0, endRow: 0 };
	}

	const startRow = Math.max(
		0,
		Math.floor(scrollTop / safeRowHeight) - overscanRows,
	);
	const endRow = Math.min(
		rowCount - 1,
		Math.ceil((scrollTop + viewportHeight) / safeRowHeight) + overscanRows,
	);
	const visibleRows: VirtualGridItem<T>[] = [];
	for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
		for (let column = 0; column < safeColumnCount; column += 1) {
			const index = rowNumber * safeColumnCount + column;
			const row = rows[index];
			if (!row) continue;
			visibleRows.push({
				row,
				index,
				rowNumber,
				column,
				top: rowNumber * safeRowHeight,
			});
		}
	}

	return { visibleRows, totalHeight, startRow, endRow };
}
