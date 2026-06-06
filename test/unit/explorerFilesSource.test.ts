import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

describe('FilesExplorerPanel source guards', () => {
	it('destroys the file table view before remounting another view', () => {
		expect(explorerFilesSource).toContain('this.gridView?.destroy()');
		expect(explorerFilesSource).toContain('this.gridView = null');
		expect(explorerFilesSource).toContain('this.treeView?.destroy()');
	});
});
