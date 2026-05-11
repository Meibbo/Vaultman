import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('toolbar icon centering styles', () => {
	it('centers every compact toolbar icon and normalizes inline svg alignment', () => {
		const source = readFileSync('src/styles/explorer/_explorer.scss', 'utf8');

		expect(source).toMatch(
			/\.vm-nav-icon-min\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s,
		);
		expect(source).toMatch(/\.vm-nav-icon-min\s*\{[^}]*svg\s*\{[^}]*display:\s*block;/s);
	});
});
