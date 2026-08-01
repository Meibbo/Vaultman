import type { TFile, TFolder, Vault } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	buildNativeSearchPreview,
	createContentPreviewCache,
	findContentOffsets,
	NativeSearchAdapter,
	toNativeSearchQuery,
} from '../../src/services/serviceNativeSearchAdapter';
import type { ContentPreviewResult } from '../../src/types/typeUI';

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
		// The snippet used to carry `line: 1, ch: 0`, derived by scanning the
		// content up to the match. It carries the offset now and the editor
		// resolves the position on click — same destination, none of the scan.
		expect(preview.files[0].snippets[0]).toMatchObject({
			match: 'status',
			offset: 11,
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

	it('renders every matched file, with no cap left in the data', () => {
		// This asserted `MAX_FILES = 200` — 200 rendered, 5 announced as "more".
		// That cap truncated the *results*: the two-hundred-and-first file was
		// unreachable. It is gone. What bounds the document now is the render
		// window in `logicContentRenderWindow`, which only delays rows.
		const inputs = Array.from({ length: 205 }, (_, index) => ({
			file: makeFile(`notes/${index}.md`),
			content: 'birthday',
			offsets: [[0, 8]] as [number, number][],
		}));

		const preview = buildNativeSearchPreview(inputs);

		expect(preview.files).toHaveLength(205);
		expect(preview.moreFiles).toBe(0);
		expect(preview.matchedFiles?.map((file) => file.path)).toHaveLength(205);
	});

	it('keeps every match in a file, not the first three', () => {
		// `MAX_SNIPPETS = 3` was the same defect one level down: a file's fourth
		// match did not exist. Snippets only render for an expanded file, so the
		// cap bought nothing the collapse state was not already buying.
		const offsets = Array.from(
			{ length: 40 },
			(_, i) => [i * 10, i * 10 + 4] as [number, number],
		);
		const preview = buildNativeSearchPreview([
			{ file: makeFile('notes/many.md'), content: 'x'.repeat(500), offsets },
		]);

		expect(preview.files[0]?.snippets).toHaveLength(40);
		expect(preview.files[0]?.matchCount).toBe(40);
	});

	it('carries the match offset and computes no position while scanning', () => {
		// This was the fps collapse. `offsetToPosition` sliced the content from
		// zero to the match and split it on newlines, **per match**: it copied
		// every byte before the match and built an array of every line before it.
		// With `MAX_SNIPPETS = 3`
		// that ran three times a file and hid; uncapped it ran 27240 times per
		// poll, and the pane blocked for up to 2.4s at a time.
		//
		// The position is only ever used when a match is clicked, and the editor
		// computes it exactly via `offsetToPos` once the file is open. So the
		// snippet carries the offset and nothing scans.
		const content = ['line one', 'line two', 'line three'].join('\n');
		const start = content.indexOf('two');
		const preview = buildNativeSearchPreview([
			{
				file: makeFile('notes/pos.md'),
				content,
				offsets: [[start, start + 3]] as [number, number][],
			},
		]);

		const snippet = preview.files[0]?.snippets[0];
		expect(snippet?.offset).toBe(start);
		expect(snippet?.match).toBe('two');
	});

	it('costs the same per match wherever the match sits in the file', () => {
		// The regression guard for the quadratic: a match at the end of a large
		// file must not cost more than one at the start. Timing is noisy, so this
		// pins the ratio loosely — the old code was O(offset) and would blow this
		// out by orders of magnitude, not by a factor of three.
		const big = 'x'.repeat(400_000);
		const early = buildNativeSearchPreview([
			{ file: makeFile('a.md'), content: big, offsets: [[10, 14]] },
		]);
		const late = buildNativeSearchPreview([
			{ file: makeFile('b.md'), content: big, offsets: [[399_000, 399_004]] },
		]);

		const time = (fn: () => void): number => {
			const t0 = performance.now();
			for (let i = 0; i < 200; i += 1) fn();
			return performance.now() - t0;
		};
		const earlyMs = time(() =>
			buildNativeSearchPreview([
				{ file: makeFile('a.md'), content: big, offsets: [[10, 14]] },
			]),
		);
		const lateMs = time(() =>
			buildNativeSearchPreview([
				{ file: makeFile('b.md'), content: big, offsets: [[399_000, 399_004]] },
			]),
		);

		expect(early.files[0]?.snippets[0]?.offset).toBe(10);
		expect(late.files[0]?.snippets[0]?.offset).toBe(399_000);
		expect(lateMs).toBeLessThan(Math.max(earlyMs * 4, 50));
	});

	it('reuses a file entry across polls when its matches have not moved', () => {
		// A scan publishes every 150ms and rebuilt every snippet of every file
		// each time. At 65765 matches that is ~200k string allocations per poll,
		// and because each entry was a fresh object Svelte re-rendered every row
		// it had. fileScene does not do this: it builds its indices once and does
		// O(1) work per row.
		//
		// Identity is the contract. An unchanged file must come back as the same
		// object, so the poll costs nothing and the rows do not re-render.
		const cache = createContentPreviewCache();
		const inputs = [
			{ file: makeFile('a.md'), content: 'alpha beta', offsets: [[0, 5]] as [number, number][] },
			{ file: makeFile('b.md'), content: 'beta alpha', offsets: [[5, 10]] as [number, number][] },
		];

		const first = buildNativeSearchPreview(inputs, true, undefined, { cache });
		const second = buildNativeSearchPreview(inputs, true, undefined, { cache });

		expect(second.files[0]).toBe(first.files[0]);
		expect(second.files[1]).toBe(first.files[1]);
	});

	it('rebuilds only the file whose matches changed', () => {
		const cache = createContentPreviewCache();
		const stable = { file: makeFile('a.md'), content: 'alpha beta', offsets: [[0, 5]] as [number, number][] };
		const first = buildNativeSearchPreview([stable, {
			file: makeFile('b.md'), content: 'beta alpha', offsets: [[5, 10]] as [number, number][],
		}], true, undefined, { cache });

		const second = buildNativeSearchPreview([stable, {
			file: makeFile('b.md'),
			content: 'beta alpha',
			offsets: [[5, 10], [0, 4]] as [number, number][],
		}], true, undefined, { cache });

		expect(second.files[0]).toBe(first.files[0]);
		expect(second.files[1]).not.toBe(first.files[1]);
		expect(second.files[1]?.matchCount).toBe(2);
	});

	it('rebuilds every file when extra context is switched on', () => {
		// Core's switch is view-wide, so this invalidates the whole memo rather
		// than one row. It is a user action, not something a poll does.
		const cache = createContentPreviewCache();
		const inputs = [
			{ file: makeFile('a.md'), content: 'x'.repeat(600), offsets: [[300, 304]] as [number, number][] },
			{ file: makeFile('b.md'), content: 'x'.repeat(600), offsets: [[300, 304]] as [number, number][] },
		];
		const first = buildNativeSearchPreview(inputs, true, undefined, { cache });
		const second = buildNativeSearchPreview(inputs, true, undefined, {
			cache,
			extraContext: true,
			fileCache: () => ({}),
		});

		expect(second.files[0]).not.toBe(first.files[0]);
		expect(second.files[1]).not.toBe(first.files[1]);
	});

	it('grows a match to its whole line when extra context is on', () => {
		// Core's shape: structural, not a character radius. With no cache entry
		// the match grows to its line, which is core's own fallback.
		const newline = String.fromCharCode(10);
		const content = ['padding line', 'a'.repeat(200) + 'MATCH' + 'b'.repeat(200)].join(
			newline,
		);
		const start = content.indexOf('MATCH');
		const inputs = [
			{
				file: makeFile('notes/one.md'),
				content,
				offsets: [[start, start + 5]] as [number, number][],
			},
		];

		const off = buildNativeSearchPreview(inputs, false);
		const on = buildNativeSearchPreview(inputs, false, undefined, {
			extraContext: true,
			fileCache: () => ({}),
		});

		expect(off.files[0]?.snippets[0]?.before).toHaveLength(40);
		expect(on.files[0]?.snippets[0]?.before).toHaveLength(200);
		expect(on.files[0]?.snippets[0]?.after).toHaveLength(200);
		expect(on.files[0]?.snippets[0]?.match).toBe('MATCH');
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

	// U121-017 regression guards. Three builds shipped with green suites while
	// pause and resume were broken in the app, because nothing here exercised the
	// lifecycle against the adapter. These two fail on the code as it shipped.
	it('accumulates retained matches across polls instead of replacing them', async () => {
		vi.stubGlobal('window', {
			setTimeout: (handler: () => void, _timeout?: number) => {
				handler();
				return 0;
			},
		});
		const early = makeFile('notes/early.md');
		const late = makeFile('notes/late.md');
		let polls = 0;
		// Core drops `early` from its DOM once it has moved on to `late`. The
		// retained floor must still carry it, or a resume loses ground.
		const view = {
			dom: {
				working: true,
				getFiles: () => {
					polls += 1;
					return polls <= 2 ? [early] : [late];
				},
				getMatchCount: () => 1,
				getResult: (file: TFile) => ({
					content: file === early ? 'como early' : 'como late',
					result: { content: [[0, 4]] as [number, number][] },
				}),
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			stopSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				cachedRead: async (file: TFile) =>
					file === early ? 'como early' : 'como late',
			},
			workspace: { getLeavesOfType: () => [{ view }] },
		} as never);

		const searching = adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [early, late],
			onUpdate: () => {},
		});
		// Let a few polls run, then stop the way a pause does.
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		adapter.cancel();
		await searching;

		const retainedPaths = adapter.retainedInputs().map((i) => i.file.path);
		expect(retainedPaths).toContain(early.path);
	});

	it('stops core and silences updates when a pause cancels the run', async () => {
		vi.stubGlobal('window', {
			setTimeout: (handler: () => void, _timeout?: number) => {
				handler();
				return 0;
			},
		});
		const file = makeFile('notes/only.md');
		const view = {
			dom: {
				working: true,
				getFiles: () => [file],
				getMatchCount: () => 1,
				getResult: () => ({
					content: 'como only',
					result: { content: [[0, 4]] as [number, number][] },
				}),
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			stopSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: { cachedRead: async () => 'como only' },
			workspace: { getLeavesOfType: () => [{ view }] },
		} as never);
		let updates = 0;

		const searching = adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [file],
			onUpdate: () => {
				updates += 1;
			},
		});
		await Promise.resolve();
		adapter.cancel();
		const afterCancel = updates;
		await searching;

		// Core is told to stop, not just our loop.
		expect(view.stopSearch).toHaveBeenCalled();
		// And nothing publishes after the cancel, so a paused count cannot climb.
		expect(updates).toBe(afterCancel);
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

describe('local offsets are authoritative for scanned files (BT4-019)', () => {
	it('does not duplicate a match when native offsets use a different basis', async () => {
		vi.stubGlobal('window', { setTimeout });
		const file = makeFile('notes/frase.md');
		const view = {
			dom: {
				getFiles: () => [file],
				// Native snapshot computed over ITS OWN content basis: the same
				// single occurrence, but at a different offset than the raw file.
				getResult: () => ({
					content: 'te quiero mucho',
					result: { content: [[0, 15]] as [number, number][] },
				}),
			},
			setQuery: vi.fn(),
			startSearch: vi.fn(),
			setMatchingCase: vi.fn(),
		};
		const adapter = new NativeSearchAdapter({
			vault: {
				// Raw file: frontmatter shifts the only occurrence.
				cachedRead: async () => '---\nx: 1\n---\nte quiero mucho',
			},
			workspace: {
				getLeavesOfType: () => [{ view }],
			},
		} as never);
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'te quiero mucho',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [file],
			onUpdate: (result) => updates.push(result),
		});

		expect(updates.at(-1)).toMatchObject({
			totalMatches: 1,
			isLoading: false,
		});
		expect(updates.at(-1)?.files[0].matchCount).toBe(1);
	});
});

