/* eslint-disable obsidianmd/prefer-window-timers -- this test stubs window.setTimeout itself */
import type { App, CachedMetadata, TFile, TFolder, Vault } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FilterService } from '../../src/services/serviceFilter';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path === '/' ? '' : (path.split('/').pop() ?? path),
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const lastSlash = path.lastIndexOf('/');
	const fileName = lastSlash === -1 ? path : path.slice(lastSlash + 1);
	const dot = fileName.lastIndexOf('.');
	const parentPath = lastSlash === -1 ? '/' : path.slice(0, lastSlash);
	return {
		basename: dot === -1 ? fileName : fileName.slice(0, dot),
		extension: dot === -1 ? '' : fileName.slice(dot + 1),
		name: fileName,
		parent: makeFolder(parentPath),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

type Handler = (...args: unknown[]) => void;

function makeApp(filesRef: { current: TFile[] }): {
	app: App;
	fire: (name: string, ...args: unknown[]) => void;
} {
	const handlers: Record<string, Handler[]> = {};
	const app = {
		vault: {
			getMarkdownFiles: () => filesRef.current,
			getFiles: () => filesRef.current,
			on: (name: string, cb: Handler) => {
				(handlers[name] ??= []).push(cb);
				return {};
			},
		},
		metadataCache: {
			getFileCache: () => ({ frontmatter: {} }) as CachedMetadata,
			on: (name: string, cb: Handler) => {
				(handlers[`meta:${name}`] ??= []).push(cb);
				return {};
			},
		},
	} as unknown as App;
	const fire = (name: string, ...args: unknown[]) => {
		for (const cb of handlers[name] ?? []) cb(...args);
	};
	return { app, fire };
}

describe('BT5-092 filtered set follows vault deletions', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Route the service's window timers to the (now faked) global timers, so
		// advanceTimersByTime drives the debounce. Typed as a function to avoid
		// the implied-eval lint on a bare setTimeout.
		vi.stubGlobal('window', {
			setTimeout: (handler: () => void, timeout?: number) =>
				setTimeout(handler, timeout),
			clearTimeout: (id?: number) => clearTimeout(id),
		});
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('drops a deleted file from filteredVaultFiles, even with no filters', () => {
		const filesRef = { current: [makeFile('a.md'), makeFile('b.md')] };
		const { app, fire } = makeApp(filesRef);
		const service = new FilterService(app);
		service.onload();

		expect(service.filteredVaultFiles.map((f) => f.basename)).toEqual([
			'a',
			'b',
		]);

		// The file leaves the vault, then Obsidian fires the delete event.
		const removed = filesRef.current[1];
		filesRef.current = filesRef.current.filter((f) => f !== removed);
		fire('delete', removed);
		vi.advanceTimersByTime(200);

		expect(service.filteredVaultFiles.map((f) => f.basename)).toEqual(['a']);
	});

	it('coalesces a bulk delete into a single recompute', () => {
		const filesRef = {
			current: ['a', 'b', 'c', 'd'].map((n) => makeFile(`${n}.md`)),
		};
		const { app, fire } = makeApp(filesRef);
		const service = new FilterService(app);
		service.onload();
		const changed = vi.fn();
		service.on('changed', changed);

		// Three files deleted in quick succession before the timer fires.
		for (const name of ['b', 'c', 'd']) {
			const target = filesRef.current.find((f) => f.basename === name)!;
			filesRef.current = filesRef.current.filter((f) => f !== target);
			fire('delete', target);
		}
		vi.advanceTimersByTime(200);

		expect(service.filteredVaultFiles.map((f) => f.basename)).toEqual(['a']);
		// One trailing recompute for the whole burst, not three.
		expect(changed).toHaveBeenCalledTimes(1);
	});
});
