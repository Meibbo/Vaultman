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
});
