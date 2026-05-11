import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';
import { createFilesIndex } from '../../../src/index/indexFiles';

describe('serviceFilesIndex', () => {
	it('builds FileNode[] from every vault file, not only markdown files', async () => {
		const files = [mockTFile('notes/a.md'), mockTFile('assets/manual.pdf')];
		const app = mockApp({ files });
		const idx = createFilesIndex(app);
		await idx.refresh();
		expect(idx.nodes.length).toBe(2);
		expect(idx.nodes[0].path).toBe('notes/a.md');
		expect(idx.nodes[0].file).toBe(files[0]);
		expect(idx.nodes[1].path).toBe('assets/manual.pdf');
		expect(idx.nodes[1].file).toBe(files[1]);
	});

	it('byId is the file path', async () => {
		const f = mockTFile('x.md');
		const app = mockApp({ files: [f] });
		const idx = createFilesIndex(app);
		await idx.refresh();
		expect(idx.byId('x.md')?.basename).toBe('x');
	});

	it('precomputes exact file search buffers from basename, path, and extension', async () => {
		const f = mockTFile('Projects/Deep/Adopted Header.md');
		const app = mockApp({ files: [f] });
		const idx = createFilesIndex(app);

		await idx.refresh();

		expect(idx.flatIds).toEqual(['Projects/Deep/Adopted Header.md']);
		expect(idx.getSearchBuffer(f.path)).toContain('adopted header');
		expect(idx.getSearchBuffer(f.path)).toContain('projects/deep/adopted header.md');
		expect(idx.getSearchBuffer(f.path)).toContain('md');
	});
});
