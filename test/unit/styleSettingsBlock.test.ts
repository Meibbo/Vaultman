import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('U130-05 Style Settings', () => {
	it('publica un bloque @settings con las tres variantes', () => {
		const scss = readFileSync(
			new URL('../../src/styles/components/_action-cell.scss', import.meta.url),
			'utf8',
		);
		expect(scss).toContain('@settings');
		expect(scss).toContain('vaultman-action-cell-variant');
		for (const v of ['icon-only', 'icon-box', 'border-circle']) {
			expect(scss).toContain(v);
		}
	});
});
