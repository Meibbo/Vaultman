import { describe, expect, it } from 'vitest';

import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';

describe('Files grid view source guards', () => {
	it('uses a dedicated files grid renderer instead of the Files table renderer', () => {
		expect(filesGridSource).toContain('export class FilesGridView');
		expect(filesGridSource).toContain('vaultman-files-grid-root');
		expect(filesGridSource).toContain('buildAnchoredGridWindow');
		expect(filesGridSource).toContain('onContextMenu');
		expect(filesGridSource).toContain('onDragStart');
		expect(filesGridSource).toContain('getSelectedFiles');
	});

	it('forwards selection and core open gestures to the panel policy', () => {
		expect(filesGridSource).toContain('this.callbacks.onFileClick(file, event)');
		expect(filesGridSource).toContain('card.onauxclick = (event) =>');
		expect(filesGridSource).toContain('if (event.button !== 1) return;');
	});

	it('keeps Iconic precedence on card icons and glyph color in signatures', () => {
		expect(filesGridSource).toContain(
			'getGlyphColor?: (file: TFile, index: number) => string | null',
		);
		expect(filesGridSource).toContain(
			'this.renderCard(item.row, item.index, {',
		);
		expect(filesGridSource).toContain('glyphColor ??');
		expect(filesGridSource).toContain(
			'resolvedIcon.color ?? glyphColor ?? undefined',
		);
	});
});
