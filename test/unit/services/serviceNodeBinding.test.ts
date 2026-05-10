import { describe, it, expect, vi } from 'vitest';
import {
	NodeBindingService,
	computeAliasToken,
	findNotesByAlias,
} from '../../../src/services/serviceNodeBinding';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';

describe('serviceNodeBinding — computeAliasToken', () => {
	it('renders prop tokens as [propname]', () => {
		expect(
			computeAliasToken({ kind: 'prop', label: 'status', propName: 'status' }),
		).toBe('[status]');
	});

	it('renders tag tokens as #tag', () => {
		expect(
			computeAliasToken({ kind: 'tag', label: 'project/active', tagPath: 'project/active' }),
		).toBe('#project/active');
	});

	it('strips leading # from tag input', () => {
		expect(computeAliasToken({ kind: 'tag', label: '#alpha' })).toBe('#alpha');
	});

	it('uses the label verbatim for value/folder/template', () => {
		expect(computeAliasToken({ kind: 'value', label: 'draft' })).toBe('draft');
		expect(computeAliasToken({ kind: 'folder', label: 'Diaries' })).toBe('Diaries');
		expect(computeAliasToken({ kind: 'template', label: 'tpl' })).toBe('tpl');
	});

	it('renders snippet tokens as $snippetname', () => {
		expect(computeAliasToken({ kind: 'snippet', label: 'mySnip' })).toBe('$mySnip');
	});

	it('renders plugin tokens from the stable manifest id as %pluginid', () => {
		expect(
			computeAliasToken({ kind: 'plugin', label: 'Calendar', pluginId: 'calendar-plugin' }),
		).toBe('%calendar-plugin');
	});

	it('falls back to the label for plugin tokens when no manifest id is supplied', () => {
		expect(computeAliasToken({ kind: 'plugin', label: 'Calendar' })).toBe('%Calendar');
	});
});

describe('serviceNodeBinding — findNotesByAlias', () => {
	it('returns files whose aliases array contains the token', () => {
		const a = mockTFile('a.md');
		const b = mockTFile('b.md');
		const c = mockTFile('c.md');
		const meta = new Map<string, { frontmatter?: Record<string, unknown> }>();
		meta.set('a.md', { frontmatter: { aliases: ['#tag1', 'other'] } });
		meta.set('b.md', { frontmatter: { aliases: '#tag1' } });
		meta.set('c.md', { frontmatter: { aliases: ['nope'] } });
		const app = mockApp({ files: [a, b, c], metadata: meta });
		const out = findNotesByAlias(app, '#tag1');
		expect(out.map((f) => f.path).sort()).toEqual(['a.md', 'b.md']);
	});

	it('returns an empty list when no aliases match', () => {
		const a = mockTFile('a.md');
		const app = mockApp({ files: [a] });
		expect(findNotesByAlias(app, '[absent]')).toEqual([]);
	});
});

describe('NodeBindingService.bindOrCreate', () => {
	it('creates a new note when zero notes match (cardinality 0)', async () => {
		const app = mockApp();
		const openFile = vi.fn().mockResolvedValue(undefined);
		(app.workspace as unknown as Record<string, unknown>).getLeaf = () => ({
			openFile,
		});
		const svc = new NodeBindingService({ app, getFolder: () => '' });
		const result = await svc.bindOrCreate({ kind: 'prop', label: 'status', propName: 'status' });
		expect(result.outcome).toBe('created');
		expect(result.token).toBe('[status]');
		expect(result.filePath).toBe('status.md');
		const created = app.vault.getFileByPath('status.md');
		expect(created).not.toBeNull();
		expect(openFile).toHaveBeenCalledTimes(1);
	});

	it('writes the alias token into the new note frontmatter', async () => {
		const app = mockApp();
		(app.workspace as unknown as Record<string, unknown>).getLeaf = () => ({
			openFile: () => Promise.resolve(),
		});
		const svc = new NodeBindingService({ app, getFolder: () => '' });
		await svc.bindOrCreate({ kind: 'tag', label: 'urgent', tagPath: 'urgent' });
		const f = app.vault.getFileByPath('urgent.md');
		expect(f).not.toBeNull();
		const raw = await app.vault.read(f!);
		expect(raw).toContain("aliases:");
		expect(raw).toContain("'#urgent'");
	});

	it('uses the node label as the note title while keeping prefixed aliases', async () => {
		const app = mockApp();
		(app.workspace as unknown as Record<string, unknown>).getLeaf = () => ({
			openFile: () => Promise.resolve(),
		});
		const svc = new NodeBindingService({ app, getFolder: () => 'Bindings' });

		const result = await svc.bindOrCreate({
			kind: 'plugin',
			label: 'Calendar',
			pluginId: 'calendar-plugin',
		});

		expect(result.filePath).toBe('Bindings/Calendar.md');
		const raw = await app.vault.read(app.vault.getFileByPath('Bindings/Calendar.md')!);
		expect(raw).toContain("'%calendar-plugin'");
	});

	it('opens the matching note when exactly one note matches (cardinality 1)', async () => {
		const a = mockTFile('a.md');
		const meta = new Map<string, { frontmatter?: Record<string, unknown> }>();
		meta.set('a.md', { frontmatter: { aliases: ['[status]'] } });
		const app = mockApp({ files: [a], metadata: meta });
		const openFile = vi.fn().mockResolvedValue(undefined);
		(app.workspace as unknown as Record<string, unknown>).getLeaf = () => ({
			openFile,
		});
		const svc = new NodeBindingService({ app, getFolder: () => '' });
		const result = await svc.bindOrCreate({ kind: 'prop', label: 'status', propName: 'status' });
		expect(result.outcome).toBe('opened');
		expect(result.filePath).toBe('a.md');
		expect(openFile).toHaveBeenCalledWith(a);
	});

	it('routes to filter when 2+ notes match (cardinality N)', async () => {
		const a = mockTFile('a.md');
		const b = mockTFile('b.md');
		const meta = new Map<string, { frontmatter?: Record<string, unknown> }>();
		meta.set('a.md', { frontmatter: { aliases: ['[status]'] } });
		meta.set('b.md', { frontmatter: { aliases: ['[status]'] } });
		const app = mockApp({ files: [a, b], metadata: meta });
		const router = vi.fn();
		const svc = new NodeBindingService({ app, getFolder: () => '', router });
		const result = await svc.bindOrCreate({ kind: 'prop', label: 'status', propName: 'status' });
		expect(result.outcome).toBe('routed');
		expect(result.matchCount).toBe(2);
		expect(router).toHaveBeenCalledWith('[status]');
	});

	it('honours a non-empty bindingNoteFolder when creating new notes', async () => {
		const app = mockApp();
		(app.workspace as unknown as Record<string, unknown>).getLeaf = () => ({
			openFile: () => Promise.resolve(),
		});
		const svc = new NodeBindingService({ app, getFolder: () => 'Bindings' });
		const result = await svc.bindOrCreate({ kind: 'value', label: 'wip' });
		expect(result.filePath).toBe('Bindings/wip.md');
	});
});
