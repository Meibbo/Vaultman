import type { TFile } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import snippetContextMenuSource from '../../src/logic/logicSnippetContextMenu.ts?raw';
import { buildSnippetRenameChange } from '../../src/logic/logicSnippetOperations';
import { OperationQueueService } from '../../src/services/serviceOperationQueue';
import { RENAME_FILE } from '../../src/types/typeOps';

function snippetFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	const extension = dot >= 0 ? name.slice(dot + 1) : '';
	const basename = dot >= 0 ? name.slice(0, dot) : name;
	return {
		basename,
		extension,
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

describe('queued snippet rename operation', () => {
	it('builds an adapter-backed rename with a stable source and target path', () => {
		const file = snippetFile('vault-config/snippets/pepito.css');
		const change = buildSnippetRenameChange(file, 'renamed.css');

		expect(change).toMatchObject({
			type: 'snippet_rename',
			action: 'rename',
			sourcePath: 'vault-config/snippets/pepito.css',
			targetPath: 'vault-config/snippets/renamed.css',
			files: [file],
		});
		expect(change.logicFunc(file, {})).toEqual({
			[RENAME_FILE]: 'renamed.css',
		});
	});

	it('does not rename or reload snippets until the queue executes', async () => {
		const rename = vi.fn().mockResolvedValue(undefined);
		const requestLoadSnippets = vi.fn().mockResolvedValue(undefined);
		const app = {
			vault: { adapter: { rename } },
			customCss: { requestLoadSnippets },
		} as never;
		const service = new OperationQueueService(app);
		const change = buildSnippetRenameChange(
			snippetFile('vault-config/snippets/pepito.css'),
			'renamed.css',
		);

		service.addOrRun(change);
		expect(rename).not.toHaveBeenCalled();
		expect(requestLoadSnippets).not.toHaveBeenCalled();

		await service.execute();
		expect(rename).toHaveBeenCalledOnce();
		expect(rename).toHaveBeenCalledWith(
			'vault-config/snippets/pepito.css',
			'vault-config/snippets/renamed.css',
		);
		expect(requestLoadSnippets).toHaveBeenCalledOnce();
	});

	it('routes the modal result into the queue without extracting or mutating inline', () => {
		expect(snippetContextMenuSource).toContain('buildSnippetRenameChange');
		expect(snippetContextMenuSource).toContain('queueService.addOrRun');
		expect(snippetContextMenuSource).not.toContain("updates['_RENAME_FILE']");
		expect(snippetContextMenuSource).not.toContain('app.vault.adapter.rename');
	});
});
