import { describe, expect, it } from 'vitest';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import explorerSource from '../../src/components/containers/explorerFiles.ts?raw';
import source from '../../src/components/pages/tabFiles.svelte?raw';

describe('Files panelWidget provider initialization', () => {
	it('constructs the provider once and publishes its first projection before paint', () => {
		expect(source).toContain('fileList.load()');
		expect(source).not.toContain('fileList.render(');
		expect(source).not.toContain('fileList?.render(');
		expect(frameSource).toContain('void tick()\n\t\t\t.then(() => tick())');
		expect(frameSource).toContain('if (!initialFilesRenderCancelled) refreshFiles();');
		expect(frameSource).toContain('initialFilesRenderCancelled = true;');
		expect(frameSource).not.toContain('requestAnimationFrame(refreshFiles)');
		const onload = explorerSource.slice(
			explorerSource.indexOf('onload(): void {'),
			explorerSource.indexOf('/**\n\t * BT5-009:'),
		);
		expect(onload).not.toBe('');
		expect(onload).not.toContain('this._render();');
		expect(explorerSource).toContain('private hasSourceProjection = false;');
		expect(explorerSource).toContain('this.hasSourceProjection = true;');
		expect(explorerSource).toContain('if (!this.hasSourceProjection) return;');
	});
});
