import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';
import { createContentIndex } from '../../../src/index/indexContent';

describe('serviceContentIndex', () => {
	it('returns empty when query is empty', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'hello world']]) });
		const idx = createContentIndex(app);
		idx.setQuery('');
		await idx.refresh();
		expect(idx.nodes.length).toBe(0);
	});

	it('returns empty when query is whitespace only', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'hello world']]) });
		const idx = createContentIndex(app);
		idx.setQuery('   ');
		await idx.refresh();
		expect(idx.nodes.length).toBe(0);
	});

	it('finds matches with line and snippet', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({
			files: [f],
			adapterFiles: new Map([['a.md', 'line one\nfoobar baz\nline three']]),
		});
		const idx = createContentIndex(app);
		idx.setQuery('foobar');
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
		expect(idx.nodes[0].line).toBe(1);
		expect(idx.nodes[0].match).toBe('foobar');
	});

	it('matches content case-insensitively by default and preserves original text', async () => {
		const f1 = mockTFile('lower.md');
		const f2 = mockTFile('upper.md');
		const app = mockApp({
			files: [f1, f2],
			adapterFiles: new Map([
				['lower.md', 'hola mundo'],
				['upper.md', 'Hola mundo'],
			]),
		});
		const idx = createContentIndex(app);
		idx.setQuery('hola');
		await idx.refresh();

		expect(idx.nodes.map((node) => node.filePath)).toEqual(['lower.md', 'upper.md']);
		expect(idx.nodes.map((node) => node.match)).toEqual(['hola', 'Hola']);
	});

	it('sets correct id, filePath, before, after', async () => {
		const f = mockTFile('notes/a.md');
		const app = mockApp({
			files: [f],
			adapterFiles: new Map([['notes/a.md', 'prefix foobar suffix']]),
		});
		const idx = createContentIndex(app);
		idx.setQuery('foobar');
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
		const node = idx.nodes[0];
		expect(node.id).toBe('notes/a.md:0:7');
		expect(node.filePath).toBe('notes/a.md');
		expect(node.line).toBe(0);
		expect(node.before).toBe('prefix ');
		expect(node.after).toBe(' suffix');
		expect(node.match).toBe('foobar');
	});

	it('finds multiple matches across lines and files', async () => {
		const f1 = mockTFile('a.md');
		const f2 = mockTFile('b.md');
		const app = mockApp({
			files: [f1, f2],
			adapterFiles: new Map([
				['a.md', 'foo bar\nbaz foo'],
				['b.md', 'no match here'],
			]),
		});
		const idx = createContentIndex(app);
		idx.setQuery('foo');
		await idx.refresh();
		expect(idx.nodes.length).toBe(2);
		expect(idx.nodes[0].filePath).toBe('a.md');
		expect(idx.nodes[0].line).toBe(0);
		expect(idx.nodes[1].filePath).toBe('a.md');
		expect(idx.nodes[1].line).toBe(1);
	});

	it('byId looks up a match by id', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'hello world']]) });
		const idx = createContentIndex(app);
		idx.setQuery('world');
		await idx.refresh();
		const node = idx.nodes[0];
		expect(idx.byId(node.id)).toBe(node);
	});

	it('clears results when query is reset to empty', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'foobar']]) });
		const idx = createContentIndex(app);
		idx.setQuery('foobar');
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);

		idx.setQuery('');
		await idx.refresh();
		expect(idx.nodes.length).toBe(0);
	});

	it('truncates before/after to 30 chars', async () => {
		const f = mockTFile('a.md');
		const longBefore = 'a'.repeat(40);
		const longAfter = 'b'.repeat(40);
		const content = `${longBefore}MATCH${longAfter}`;
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', content]]) });
		const idx = createContentIndex(app);
		idx.setQuery('MATCH');
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
		expect(idx.nodes[0].before.length).toBeLessThanOrEqual(30);
		expect(idx.nodes[0].after.length).toBeLessThanOrEqual(30);
	});

	it('finds multiple matches on same line', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'foo bar foo']]) });
		const idx = createContentIndex(app);
		idx.setQuery('foo');
		await idx.refresh();
		expect(idx.nodes.length).toBe(2);
		expect(idx.nodes[0].id).toBe('a.md:0:0');
		expect(idx.nodes[1].id).toBe('a.md:0:8');
	});

	it('notifies subscribers on refresh', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'foobar']]) });
		const idx = createContentIndex(app);
		idx.setQuery('foobar');
		let callCount = 0;
		idx.subscribe(() => {
			callCount++;
		});
		await idx.refresh();
		expect(callCount).toBeGreaterThan(0);
	});

	it('increments revision when publishing content snapshots', async () => {
		const f = mockTFile('a.md');
		const app = mockApp({ files: [f], adapterFiles: new Map([['a.md', 'foobar']]) });
		const idx = createContentIndex(app);

		expect(idx.revision).toBe(0);
		idx.setQuery('foobar');
		await idx.refresh();
		expect(idx.revision).toBeGreaterThan(0);
	});
});
