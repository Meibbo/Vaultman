import { describe, expect, it } from 'vitest';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import source from '../../src/components/pages/tabFiles.svelte?raw';

describe('Files panelWidget provider initialization', () => {
	it('constructs the provider without publishing a competing initial render', () => {
		expect(source).toContain('fileList.load()');
		expect(source).not.toContain('fileList.render(');
		expect(source).not.toContain('fileList?.render(');
		expect(frameSource).toContain(
			'const initialFilesRenderFrame = window.requestAnimationFrame(refreshFiles)',
		);
		expect(frameSource).toContain(
			'window.cancelAnimationFrame(initialFilesRenderFrame)',
		);
	});
});
