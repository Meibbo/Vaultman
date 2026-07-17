import { describe, expect, it } from 'vitest';

import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import filesTableSource from '../../src/components/layout/viewGrid.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';

describe('Files Iconic integration source guards', () => {
	it('resolves Iconic icons in every Files renderer', () => {
		expect(filesExplorerSource).toContain(
			'this._decorateTreeWithIcons(renderTree)',
		);
		expect(filesExplorerSource).toContain('getFileIcon:');
		expect(filesGridSource).toContain('this.callbacks.getFileIcon');
		expect(filesTableSource).toContain('this.callbacks.getFileIcon');
		expect(treeSource).toContain('renderIconValue(iconSpan');
	});

	it('exposes a persistent node-kind scope without inheriting the core container', () => {
		expect(settingsSource).toContain("addOption('folders'");
		expect(settingsSource).toContain("addOption('custom'");
		expect(filesExplorerSource).not.toContain('nav-files-container');
		expect(filesExplorerSource).toContain('normalizeFilesIconScope');
	});
});
