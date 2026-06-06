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
});