describe('resuming a local traversal (U121-017 micro-freeze)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function makeAdapter(term: string) {
		return new NativeSearchAdapter({
			vault: {
				cachedRead: async (file: TFile) =>
					file.basename === 'empty' ? 'nothing here' : `a ${term} line`,
			},
			workspace: { getLeavesOfType: () => [] },
		} as never);
	}

	it('repaints the retained floor on the first frame of a resume', async () => {
		// `searchLocal` opened a resume with `seedInputs ?? []`, and the host never
		// passes `seedInputs` — so the first frame was an empty preview. Every Text
		// node in the explorer blanked and then had to be rebuilt from a retained
		// set thousands of files deep. That is the hang the dev feels on Resume:
		// the floor is only recovered further down, inside collectLocalResults.
		vi.stubGlobal('window', { setTimeout });
		const scope = [
			makeFile('notes/one.md'),
			makeFile('notes/two.md'),
			makeFile('notes/three.md'),
		];
		const adapter = makeAdapter('needle');

		await adapter.search({
			query: 'needle',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: scope.slice(0, 2),
			preferLocal: true,
			onUpdate: () => {},
		});

		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];
		await adapter.search({
			query: 'needle',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: scope,
			resumeFrom: 2,
			preferLocal: true,
			onUpdate: (result) => updates.push(result),
		});

		expect(updates[0].isLoading).toBe(true);
		expect(updates[0].files.length).toBe(2);
		expect(updates[0].totalMatches).toBeGreaterThan(0);
	});

	it('still opens a fresh scan on an empty frame', async () => {
		// Only a resume carries a floor. A scan from zero must not repaint
		// whatever the previous query left behind.
		vi.stubGlobal('window', { setTimeout });
		const adapter = makeAdapter('needle');
		const updates: ReturnType<typeof buildNativeSearchPreview>[] = [];

		await adapter.search({
			query: 'needle',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [makeFile('notes/one.md')],
			resumeFrom: 0,
			preferLocal: true,
			onUpdate: (result) => updates.push(result),
		});

		expect(updates[0].files.length).toBe(0);
	});
});

