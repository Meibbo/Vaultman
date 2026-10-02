import type { App, CachedMetadata, TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { FilterService } from '../../src/services/serviceFilter';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

function makeApp(markdownFiles: TFile[], allFiles: TFile[]): App {
	return {
		vault: {
			getMarkdownFiles: () => markdownFiles,
			getFiles: () => allFiles,
		},
		metadataCache: {
			getFileCache: (_file: TFile) => ({ frontmatter: {} }) as CachedMetadata,
		},
	} as unknown as App;
}

describe('file/folder filter clean toggle', () => {
	it('toggles folder include -> clean (none)', () => {
		const service = new FilterService(makeApp([], []));
		expect(service.getFilterState('folder', 'Projects')).toBe('none');

		service.setFolderNodePolarity('Projects', 'inclusive');
		expect(service.getFilterState('folder', 'Projects')).toBe('included');

		service.setFolderNodePolarity('Projects', 'none');
		expect(service.getFilterState('folder', 'Projects')).toBe('none');
		expect(service.activeFilter.children).toHaveLength(0);
	});

	it('toggles folder exclude -> clean (none)', () => {
		const service = new FilterService(makeApp([], []));
		service.setFolderNodePolarity('Projects', 'exclusive');
		expect(service.getFilterState('folder', 'Projects')).toBe('excluded');

		service.setFolderNodePolarity('Projects', 'none');
		expect(service.getFilterState('folder', 'Projects')).toBe('none');
		expect(service.activeFilter.children).toHaveLength(0);
	});

	it('replaces folder polarity without duplicating rules', () => {
		const service = new FilterService(makeApp([], []));
		service.setFolderNodePolarity('Projects', 'inclusive');
		service.setFolderNodePolarity('Projects', 'exclusive');
		expect(service.getFilterState('folder', 'Projects')).toBe('excluded');
		expect(service.activeFilter.children).toHaveLength(1);
		expect(service.activeFilter.children[0]).toMatchObject({
			type: 'rule',
			filterType: 'folder_exclude',
		});
	});

	it('toggles file exclude -> clean (none)', () => {
		const service = new FilterService(makeApp([], []));
		expect(service.getFilterState('file', 'notes/a.md')).toBe('none');

		service.setFileNodePolarity('notes/a.md', 'exclusive');
		expect(service.getFilterState('file', 'notes/a.md')).toBe('excluded');

		service.setFileNodePolarity('notes/a.md', 'none');
		expect(service.getFilterState('file', 'notes/a.md')).toBe('none');
		expect(service.activeFilter.children).toHaveLength(0);
	});

	it('does not duplicate file_exclude on repeated exclusive', () => {
		const service = new FilterService(makeApp([], []));
		service.setFileNodePolarity('notes/a.md', 'exclusive');
		service.setFileNodePolarity('notes/a.md', 'exclusive');
		expect(service.getFilterState('file', 'notes/a.md')).toBe('excluded');
		expect(service.activeFilter.children).toHaveLength(1);
		expect(service.activeFilter.children[0]).toMatchObject({
			type: 'rule',
			filterType: 'file_exclude',
			values: ['notes/a.md'],
		});
	});

	it('folder and file states do not leak into each other', () => {
		const service = new FilterService(makeApp([], []));
		service.setFolderNodePolarity('notes', 'inclusive');
		expect(service.getFilterState('file', 'notes')).toBe('none');
		service.setFileNodePolarity('notes/a.md', 'exclusive');
		expect(service.getFilterState('folder', 'notes/a.md')).toBe('none');
		expect(service.getFilterState('folder', 'notes')).toBe('included');
		expect(service.getFilterState('file', 'notes/a.md')).toBe('excluded');
	});
});

describe('explorerFiles context-menu source guards', () => {
	it('offers clean this filter for folder include/exclude and file exclude', () => {
		expect(explorerFilesSource).toContain("translate('explorer.ctx.filter_clean')");
		expect(explorerFilesSource).toContain("getFilterState('folder'");
		expect(explorerFilesSource).toContain("getFilterState('file'");
		expect(explorerFilesSource).toContain('setFolderNodePolarity');
		expect(explorerFilesSource).toContain('setFileNodePolarity');
		expect(explorerFilesSource).toContain("? 'none' : 'inclusive'");
		expect(explorerFilesSource).toContain("? 'none' : 'exclusive'");
		expect(explorerFilesSource).toContain("=== 'included'");
		expect(explorerFilesSource).toContain("=== 'excluded'");
		expect(explorerFilesSource).toContain("'folder.ctx.filter_include'");
		expect(explorerFilesSource).toContain("'folder.ctx.filter_exclude'");
		expect(explorerFilesSource).toContain("'file.ctx.exclude'");
	});
});
