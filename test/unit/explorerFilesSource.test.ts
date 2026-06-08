import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

describe('FilesExplorerPanel source guards', () => {
	it('destroys the file table view before remounting another view', () => {
		expect(explorerFilesSource).toContain('this.gridView?.destroy()');
		expect(explorerFilesSource).toContain('this.gridView = null');
		expect(explorerFilesSource).toContain('this.treeView?.destroy()');
	});

	it('listens to queue changes so file operation badges update live', () => {
		expect(explorerFilesSource).toContain(
			"this.plugin.queueService.on('changed', this._handleQueueChange)",
		);
		expect(explorerFilesSource).toContain(
			"this.plugin.queueService.off('changed', this._handleQueueChange)",
		);
	});

	it('routes folder destructive actions through the operation queue', () => {
		expect(explorerFilesSource).toContain("id: 'folder.rename'");
		expect(explorerFilesSource).toContain('this._queueFolderMove');
		expect(explorerFilesSource).toContain('this._queueFolderDelete');
	});
});
