import type { TFile, TFolder, Vault } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	buildNativeSearchPreview,
	findContentOffsets,
	NativeSearchAdapter,
	toNativeSearchQuery,
} from '../../src/services/serviceNativeSearchAdapter';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	const name = path === '/' ? '' : (path.split('/').pop() ?? path);
	return {
		children: [],
		isRoot: () => path === '/',
		name,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const lastSlash = path.lastIndexOf('/');
	const parentPath = lastSlash === -1 ? '/' : path.slice(0, lastSlash);
	const name = path.split('/').pop() ?? path;
	const basename = name.replace(/\.md$/, '');
	return {
		basename,
		extension: 'md',
		name,
		parent: makeFolder(parentPath),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

describe('Native search adapter helpers', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('maps native offsets into content preview snippets', () => {
		const file = makeFile('notes/example.md');
		const content = 'first line\nstatus: done\nlast line';

		const preview = buildNativeSearchPreview([
			{
				file,
				content,
				offsets: [[11, 17]],
			},
		]);

		expect(preview.totalMatches).toBe(1);
		expect(preview.files[0].file).toBe(file);
		expect(preview.files[0].matchCount).toBe(1);
		expect(preview.files[0].snippets[0]).toMatchObject({
			match: 'status',
			line: 1,
			ch: 0,
		});
	});

	it('formats regex searches for native Obsidian search syntax', () => {
		expect(toNativeSearchQuery('status', false)).toBe('status');
		expect(toNativeSearchQuery('status: (done|draft)', true)).toBe(
			'/status: (done|draft)/',
		);
		expect(toNativeSearchQuery('/status/', true)).toBe('/status/');
	});

	it('renders normal multi-file previews without the old ten-file cap', () => {
		const inputs = Array.from({ length: 12 }, (_, index) => ({
			file: makeFile(`notes/${index}.md`),
			content: 'birthday',
			offsets: [[0, 8]] as [number, number][],
		}));

		const preview = buildNativeSearchPreview(inputs);

		expect(preview.files).toHaveLength(12);
		expect(preview.moreFiles).toBe(0);
		expect(preview.matchedFiles?.map((file) => file.path)).toHaveLength(12);
	});

	it('keeps all matched files even when a pathological preview is capped', () => {
		const inputs = Array.from({ length: 205 }, (_, index) => ({
			file: makeFile(`notes/${index}.md`),
			content: 'birthday',
			offsets: [[0, 8]] as [number, number][],
		}));

		const preview = buildNativeSearchPreview(inputs);

		expect(preview.files).toHaveLength(200);
		expect(preview.moreFiles).toBe(5);
		expect(preview.matchedFiles?.map((file) => file.path)).toHaveLength(205);
	});

	it('finds literal and regex content offsets for the public fallback search', () => {
		expect(findContentOffsets('Base base BASE', 'base', false, false)).toEqual([
			[0, 4],
			[5, 9],
			[10, 14],
		]);
		expect(findContentOffsets('tag-1 tag-20', 'tag-\\d+', true, true)).toEqual([
			[0, 5],
			[6, 12],
		]);
	});

	it('does not open the core Search leaf when no existing search view is available', async () => {
		vi.stubGlobal('window', { setTimeout });
		const file = makeFile('notes/journal.md');
		const executeCommandById = vi.fn();
		const adapter = new NativeSearchAdapter({
			commands: { executeCommandById },
			vault: {
				cachedRead: async () => 'today journal entry',
			},
			workspace: {
				getLeavesOfType: () => [],
			},
		} as never);
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'journal',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [file],
			onUpdate: (result) => updates.push(result),
		});

		expect(executeCommandById).not.toHaveBeenCalled();
		expect(updates.at(-1)).toMatchObject({
			totalMatches: 1,
			isLoading: false,
		});
	});

	it('supplements native search with local reads when the native DOM misses hidden matches', async () => {
		vi.stubGlobal('window', { setTimeout });
		const file = makeFile('this works.md');
		const view = {
			dom: {
				getFiles: () => [],
				getResult: () => null,
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async () => '#dashboard#das#donehboard',
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'doneh',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [file],
			onUpdate: (result) => updates.push(result),
		});

		expect(updates.at(-1)).toMatchObject({
			totalMatches: 1,
			isLoading: false,
		});
		expect(updates.at(-1)?.files[0].file.path).toBe('this works.md');
	});

	it('merges local offsets into native files when the native DOM under-reports snippets', async () => {
		vi.stubGlobal('window', { setTimeout });
		const file = makeFile('notes/como.md');
		const view = {
			dom: {
				getFiles: () => [file],
				getResult: () => ({
					content: 'como aqui',
					result: { content: [[0, 4]] as [number, number][] },
				}),
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async () => 'como aqui como tambien',
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [file],
			onUpdate: (result) => updates.push(result),
		});

		expect(updates.at(-1)).toMatchObject({
			totalMatches: 2,
			isLoading: false,
		});
		expect(updates.at(-1)?.files[0].matchCount).toBe(2);
	});

	it('reconciles small native snapshots against the full scoped candidate set', async () => {
		vi.stubGlobal('window', { setTimeout });
		const nativeFile = makeFile('notes/como.md');
		const unrelatedFile = makeFile('notes/unrelated.md');
		const readPaths: string[] = [];
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];
		const view = {
			dom: {
				getFiles: () => [nativeFile],
				getResult: (file: TFile) =>
					file === nativeFile
						? {
								content: 'como aqui',
								result: { content: [[0, 4]] as [number, number][] },
							}
						: null,
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async (file: TFile) => {
					readPaths.push(file.path);
					return file === nativeFile ? 'como aqui como tambien' : 'como';
				},
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);

		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [nativeFile, unrelatedFile],
			onUpdate: (result) => updates.push(result),
		});

		expect(readPaths).toEqual([nativeFile.path, unrelatedFile.path]);
		expect(updates.at(-1)).toMatchObject({
			totalMatches: 3,
			isLoading: false,
		});
		expect(updates.at(-1)?.files.map((entry) => entry.file.path)).toEqual([
			nativeFile.path,
			unrelatedFile.path,
		]);
	});

	it('uses the latest non-empty native snapshot when the final native DOM snapshot is empty', async () => {
		vi.stubGlobal('window', { setTimeout });
		const nativeFile = makeFile('notes/como.md');
		const unrelatedFile = makeFile('notes/unrelated.md');
		const readPaths: string[] = [];
		let getFilesCalls = 0;
		const view = {
			dom: {
				getFiles: () => {
					getFilesCalls += 1;
					return getFilesCalls <= 8 ? [nativeFile] : [];
				},
				getResult: (file: TFile) =>
					file === nativeFile
						? {
								content: 'como aqui',
								result: { content: [[0, 4]] as [number, number][] },
							}
						: null,
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async (file: TFile) => {
					readPaths.push(file.path);
					return file === nativeFile ? 'como aqui como tambien' : 'como';
				},
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [nativeFile, unrelatedFile],
			onUpdate: (result) => updates.push(result),
		});

		expect(readPaths).toEqual([nativeFile.path, unrelatedFile.path]);
		expect(updates.at(-1)).toMatchObject({
			totalMatches: 3,
			isLoading: false,
		});
	});

	it('waits past the old short polling window before reconciling native results', async () => {
		vi.stubGlobal('window', {
			setTimeout: (handler: () => void, _timeout?: number) => {
				handler();
				return 0;
			},
		});
		const firstFile = makeFile('notes/first.md');
		const lateFile = makeFile('notes/late.md');
		const readPaths: string[] = [];
		let getFilesCalls = 0;
		const view = {
			dom: {
				getFiles: () => {
					getFilesCalls += 1;
					return getFilesCalls <= 10 ? [firstFile] : [firstFile, lateFile];
				},
				getMatchCount: () => (getFilesCalls <= 10 ? 1 : 2),
				getResult: (file: TFile) => ({
					content: file === firstFile ? 'como first' : 'como late',
					result: { content: [[0, 4]] as [number, number][] },
				}),
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async (file: TFile) => {
					readPaths.push(file.path);
					return file === firstFile ? 'como first' : 'como late';
				},
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [firstFile, lateFile],
			onUpdate: (result) => updates.push(result),
		});

		expect(readPaths).toEqual([firstFile.path, lateFile.path]);
		expect(updates.at(-1)).toMatchObject({
			totalMatches: 2,
			isLoading: false,
		});
	});

	it('keeps polling longer for large native result sets', async () => {
		vi.stubGlobal('window', {
			setTimeout: (handler: () => void, _timeout?: number) => {
				handler();
				return 0;
			},
		});
		const firstFile = makeFile('notes/first.md');
		const lateFile = makeFile('notes/late.md');
		const readPaths: string[] = [];
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];
		let getFilesCalls = 0;
		const view = {
			dom: {
				getFiles: () => {
					getFilesCalls += 1;
					return getFilesCalls <= 20 ? [firstFile] : [firstFile, lateFile];
				},
				getMatchCount: () => 60,
				getResult: (file: TFile) => ({
					content: file === firstFile ? 'como first' : 'como late',
					result: { content: [[0, 4]] as [number, number][] },
				}),
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async (file: TFile) => {
					readPaths.push(file.path);
					return file === firstFile ? 'como first' : 'como late';
				},
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);

		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [firstFile, lateFile],
			onUpdate: (result) => updates.push(result),
		});

		expect(readPaths).toEqual([]);
		expect(updates.at(-1)).toMatchObject({
			totalMatches: 60,
			isLoading: false,
		});
	});
});
