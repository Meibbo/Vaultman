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
		expect(frameSource).toContain(
			'if (!initialFilesRenderCancelled) refreshFiles();',
		);
		expect(frameSource).toContain('initialFilesRenderCancelled = true;');
		expect(frameSource).not.toContain('requestAnimationFrame(refreshFiles)');
		const onload = explorerSource.slice(
			explorerSource.indexOf('onload(): void {'),
			explorerSource.indexOf('/**\n\t * BT5-009:'),
		);
		expect(onload).not.toBe('');

		// What must not render synchronously is the code onload *executes*. Most
		// of onload is `svc.registerAction({...})` calls whose `run`/`when`
		// callbacks fire on user intent much later, so scanning the whole method
		// for `_render()` reports the Rename action — which is not a load-time
		// paint at all. Scope the ban to the imperative tail: the event wiring
		// and the construction sequence, which do run at load.
		const onloadTail = onload.slice(onload.indexOf('this.registerEvent('));
		expect(onloadTail).not.toBe('');
		expect(onloadTail).not.toContain('this._render();');
		expect(onloadTail).toContain('this._mountView();');

		// The one `_render()` reachable from onload belongs to the Rename
		// action's fallback path, kept explicit so the exception stays deliberate
		// rather than becoming a habit.
		expect(onload).toContain(
			'if (ctx.invokeRename) ctx.invokeRename(ctx.node.id);',
		);
		expect(explorerSource).toContain('private hasSourceProjection = false;');
		expect(explorerSource).toContain('this.hasSourceProjection = true;');
		expect(explorerSource).toContain('if (!this.hasSourceProjection) return;');
	});
});
