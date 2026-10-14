// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { resolveNativeFileHoverTarget } from '../../src/services/serviceNativeSurfaceBinding';
import type { App, TFile } from 'obsidian';

describe('resolveNativeFileHoverTarget', () => {
	const mockFile = { path: 'Notes/Test.md' } as TFile;
	const mockApp = {
		vault: {
			getMarkdownFiles: () => [mockFile],
			getAbstractFileByPath: (path: string) => (path === 'Notes/Test.md' ? mockFile : null),
		},
	} as unknown as App;

	it('resolves file target when hovering over .nav-file-title[data-path]', () => {
		const el = document.createElement('div');
		el.className = 'nav-file-title';
		el.setAttribute('data-path', 'Notes/Test.md');

		const target = resolveNativeFileHoverTarget(el, mockApp);
		expect(target).not.toBeNull();
		expect(target?.path).toBe('Notes/Test.md');
		expect(target?.element).toBe(el);
	});

	it('resolves file target when hovering inside a locked tree row (.vaultman-tree-row[data-path])', () => {
		const row = document.createElement('div');
		row.className = 'vaultman-tree-row';
		row.setAttribute('data-path', 'Notes/Test.md');

		const self = document.createElement('div');
		self.className = 'vaultman-tree-self';
		row.appendChild(self);

		const label = document.createElement('span');
		label.className = 'vaultman-tree-label';
		label.textContent = 'Test';
		self.appendChild(label);

		const target = resolveNativeFileHoverTarget(label, mockApp);
		expect(target).not.toBeNull();
		expect(target?.path).toBe('Notes/Test.md');
		expect(target?.element).toBe(self);
	});

	it('resolves file target when hovering in compat tree row (.vaultman-tree-self inside .vaultman-tree-row[data-path])', () => {
		const row = document.createElement('div');
		row.className = 'vaultman-tree-row';
		row.setAttribute('data-path', 'Notes/Test.md');

		const self = document.createElement('div');
		self.className = 'vaultman-tree-self nav-file-title';
		row.appendChild(self);

		const text = document.createElement('span');
		text.textContent = 'Test';
		self.appendChild(text);

		const target = resolveNativeFileHoverTarget(text, mockApp);
		expect(target).not.toBeNull();
		expect(target?.path).toBe('Notes/Test.md');
		expect(target?.element).toBe(self);
	});

	it('returns null for nonexistent or non-markdown file', () => {
		const row = document.createElement('div');
		row.className = 'vaultman-tree-row';
		row.setAttribute('data-path', 'Other/Unknown.pdf');

		const target = resolveNativeFileHoverTarget(row, mockApp);
		expect(target).toBeNull();
	});
});
