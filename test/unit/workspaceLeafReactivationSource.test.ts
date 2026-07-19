import { describe, expect, it } from 'vitest';

import frameViewSource from '../../src/VaultmanFrame.ts?raw';
import frameSvelteSource from '../../src/VaultmanFrame.svelte?raw';
import filtersSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('workspace leaf reactivation source boundary (BT5-002)', () => {
	it('routes matching leaf activation and resize through one coalesced refresh', () => {
		expect(frameViewSource).toContain("workspace.on('active-leaf-change'");
		expect(frameViewSource).toContain('isSameWorkspaceLeaf(activeLeaf, this.leaf)');
		expect(frameViewSource).toContain('onResize(): void');
		expect(frameViewSource).toContain('scheduleViewportRefresh()');
		expect(frameViewSource).toContain('contentEl.ownerDocument.defaultView');
		expect(frameViewSource).toContain('cancelAnimationFrame');
	});

	it('exposes the active explorer refresh without duplicating tab routing', () => {
		expect(frameSvelteSource).toContain(
			'export function refreshActiveExplorerViewport(): boolean',
		);
		expect(frameSvelteSource).toContain('refreshExplorerViewport(');
		expect(filtersSource).toContain('refreshExplorerViewport(tab, {');
	});
});
