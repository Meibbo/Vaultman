// logicTableLayout — pure column-layout math for the table view's header resizers
// (SDF-011 Bases-parity, V.D slice 2b phase 2). Sandbox edition of stable 1.1.6's
// src/logic/logicTableLayout.ts: same semantics — CLAMPED IN-MEMORY WIDTHS (Math.round +
// per-column minimum, no upper bound; never persisted) projected as STABLE CUMULATIVE
// OFFSETS — adapted to the sandbox table's shape:
//
// - Columns are the view's own `ViewColumn`-compatible objects (id/minWidth/width/resizable),
//   not stable's fixed FileTableColumnId union with constant width tables. A column's minimum
//   is its declared `minWidth` (the same value the fluid grid template already enforces),
//   falling back to the template's long-standing 120px default.
// - The projection SOURCE is ONE shared grid-template string (`tableColumnTemplate`) that the
//   header row and every body row consume via a CSS custom property, instead of stable's
//   per-cell `insetInlineStart`/`width` inline styles — same resulting offsets, different
//   form (one projection point instead of O(rows x columns) style writes).
// - Stable resolved EVERY column to a constant px width up front; the sandbox default is the
//   FLUID `minmax(minWidth, fr)` template, so offsets only become stable once a drag begins.
//   `materializeTableColumnWidths` performs that stable-parity transition: on the first
//   pointerdown all columns snap to their current rendered widths (clamped), after which the
//   dragged column changes and every other column keeps its width — exactly stable's
//   observable drag behavior (other columns' widths constant, offsets after the dragged one
//   shift, total surface may exceed the viewport and horizontally scroll).
//
// Framework-agnostic and DOM-free: measurement is injected (`measureWidth`), so the math is
// testable in isolation (test/unit/logic/logicTableLayout.test.ts characterizes it against
// the stable 1.1.6 oracle's tableLayout.test.ts cases).

/** The subset of `ViewColumn` the layout math needs — kept structural to stay UI-type-free. */
export interface TableLayoutColumn {
	id: string;
	/** Fluid weight for the unmaterialized `minmax(minWidth, {width}fr)` track. Default 1. */
	width?: number;
	/** Per-column minimum (px); also the clamp floor while dragging. */
	minWidth?: number;
	/** Stable parity: every header gets a resize handle unless explicitly opted out. */
	resizable?: boolean;
}

/** In-memory (never persisted) px width overrides, keyed by column id. */
export type TableColumnWidthOverrides = Readonly<Record<string, number>>;

/** One materialized column: Bases-style absolute offset + width (px). */
export interface TableColumnTrack {
	id: string;
	left: number;
	width: number;
}

export interface TableColumnLayout {
	tracks: readonly TableColumnTrack[];
	totalWidth: number;
}

/** The fluid template's long-standing default minimum — the clamp floor when a column has none. */
export const TABLE_COLUMN_FALLBACK_MIN_WIDTH = 120;

function tableColumnMinWidth(column: TableLayoutColumn): number {
	return column.minWidth ?? TABLE_COLUMN_FALLBACK_MIN_WIDTH;
}

/** Stable 1.1.6 `clampFileTableColumnWidth` semantics: `max(min, round(width))`, no maximum. */
export function clampTableColumnWidth(column: TableLayoutColumn, width: number): number {
	return Math.max(tableColumnMinWidth(column), Math.round(width));
}

/** Stable parity: all columns carry a resizer unless a column explicitly opts out. */
export function isTableColumnResizable(column: TableLayoutColumn): boolean {
	return column.resizable !== false;
}

/**
 * The shared grid-template: a clamped fixed `px` track for every overridden column, the
 * pre-existing fluid `minmax(minWidth, fr)` track for the rest. With NO overrides this is
 * byte-identical to the template the table has always rendered — the resizer feature is
 * invisible until the user drags.
 */
export function tableColumnTemplate(
	columns: readonly TableLayoutColumn[],
	overrides: TableColumnWidthOverrides,
): string {
	return columns
		.map((column) => {
			const override = overrides[column.id];
			if (override !== undefined) return `${clampTableColumnWidth(column, override)}px`;
			return `minmax(${tableColumnMinWidth(column)}px, ${column.width ?? 1}fr)`;
		})
		.join(' ');
}

/**
 * The fluid->fixed transition at drag start: every column resolves to its current rendered
 * width (measured by the caller, clamped here), existing overrides winning so an in-progress
 * resize session never re-measures a column the user already set. After this, stable's drag
 * invariant holds: only the dragged column's width changes.
 */
export function materializeTableColumnWidths(
	columns: readonly TableLayoutColumn[],
	measureWidth: (columnId: string) => number,
	overrides: TableColumnWidthOverrides,
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const column of columns) {
		out[column.id] = overrides[column.id] ?? clampTableColumnWidth(column, measureWidth(column.id));
	}
	return out;
}

/**
 * Bases-style absolute projection — cumulative `left` offsets + `totalWidth` (stable's
 * `resolveFileTableLayout` output shape). Only meaningful once EVERY column is materialized
 * (fluid tracks have no stable offsets): returns `null` before the first drag, in which case
 * the view keeps its fluid 100%-width surface exactly as before.
 */
export function resolveTableColumnLayout(
	columns: readonly TableLayoutColumn[],
	overrides: TableColumnWidthOverrides,
): TableColumnLayout | null {
	const tracks: TableColumnTrack[] = [];
	let left = 0;
	for (const column of columns) {
		const override = overrides[column.id];
		if (override === undefined) return null;
		const width = clampTableColumnWidth(column, override);
		tracks.push({ id: column.id, left, width });
		left += width;
	}
	return { tracks, totalWidth: left };
}
