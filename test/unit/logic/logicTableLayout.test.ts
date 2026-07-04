import { describe, expect, it } from 'vitest';
import {
	clampTableColumnWidth,
	isTableColumnResizable,
	materializeTableColumnWidths,
	resolveTableColumnLayout,
	TABLE_COLUMN_FALLBACK_MIN_WIDTH,
	tableColumnTemplate,
} from '../../../src/logic/logicTableLayout';

// SDF-011 resizer parity (V.D slice 2b, phase 2) — characterization of the column-layout math
// against the stable 1.1.6 oracle (`git show 1.1.6:src/logic/logicTableLayout.ts` +
// `1.1.6:test/unit/tableLayout.test.ts`): clamped in-memory widths (round + per-column minimum,
// no maximum) projected as stable cumulative offsets. Adapted to the sandbox table's shape:
// columns are the view's own `ViewColumn` objects (id/minWidth/width/resizable), the projection
// SOURCE is one shared grid-template (all cells read the same tracks) instead of stable's
// per-cell `insetInlineStart`/`width` inline styles — same resulting offsets, different form.

const COLUMNS = [
	{ id: 'label', minWidth: 180 },
	{ id: 'detail', minWidth: 160 },
	{ id: 'count', minWidth: 72 },
];

describe('logicTableLayout (sandbox edition, stable-1.1.6 semantics)', () => {
	describe('clampTableColumnWidth', () => {
		it('rounds fractional drag widths like stable clampFileTableColumnWidth', () => {
			expect(clampTableColumnWidth({ id: 'label', minWidth: 180 }, 420.4)).toBe(420);
			expect(clampTableColumnWidth({ id: 'label', minWidth: 180 }, 420.5)).toBe(421);
		});

		it('clamps to the column minimum with no upper bound (stable: max(min, round(w)))', () => {
			expect(clampTableColumnWidth({ id: 'count', minWidth: 72 }, 20)).toBe(72);
			expect(clampTableColumnWidth({ id: 'count', minWidth: 72 }, 5000)).toBe(5000);
		});

		it('falls back to the shared 120px minimum when the column declares none', () => {
			expect(TABLE_COLUMN_FALLBACK_MIN_WIDTH).toBe(120);
			expect(clampTableColumnWidth({ id: 'free' }, 12)).toBe(120);
		});
	});

	describe('tableColumnTemplate', () => {
		it('preserves the pre-resize fluid template byte-for-byte (no overrides)', () => {
			// This exact string is pinned by the ViewNodeTable panel snapshot — the resizer
			// feature must be invisible until the user actually drags.
			expect(tableColumnTemplate(COLUMNS, {})).toBe(
				'minmax(180px, 1fr) minmax(160px, 1fr) minmax(72px, 1fr)',
			);
		});

		it('renders an overridden column as a fixed clamped px track', () => {
			expect(tableColumnTemplate(COLUMNS, { label: 420 })).toBe(
				'420px minmax(160px, 1fr) minmax(72px, 1fr)',
			);
			expect(tableColumnTemplate(COLUMNS, { count: 20 })).toBe(
				'minmax(180px, 1fr) minmax(160px, 1fr) 72px',
			);
		});

		it('respects an explicit fr weight for fluid tracks', () => {
			expect(tableColumnTemplate([{ id: 'wide', minWidth: 100, width: 2 }], {})).toBe(
				'minmax(100px, 2fr)',
			);
		});
	});

	describe('materializeTableColumnWidths', () => {
		it('fills every column from the measured DOM width, clamped', () => {
			const widths = materializeTableColumnWidths(
				COLUMNS,
				(id) => (id === 'label' ? 300.6 : id === 'detail' ? 10 : 96),
				{},
			);
			expect(widths).toEqual({ label: 301, detail: 160, count: 96 });
		});

		it('existing overrides win over fresh measurements (drag continuity)', () => {
			const widths = materializeTableColumnWidths(COLUMNS, () => 500, { label: 420 });
			expect(widths).toEqual({ label: 420, detail: 500, count: 500 });
		});
	});

	describe('resolveTableColumnLayout', () => {
		it('is null until every column is materialized (fluid tracks have no stable offsets)', () => {
			expect(resolveTableColumnLayout(COLUMNS, {})).toBeNull();
			expect(resolveTableColumnLayout(COLUMNS, { label: 420 })).toBeNull();
		});

		it('projects Bases-style cumulative offsets + total width when fully materialized', () => {
			// Mirrors stable tableLayout.test.ts "applies resizable column overrides while
			// clamping to useful minimum widths": overrides {name:420, ext:20} -> 420 + clamped
			// min + default = cumulative lefts and a total.
			const layout = resolveTableColumnLayout(COLUMNS, { label: 420, detail: 20, count: 96 });
			expect(layout).not.toBeNull();
			expect(layout!.tracks.map((track) => [track.id, track.left, track.width])).toEqual([
				['label', 0, 420],
				['detail', 420, 160],
				['count', 580, 96],
			]);
			expect(layout!.totalWidth).toBe(676);
		});
	});

	describe('isTableColumnResizable', () => {
		it('all columns are resizable unless explicitly opted out (stable: every header gets a handle)', () => {
			expect(isTableColumnResizable({ id: 'label' })).toBe(true);
			expect(isTableColumnResizable({ id: 'label', resizable: true })).toBe(true);
			expect(isTableColumnResizable({ id: 'label', resizable: false })).toBe(false);
		});
	});
});
