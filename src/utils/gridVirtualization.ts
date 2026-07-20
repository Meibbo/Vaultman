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

export interface AnchoredGridWindowInput<T> extends VirtualGridWindowInput<T> {
	/** Row height the current scrollTop was produced under (null on first run). */
	previousRowHeight: number | null;
}

export interface AnchoredGridWindow<T> {
	/** New content extent. MUST be applied to the spacer BEFORE scrollTop. */
	spacerHeight: number;
	/** Anchored scroll position, clamped against the NEW geometry. */
	scrollTop: number;
	window: VirtualGridWindow<T>;
}

/**
 * BT5-016: when the uniform slot height changes (meta cells toggled), keep the
 * first visible row anchored under the new geometry. The caller must grow the
 * spacer to `spacerHeight` before assigning `scrollTop`, otherwise the browser
 * clamps the target against the old, shorter content and the anchor is lost.
 */
export function buildAnchoredGridWindow<T>(
	input: AnchoredGridWindowInput<T>,
): AnchoredGridWindow<T> {
	const { previousRowHeight, ...windowInput } = input;
	const safeColumnCount = Math.max(1, Math.floor(input.columnCount));
	const safeRowHeight = Math.max(1, input.rowHeight);
	const rowCount = Math.ceil(input.rows.length / safeColumnCount);
	const spacerHeight = rowCount * safeRowHeight;
	const maxScrollTop = Math.max(0, spacerHeight - input.viewportHeight);

	const anchoredTarget =
		previousRowHeight !== null &&
		previousRowHeight > 0 &&
		previousRowHeight !== safeRowHeight
			? Math.floor(input.scrollTop / previousRowHeight) * safeRowHeight
			: input.scrollTop;
	const scrollTop = Math.min(Math.max(0, anchoredTarget), maxScrollTop);

	return {
		spacerHeight,
		scrollTop,
		window: buildVirtualGridWindow({ ...windowInput, scrollTop }),
	};
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

	// BT5-016: a shrinking rowHeight can leave the caller's scrollTop beyond
	// the new content extent for one frame; clamp so the window is never empty
	// while rows exist (the DOM scroll position catches up on its own).
	const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
	const safeScrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);

	const startRow = Math.max(
		0,
		Math.floor(safeScrollTop / safeRowHeight) - overscanRows,
	);
	const endRow = Math.min(
		rowCount - 1,
		Math.ceil((safeScrollTop + viewportHeight) / safeRowHeight) + overscanRows,
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
