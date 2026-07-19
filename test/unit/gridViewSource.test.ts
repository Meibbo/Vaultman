import { describe, expect, it } from 'vitest';

import gridViewSource from '../../src/components/layout/viewGrid.ts?raw';

describe('GridView source guards', () => {
	it('uses Bases-style absolute column offsets instead of CSS grid tracks', () => {
		expect(gridViewSource).toContain('resolveFileTableLayout');
		expect(gridViewSource).toContain('insetInlineStart');
		expect(gridViewSource).toContain('style.width');
		expect(gridViewSource).not.toContain('gridTemplateColumns');
	});

	it('cleans up table root state when the file table view is destroyed', () => {
		expect(gridViewSource).toContain('destroy(): void');
		expect(gridViewSource).toContain(
			"removeClass('vaultman-files-table-root')",
		);
		expect(gridViewSource).toContain(
			"removeEventListener('scroll', this.onScroll)",
		);
	});

	it('schedules table window rendering through requestAnimationFrame while scrolling', () => {
		expect(gridViewSource).toContain('private pendingRaf');
		expect(gridViewSource).toContain('private scheduleWindowRender');
		expect(gridViewSource).toContain('window.requestAnimationFrame(run)');
		expect(gridViewSource).not.toContain(
			'private readonly onScroll = () => {\n\t\tthis._syncHeaderScroll();\n\t\tthis._renderWindow();\n\t};',
		);
	});

	it('reuses file table row shells while scrolling virtual windows', () => {
		expect(gridViewSource).toContain(
			'private rowEls = new Map<string, HTMLElement>()',
		);
		expect(gridViewSource).toContain('private removeStaleRows');
		expect(gridViewSource).not.toContain('this.tbodyEl.empty();');
	});

	it('skips rebuilding unchanged file table row contents', () => {
		expect(gridViewSource).toContain('private rowSignature');
		expect(gridViewSource).toContain(
			'row.dataset.renderSignature === signature',
		);
		expect(gridViewSource).toContain('row.dataset.renderSignature = signature');
	});

	it('wires Bases-style header resizers into file table column widths', () => {
		expect(gridViewSource).toContain('private columnWidths');
		expect(gridViewSource).toContain('attachColumnResizer');
		expect(gridViewSource).toContain('clampFileTableColumnWidth');
		expect(gridViewSource).toContain('onpointerdown');
	});

	it('delegates header sort changes to the Files panel with canonical defaults', () => {
		expect(gridViewSource).toContain(
			'onSortChange?: (column: SortColumn, direction: SortDirection) => void',
		);
		expect(gridViewSource).toContain('nextExplorerSortDirection(');
		expect(gridViewSource).toContain(
			'this.callbacks.onSortChange(this.sortColumn, this.sortDirection)',
		);
		expect(gridViewSource).not.toContain(
			"this.sortColumn = col;\n\t\t\t\tthis.sortDirection = 'asc';",
		);
	});

	it('forwards modifier and middle-click events from file names', () => {
		expect(gridViewSource).toContain(
			'onFileClick: (file: TFile, event?: MouseEvent | KeyboardEvent) => void',
		);
		expect(gridViewSource).toContain(
			"nameEl.addEventListener('click', (event) =>",
		);
		expect(gridViewSource).toContain(
			"nameEl.addEventListener('auxclick', (event) =>",
		);
		expect(gridViewSource).toContain('if (event.button !== 1) return;');
		expect(gridViewSource).toContain('this.callbacks.onFileClick(file, event)');
	});
});
