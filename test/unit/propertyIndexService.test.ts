import { TFile, type App, type CachedMetadata } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PropertyIndexService } from '../../src/services/servicePropertyIndex';

type EventCallback = (...args: unknown[]) => void;

function createEventHub() {
	const callbacks = new Map<string, Set<EventCallback>>();
	return {
		on: (name: string, callback: EventCallback) => {
			if (!callbacks.has(name)) callbacks.set(name, new Set());
			callbacks.get(name)?.add(callback);
			return {};
		},
		trigger: (name: string, ...args: unknown[]) => {
			for (const callback of callbacks.get(name) ?? []) callback(...args);
		},
	};
}

function makeFile(path: string): TFile {
	const file = new TFile();
	file.path = path;
	return file;
}

function makeHarness() {
	const metadataEvents = createEventHub();
	const vaultEvents = createEventHub();
	const file = makeFile('People/Ada.md');
	const files = [file];
	const cacheByPath: Record<string, CachedMetadata> = {
		[file.path]: { frontmatter: { role: 'engineer' } },
	};
	const app = {
		metadataCache: {
			getFileCache: (candidate: TFile) => cacheByPath[candidate.path] ?? null,
			on: metadataEvents.on,
		},
		vault: {
			getFileByPath: (path: string) =>
				files.find((candidate) => candidate.path === path) ?? null,
			getMarkdownFiles: () => files,
			on: vaultEvents.on,
		},
	} as unknown as App;

	return { app, cacheByPath, file, files, metadataEvents, vaultEvents };
}

describe('PropertyIndexService metadata backpressure', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('window', { clearTimeout, setTimeout });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('rebuilds immediately on load and only once for the first resolved event', () => {
		const { app, metadataEvents } = makeHarness();
		const service = new PropertyIndexService(app);
		const rebuild = vi.spyOn(service, 'rebuild');

		service.onload();
		metadataEvents.trigger('resolved');
		metadataEvents.trigger('resolved');
		metadataEvents.trigger('resolved');

		expect(rebuild).toHaveBeenCalledTimes(2);
	});

	it('continues applying changed events incrementally after the initial resolve', () => {
		const { app, cacheByPath, file, metadataEvents } = makeHarness();
		const service = new PropertyIndexService(app);
		service.onload();
		metadataEvents.trigger('resolved');
		cacheByPath[file.path] = {
			frontmatter: { role: 'engineer', status: 'active' },
		};

		metadataEvents.trigger('changed', file);
		vi.advanceTimersByTime(49);
		expect(service.getPropertyNames()).toEqual(['role']);

		vi.advanceTimersByTime(1);
		expect(service.getPropertyNames()).toEqual(['role', 'status']);
		expect(service.getPropertyValues('status')).toEqual(['active']);
	});

	it('removes stale property names and values when changed replaces frontmatter', () => {
		const { app, cacheByPath, file, metadataEvents } = makeHarness();
		cacheByPath[file.path] = {
			frontmatter: { role: 'engineer', status: 'active' },
		};
		const service = new PropertyIndexService(app);
		service.onload();
		metadataEvents.trigger('resolved');

		cacheByPath[file.path] = { frontmatter: { role: 'architect' } };
		metadataEvents.trigger('changed', file);
		vi.advanceTimersByTime(50);

		expect(service.getPropertyNames()).toEqual(['role']);
		expect(service.getPropertyValues('role')).toEqual(['architect']);
		expect(service.getPropertyValues('status')).toEqual([]);
	});

	it('keeps a value when another file still contributes it', () => {
		const { app, cacheByPath, file, files, metadataEvents } = makeHarness();
		const secondFile = makeFile('People/Grace.md');
		files.push(secondFile);
		cacheByPath[file.path] = { frontmatter: { role: 'engineer' } };
		cacheByPath[secondFile.path] = { frontmatter: { role: 'engineer' } };
		const service = new PropertyIndexService(app);
		service.onload();
		metadataEvents.trigger('resolved');

		cacheByPath[file.path] = { frontmatter: { role: 'architect' } };
		metadataEvents.trigger('changed', file);
		vi.advanceTimersByTime(50);

		expect(service.getPropertyValues('role')).toEqual([
			'architect',
			'engineer',
		]);
	});

	it('removes only contributions exclusive to a deleted file', () => {
		const { app, cacheByPath, file, files, metadataEvents, vaultEvents } =
			makeHarness();
		const secondFile = makeFile('People/Grace.md');
		files.push(secondFile);
		cacheByPath[file.path] = {
			frontmatter: { role: 'engineer', status: 'active' },
		};
		cacheByPath[secondFile.path] = {
			frontmatter: { role: 'engineer', team: 'compiler' },
		};
		const service = new PropertyIndexService(app);
		service.onload();
		metadataEvents.trigger('resolved');

		files.splice(files.indexOf(file), 1);
		vaultEvents.trigger('delete', file);

		expect(service.fileCount).toBe(1);
		expect(service.getPropertyNames()).toEqual(['role', 'team']);
		expect(service.getPropertyValues('role')).toEqual(['engineer']);
		expect(service.getPropertyValues('status')).toEqual([]);
		expect(service.getPropertyValues('team')).toEqual(['compiler']);
	});

	it('moves contributions to a renamed path without duplicating the later changed update', () => {
		const { app, cacheByPath, file, metadataEvents, vaultEvents } =
			makeHarness();
		const oldPath = file.path;
		cacheByPath[oldPath] = {
			frontmatter: { role: 'engineer', status: 'active' },
		};
		const service = new PropertyIndexService(app);
		const rebuild = vi.spyOn(service, 'rebuild');
		service.onload();
		metadataEvents.trigger('resolved');
		rebuild.mockClear();

		file.path = 'People/Ada Lovelace.md';
		cacheByPath[file.path] = { frontmatter: { role: 'architect' } };
		delete cacheByPath[oldPath];
		vaultEvents.trigger('rename', file, oldPath);

		expect(service.fileCount).toBe(1);
		expect(service.getPropertyNames()).toEqual(['role']);
		expect(service.getPropertyValues('role')).toEqual(['architect']);

		metadataEvents.trigger('changed', file);
		vi.advanceTimersByTime(50);
		cacheByPath[file.path] = { frontmatter: { role: 'designer' } };
		metadataEvents.trigger('changed', file);
		vi.advanceTimersByTime(50);

		expect(service.fileCount).toBe(1);
		expect(service.getPropertyNames()).toEqual(['role']);
		expect(service.getPropertyValues('role')).toEqual(['designer']);
		expect(service.getPropertyValues('status')).toEqual([]);
		expect(rebuild).not.toHaveBeenCalled();
	});
});