describe('resume does not restart the traversal (U121-017)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('repaints the retained floor on a resume whose cursor never moved', async () => {
		// The native path never calls `onProgress` — only `collectLocalResults`
		// does — so a scan that ran through core leaves the host cursor at 0. The
		// resume that follows therefore arrives with `resumeFrom === 0`, and
		// seeding the first frame off `resumeFrom > 0` left it empty: every Text
		// node in the explorer blanked and was then rebuilt from a floor thousands
		// of files deep. Whether this is a resume is the caller's statement, not
		// something to infer from a cursor the fast path never advances.
		vi.stubGlobal('window', { setTimeout });
		const fileA = makeFile('notes/a.md');
		const fileB = makeFile('notes/b.md');
		const adapter = new NativeSearchAdapter({
			vault: { cachedRead: async () => 'como aqui' },
			workspace: { getLeavesOfType: () => [] },
		} as never);

		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [fileA, fileB],
			onUpdate: () => {},
		});
		expect(adapter.retainedInputs().length).toBe(2);

		const updates: ContentPreviewResult[] = [];
		await adapter.search({
			query: 'como',
			isRegex: false,
			caseSensitive: false,
			scopeFiles: [fileA, fileB],
			resume: true,
			resumeFrom: 0,
			onUpdate: (result) => updates.push(result),
		});

		expect(updates[0].isLoading).toBe(true);
		expect(updates[0].files.length).toBe(2);
	});
});
