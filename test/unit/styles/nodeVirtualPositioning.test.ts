import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function block(source: string, selector: string): string {
	const start = source.indexOf(selector);
	expect(start).toBeGreaterThanOrEqual(0);
	const open = source.indexOf('{', start);
	let depth = 0;
	for (let index = open; index < source.length; index += 1) {
		if (source[index] === '{') depth += 1;
		if (source[index] === '}') depth -= 1;
		if (depth === 0) return source.slice(open + 1, index);
	}
	return '';
}

describe('node virtual positioning styles', () => {
	it('keeps table virtual row offsets compositor-only', () => {
		const source = readFileSync('src/styles/data/_table.scss', 'utf8');
		const row = block(source, '.vm-node-table-row');

		expect(row).toContain('position: absolute');
		expect(row).toContain('top: 0');
		expect(row).toContain('transform: translate3d(0, var(--vm-node-table-y, 0), 0)');
		expect(row).toContain('will-change: transform');
		expect(row).not.toContain('top: var(--vm-node-table-y');
	});

	it('keeps grid virtual row offsets compositor-only', () => {
		const source = readFileSync('src/styles/data/_grid.scss', 'utf8');
		const row = block(source, '.vm-node-grid-row');

		expect(row).toContain('position: absolute');
		expect(row).toContain('top: 0');
		expect(row).toContain('transform: translate3d(0, var(--vm-node-grid-y, 0), 0)');
		expect(row).toContain('will-change: transform');
		expect(row).not.toContain('top: var(--vm-node-grid-y');
	});
});
