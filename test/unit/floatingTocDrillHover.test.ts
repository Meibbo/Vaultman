import { describe, expect, it } from 'vitest';

import panelSource from '../../src/services/routerFloatingToc.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';

describe('floating TOC drill uses the tree hover preview', () => {
	it('exposes the optional scope-pick seam on the floating panel contract', () => {
		expect(panelSource).toContain('setScopePickMode?');
	});

	it('arms the mixed drill hover outline while the floating pick is active', () => {
		expect(frameSource).toContain("setScopePickMode?.('drill')");
		expect(frameSource).toContain('setScopePickMode?.(null)');
	});
});
