import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import serviceIconsSource from '../../src/services/serviceIcons.ts?raw';

describe('BT5-031 Files repaints on live icon changes', () => {
	it('subscribes Files to the same change event as every other explorer', () => {
		// The regression: Files listened only to onLoaded, which fires once.
		expect(explorerFilesSource).toContain(
			'iconic.onChanged(this._scheduleIconicRender)',
		);
		for (const source of [
			explorerPropsSource,
			explorerTagsSource,
			explorerPluginsSource,
			explorerSnippetsSource,
		]) {
			expect(source).toContain('onChanged(');
		}
	});

	it('keeps the first-load subscription without duplicating the initial render', () => {
		expect(explorerFilesSource).toContain(
			'iconic.onLoaded(this._scheduleIconicRender)',
		);
		// Both subscriptions share one coalescer, so a burst is a single render.
		expect(explorerFilesSource).toContain('private _iconicRenderQueued = false');
		expect(explorerFilesSource).toContain(
			'if (this._iconicRenderQueued) return;',
		);
	});

	it('releases both subscriptions on unload and adds no timer', () => {
		const block =
			explorerFilesSource.slice(
				explorerFilesSource.indexOf('const iconic = this.plugin.iconicService;'),
				explorerFilesSource.indexOf('this.containerEl.addEventListener('),
			) || '';
		// `register` is what disposes the returned unsubscribe on unload.
		expect(block.match(/this\.register\(/g) ?? []).toHaveLength(2);
		// The coalescer rides a microtask, not a new interval.
		expect(explorerFilesSource).toContain('queueMicrotask(');
	});

	it('covers the change sources the adapter emits', () => {
		// Vaultman's own override write and an external data.json edit both
		// route through notifyChanged, and a disabled adapter emits nothing.
		expect(serviceIconsSource).toContain('private notifyChanged()');
		expect(serviceIconsSource).toContain('onChanged(cb: () => void)');
		expect(explorerFilesSource).toContain('const iconic = this.plugin.iconicService;');
		// Iconic absent/disabled: the whole subscription block is guarded.
		expect(explorerFilesSource).toContain('if (iconic) {');
	});
});

describe('U121-010 Files repaints on live glyph setting changes', () => {
	it('subscribes through the panel lifecycle and ignores unrelated settings', () => {
		expect(explorerFilesSource).toContain(
			'this.plugin.onSettingsChange(this._handleGlyphSettingsChange)',
		);
		expect(explorerFilesSource).toContain(
			'if (next === this._glyphSettingsSignature) return;',
		);
		expect(explorerFilesSource).toContain('this._scheduleIconicRender();');
	});
});
