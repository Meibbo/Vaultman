import { describe, expect, it } from 'vitest';

import pageSource from '../../src/components/pages/pageFilters.svelte?raw';
import tabSource from '../../src/components/pages/tabContent.svelte?raw';
import {
	activeContentFilePath,
	observeActiveContentFile,
} from '../../src/logic/logicContentActiveFile';

describe('BT5-028 Content active-file highlight', () => {
	it('projects file-open payloads to a stable path or null', () => {
		expect(activeContentFilePath({ path: 'Road/Start.md' })).toBe(
			'Road/Start.md',
		);
		expect(activeContentFilePath(null)).toBeNull();
		expect(activeContentFilePath(undefined)).toBeNull();
	});

	it('tracks open, rename, delete and cleanup without redundant renders', () => {
		let currentFile: { path: string } | null = { path: 'Road/Start.md' };
		let fileOpen: ((file: { path: string } | null) => void) | undefined;
		let rename: ((file: { path: string }, oldPath: string) => void) | undefined;
		let remove: ((file: { path: string }) => void) | undefined;
		const observed: Array<string | null> = [];

		const stop = observeActiveContentFile(
			{
				current: () => currentFile,
				onFileOpen: (listener) => {
					fileOpen = listener;
					return () => {
						fileOpen = undefined;
					};
				},
				onRename: (listener) => {
					rename = listener;
					return () => {
						rename = undefined;
					};
				},
				onDelete: (listener) => {
					remove = listener;
					return () => {
						remove = undefined;
					};
				},
			},
			(path) => observed.push(path),
		);

		expect(observed).toEqual(['Road/Start.md']);
		currentFile = { path: 'Road/Next.md' };
		fileOpen?.(currentFile);
		rename?.({ path: 'Road/Renamed.md' }, 'Road/Next.md');
		remove?.({ path: 'Road/Renamed.md' });
		fileOpen?.(null);
		expect(observed).toEqual([
			'Road/Start.md',
			'Road/Next.md',
			'Road/Renamed.md',
			null,
		]);

		stop();
		expect(fileOpen).toBeUndefined();
		expect(rename).toBeUndefined();
		expect(remove).toBeUndefined();
	});

	it('tracks workspace and vault lifecycle events with symmetric cleanup', () => {
		expect(pageSource).toContain('return observeActiveContentFile(');
		expect(pageSource).toContain("workspace.on('file-open'");
		expect(pageSource).toContain("vault.on('rename'");
		expect(pageSource).toContain("vault.on('delete'");
		expect(pageSource).toContain('return () => workspace.offref(ref)');
		expect(pageSource).toContain('return () => vault.offref(ref)');
		expect(pageSource).toContain('{activeContentFilePath}');
	});

	it('separates passive highlight state from explicit reveal/scroll state', () => {
		expect(tabSource).toContain('activeContentFilePath: string | null;');
		expect(tabSource).toContain(
			'class:is-active={activeContentFilePath === fileResult.file.path}',
		);
		expect(tabSource).toContain('const path = activeContentRevealPath;');
		expect(tabSource).not.toContain(
			'class:is-active={activeContentRevealPath === fileResult.file.path}',
		);
	});
});
