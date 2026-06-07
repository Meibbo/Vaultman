import { describe, expect, it } from 'vitest';

import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';

describe('Files grid view source guards', () => {
	it('uses a dedicated files grid renderer instead of the Files table renderer', () => {
		expect(filesGridSource).toContain('export class FilesGridView');
		expect(filesGridSource).toContain('vaultman-files-grid-root');
		expect(filesGridSource).toContain('buildVirtualGridWindow');
		expect(filesGridSource).toContain('onContextMenu');
		expect(filesGridSource).toContain('onDragStart');
		expect(filesGridSource).toContain('getSelectedFiles');
	});
});
