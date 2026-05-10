import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('faint accent focus styles', () => {
	it('only fades accent tokens while the Obsidian workspace has focus', () => {
		const source = readFileSync('src/styles/_global.scss', 'utf8');

		expect(source).toContain('body.vm-faint-accents-workspace-focus:has(.workspace:focus-within)');
		expect(source).toContain('--interactive-accent');
		expect(source).toContain('--text-accent');
	});
});
