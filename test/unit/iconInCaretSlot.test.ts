import { readFileSync } from 'node:fs';
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

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('BT5-015 icon reclaims the caret slot so labels align', () => {
	it('registers the presentation option off by default', () => {
		expect(DEFAULT_SETTINGS.iconInCaretSlot).toBe(false);
		expect(settingsSource).toContain('settings.icon_in_caret_slot');
		for (const source of [enSource, esSource]) {
			expect(source).toContain("'settings.icon_in_caret_slot':");
			expect(source).toContain("'settings.icon_in_caret_slot.desc':");
		}
	});

	it('applies only to a row that renders an icon and no caret', () => {
		// The misalignment is between siblings of the same kind: with custom
		// icons only, the ones that have an icon push their label right. A row
		// that renders no icon must keep today's geometry exactly.
		expect(viewTreeSource).toContain(
			'opts.iconInCaretSlot === true &&\n\t\t\tshowIcon &&\n\t\t\tBoolean(node.icon) &&\n\t\t\t!showCaret',
		);
	});

	it('takes the icon out of flow instead of moving it in the DOM', () => {
		// A flex child adds width; that is precisely what shifted the label.
		expect(viewTreeSource).toContain("'vaultman-tree-row--icon-in-caret'");
		expect(stylesSource).toContain('.vaultman-tree-row--icon-in-caret');
		expect(stylesSource).toContain('position: absolute');
		// The old approach injected the icon into the caret element; gone.
		expect(viewTreeSource).not.toContain("'vaultman-tree-toggle--icon'");
		expect(stylesSource).not.toContain('vaultman-tree-toggle--icon');
	});

	it('leaves the caret and its affordance untouched', () => {
		expect(viewTreeSource).toContain("setIcon(toggleEl, 'right-triangle')");
		expect(viewTreeSource).toContain(
			"toggleEl.setAttribute('aria-hidden', 'true')",
		);
		expect(viewTreeSource).toContain("'vaultman-tree-toggle--empty'");
	});

	it('still emits the icon exactly once', () => {
		const emitters = viewTreeSource.match(/cls: 'vaultman-tree-icon'/g) ?? [];
		expect(emitters).toHaveLength(2); // activation path + classic path
		expect(viewTreeSource).not.toContain('iconFillsCaretSlot &&');
	});

	it('re-renders rows when the option is toggled at runtime', () => {
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
		for (const source of [explorerPropsSource, explorerTagsSource]) {
			expect(source).toContain(
				'iconInCaretSlot: this.plugin.settings?.iconInCaretSlot === true',
			);
		}
		expect(viewTreeSource).toContain('BT5-015');
	});
});
