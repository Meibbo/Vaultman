export interface VirtualTableRow<T> {
	row: T;
	index: number;
	top: number;
}

export interface VirtualTableWindow<T> {
	rows: T[];
	visibleRows: VirtualTableRow<T>[];
	totalHeight: number;
	startIndex: number;
	endIndex: number;
	rowHeight: number;
	topForIndex: (index: number) => number;
}

export interface VirtualTableWindowInput<T> {
	rows: T[];
	scrollTop: number;
	viewportHeight: number;
	rowHeight: number;
	overscan: number;
}

export function buildVirtualTableWindow<T>({
	rows,
	scrollTop,
	viewportHeight,
	rowHeight,
	overscan,
}: VirtualTableWindowInput<T>): VirtualTableWindow<T> {
	const boundedRowHeight = Math.max(1, rowHeight);
	const safeViewportHeight = Math.max(0, viewportHeight);
	const safeScrollTop = Math.max(0, scrollTop);
	const safeOverscan = Math.max(0, overscan);
	const startIndex = Math.max(
		0,
		Math.floor(safeScrollTop / boundedRowHeight) - safeOverscan,
	);
	const endIndex = Math.min(
		rows.length,
		Math.ceil((safeScrollTop + safeViewportHeight) / boundedRowHeight) +
			safeOverscan,
	);
	const topForIndex = (index: number) => index * boundedRowHeight;

	return {
		rows,
		visibleRows: rows.slice(startIndex, endIndex).map((row, offset) => {
			const index = startIndex + offset;
			return {
				row,
				index,
				top: topForIndex(index),
			};
		}),
		totalHeight: rows.length * boundedRowHeight,
		startIndex,
		endIndex,
		rowHeight: boundedRowHeight,
		topForIndex,
	};
}
