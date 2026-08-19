import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('Style System Integrity & Monolith Replacement (Slice 5)', () => {
	it('should verify that generated styles.css exists and is populated', async () => {
		expect(existsSync('./styles.css')).toBe(true);
		const content = await readFile('./styles.css', 'utf8');
		expect(content.length).toBeGreaterThan(500);
	});

	it('should verify that generated bundle contains both UnoCSS and modular SCSS layers', async () => {
		const content = await readFile('./styles.css', 'utf8');
		expect(content).toContain('UnoCSS');
		expect(content).toContain('SCSS');
	});

	it('should contain canonical .vm-* UnoCSS atomic shortcuts and tokens', async () => {
		const content = await readFile('./styles.css', 'utf8');
		expect(content).toContain('.vm-btn');
		expect(content).toContain('.vm-card');
		expect(content).toContain('.vm-tree-row');
		expect(content).toContain('.vm-node-table');
		expect(content).toContain('.vm-nav-pill');
		expect(content).toContain('.vm-popup-island');
		expect(content).toContain('--vm-row-height');
	});

	it('should contain residual SCSS layers with performance isolation', async () => {
		const content = await readFile('./styles.css', 'utf8');
		expect(content).toContain('.vm-virtual-scroll');
		expect(content).toContain('.vm-tree-indent-guide');
		expect(content).toContain('.vm-glass');
		expect(content).toContain('body.vm-resizing');
	});
});
