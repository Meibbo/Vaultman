import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('BT5-034 islands clamp to the frame height', () => {
	it('the frame exposes its measured height as a CSS variable', () => {
		expect(frameSource).toContain("'--vaultman-frame-height'");
		expect(frameSource).toContain('applyFrameHeight(');
		// Driven by the same ResizeObserver that tracks width, plus initial set.
		expect(frameSource).toContain('rect?.height ?? target.offsetHeight');
	});

	it('both bottom islands clamp their max-height to that variable', () => {
		const filters = stylesSource.slice(
			stylesSource.indexOf('.vaultman-active-filters-island {'),
		);
		expect(filters).toContain('var(--vaultman-frame-height');
		expect(filters).not.toMatch(/\.vaultman-active-filters-island \{[^}]*max-height: 60vh;/);
		const queue = stylesSource.slice(
			stylesSource.indexOf('.vaultman-queue-island {'),
		);
		expect(queue).toContain('var(--vaultman-frame-height');
	});
});
