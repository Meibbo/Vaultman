import { describe, expect, it } from 'vitest';

import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';

describe('NodeTableView source guards', () => {
	it('cleans up node table root state when the table view is destroyed', () => {
		expect(nodeTableSource).toContain('destroy(): void');
		expect(nodeTableSource).toContain(
			"removeClass('vaultman-node-table-root')",
		);
		expect(nodeTableSource).toContain('this.containerEl.empty()');
		expect(nodeTableSource).toContain(
			"removeEventListener('scroll', this.onScroll)",
		);
	});

	it('schedules node table window rendering through requestAnimationFrame while scrolling', () => {
		expect(nodeTableSource).toContain('private pendingRaf');
		expect(nodeTableSource).toContain('private scheduleWindowRender');
		expect(nodeTableSource).toContain('window.requestAnimationFrame(run)');
		expect(nodeTableSource).not.toContain(
			'private readonly onScroll = () => {\n\t\tthis._syncHeaderScroll();\n\t\tthis._renderWindow();\n\t};',
		);
	});

	it('reuses node table row shells while scrolling virtual windows', () => {
		expect(nodeTableSource).toContain(
			'private rowEls = new Map<string, HTMLElement>()',
		);
		expect(nodeTableSource).toContain('private removeStaleRows');
		expect(nodeTableSource).not.toContain('this.tbodyEl.empty();');
	});

	it('skips rebuilding unchanged node table row contents', () => {
		expect(nodeTableSource).toContain('private rowSignature');
		expect(nodeTableSource).toContain(
			'row.dataset.renderSignature === signature',
		);
		expect(nodeTableSource).toContain(
			'row.dataset.renderSignature = signature',
		);
	});

	it('wires Bases-style header resizers into node table column widths', () => {
		expect(nodeTableSource).toContain('private columnWidths');
		expect(nodeTableSource).toContain('attachColumnResizer');
		expect(nodeTableSource).toContain('clampNodeTableColumnWidth');
		expect(nodeTableSource).toContain('onpointerdown');
	});

	it('projects hidden active filters onto collapsed parent cells', () => {
		expect(nodeTableSource).toContain('resolvePresentedActiveFilterIds');
		expect(nodeTableSource).toContain(
			'const presentedActiveFilterIds = resolvePresentedActiveFilterIds(',
		);
		expect(nodeTableSource).toContain(
			'opts = { ...opts, activeFilterIds: presentedActiveFilterIds }',
		);
	});
});
