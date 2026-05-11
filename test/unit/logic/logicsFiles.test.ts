import { describe, it, expect } from 'vitest';
import { FilesLogic } from '../../../src/logic/logicsFiles';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';

function setup() {
	const a = mockTFile('Notes/a.md', { frontmatter: { x: 1 } });
	const b = mockTFile('Notes/Sub/b.md', { frontmatter: { y: 2, z: 3 } });
	const c = mockTFile('Other/c.md');
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { x: 1 } }],
		[b.path, { frontmatter: { y: 2, z: 3 } }],
		[c.path, { frontmatter: {} }],
	]);
	const app = mockApp({ files: [a, b, c], metadata: meta });
	return { app, files: [a, b, c], a, b, c };
}

describe('FilesLogic', () => {
	it('flatList returns a copy of the input', () => {
		const { app, files } = setup();
		const logic = new FilesLogic(app);
		const out = logic.flatList(files);
		expect(out).toEqual(files);
		expect(out).not.toBe(files);
	});

	it('buildFileTree groups files under their parent folder nodes', () => {
		const { app, files, a, b, c } = setup();
		const logic = new FilesLogic(app);
		const tree = logic.buildFileTree(files);

		const notes = tree.find((n) => n.id === 'folder:Notes');
		expect(notes).toBeDefined();
		expect(notes!.children?.some((n) => n.id === a.path)).toBe(true);
		const sub = notes!.children?.find((n) => n.id === 'folder:Notes/Sub');
		expect(sub?.children?.[0].id).toBe(b.path);

		const other = tree.find((n) => n.id === 'folder:Other');
		expect(other?.children?.[0].id).toBe(c.path);
	});

	it('buildFileTree count = number of frontmatter properties (excluding position)', () => {
		const { app, files, b } = setup();
		const logic = new FilesLogic(app);
		const tree = logic.buildFileTree(files);
		const fileNode = tree
			.find((n) => n.id === 'folder:Notes')
			?.children?.find((n) => n.id === 'folder:Notes/Sub')
			?.children?.find((n) => n.id === b.path);
		expect(fileNode?.count).toBe(2);
	});

	it('filterFlat: name filters basename, folder filters path', () => {
		const { app, files, a, b } = setup();
		const logic = new FilesLogic(app);
		expect(logic.filterFlat(files, 'a', '')).toEqual([a]);
		expect(logic.filterFlat(files, '', 'Sub')).toEqual([b]);
		expect(logic.filterFlat(files, '', '').length).toBe(3);
	});

	it('filterFlat can consume precomputed lowercase search buffers by path', () => {
		const { app, files, b } = setup();
		const logic = new FilesLogic(app);
		const buffers = new Map(files.map((file) => [file.path, `${file.basename}\n${file.path}`.toLowerCase()]));

		expect(logic.filterFlat(files, 'B', 'NOTES/SUB', (path) => buffers.get(path) ?? '')).toEqual([
			b,
		]);
	});
});
