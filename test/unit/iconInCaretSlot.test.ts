import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

describe('BT5-015 icon in the caret slot', () => {
	it('registers the presentation option off by default', () => {
		expect(DEFAULT_SETTINGS.iconInCaretSlot).toBe(false);
		expect(settingsSource).toContain('settings.icon_in_caret_slot');
		for (const source of [enSource, esSource]) {
			expect(source).toContain("'settings.icon_in_caret_slot':");
			expect(source).toContain("'settings.icon_in_caret_slot.desc':");
		}
	});

	it('only fills a caret slot that no expansion needs', () => {
		// The slot exists only when showCaret is on; an expandable node keeps
		// its caret, so the condition must require both.
		expect(viewTreeSource).toContain(
			'opts.iconInCaretSlot === true &&\n\t\t\tshowCaret &&\n\t\t\t!hasChildren',
		);
		expect(viewTreeSource).toContain("setIcon(toggleEl, 'right-triangle')");
	});

	it('keeps the decorative icon out of the expansion affordance', () => {
		// applyMutableRowState marks a childless toggle aria-hidden, and the
		// empty modifier removes it from the hit target entirely.
		expect(viewTreeSource).toContain(
			"toggleEl.setAttribute('aria-hidden', 'true')",
		);
		expect(viewTreeSource).toContain("'vaultman-tree-toggle--empty'");
		expect(viewTreeSource).toContain("'vaultman-tree-toggle--icon'");
		// No expansion listener may be attached on the icon-bearing slot.
		expect(viewTreeSource).toContain('if (hasChildren) {');
	});

	it('never emits the icon twice when the slot carries it', () => {
		expect(viewTreeSource).toContain(
			'if (!node.icon || !showIcon || iconFillsCaretSlot) return;',
		);
		expect(viewTreeSource).toContain(
			'!usesActivationOrder && node.icon && showIcon && !iconFillsCaretSlot',
		);
	});

	it('re-renders rows when the option is toggled at runtime', () => {
		// The signature drives row reuse: without the flag a live toggle would
		// leave recycled rows on the old markup.
		expect(viewTreeSource).toContain("opts.iconInCaretSlot ? '1' : '0'");
	});

	it('reaches every tree surface and is declared N/A for table and cards', () => {
		for (const source of [
			explorerFilesSource,
			explorerSnippetsSource,
			explorerPluginsSource,
		]) {
			expect(source).toContain(
				'iconInCaretSlot: this.plugin.settings.iconInCaretSlot === true',
			);
		}
		// Props and Tags narrow the plugin context, so their settings are optional.
		for (const source of [explorerPropsSource, explorerTagsSource]) {
			expect(source).toContain(
				'iconInCaretSlot: this.plugin.settings?.iconInCaretSlot === true',
			);
		}
		// Table and cards render no caret, so they have nothing to reclaim.
		expect(viewTreeSource).toContain('BT5-015');
	});
});
