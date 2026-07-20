import { describe, expect, it } from 'vitest';

import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import viewGridSource from '../../src/components/layout/viewGrid.ts?raw';
import viewNodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import viewFilesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import frameSource from '../../src/VaultmanFrame.ts?raw';

describe('BT5-033 a row survives a redundant re-render', () => {
	it('does not re-parent a row that is already mounted where it belongs', () => {
		// appendChild on an already-parented element detaches and re-attaches it.
		// Doing that between mousedown and mouseup cancels the click, which is
		// why the first click on an unfocused explorer did nothing.
		expect(viewTreeSource).toContain(
			'if (row.parentElement !== parent) parent.appendChild(row);',
		);
		expect(viewTreeSource).not.toContain('\t\tparent.appendChild(row);\n');
	});

	it('applies the same guard to every recycled row surface', () => {
		expect(viewGridSource).toContain(
			'if (row.parentElement !== parent) parent.appendChild(row);',
		);
		expect(viewNodeTableSource).toContain(
			'if (row.parentElement !== this.tbodyEl) this.tbodyEl.appendChild(row);',
		);
		expect(viewFilesGridSource).toContain(
			'if (card.parentElement !== this.contentEl) this.contentEl.appendChild(card);',
		);
	});

	it('still refreshes the viewport when the leaf becomes active', () => {
		// The refresh itself is legitimate — it re-measures after a hidden pane
		// is shown. It just must not churn DOM that has not changed.
		expect(frameSource).toContain("workspace.on('active-leaf-change'");
		expect(frameSource).toContain('scheduleViewportRefresh()');
	});
});
