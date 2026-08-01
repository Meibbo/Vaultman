import { describe, expect, it } from 'vitest';

import treeSource from '../../src/components/layout/viewTree.ts?raw';
import tableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import snippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import pluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import settingsSource from '../../src/types/typeSettings.ts?raw';

describe('U121-003 select-mode checkbox cell', () => {
	it('is rendered by the shared tree and table engines at the configured edge', () => {
		for (const source of [treeSource, tableSource]) {
			expect(source).toContain('selectionCheckboxPosition');
			expect(source).toContain('vaultman-selection-checkbox');
			expect(source).toContain('onSelectionToggle');
		}
	});

	it('is wired into Props, Tags, Snippets and Plugins only through select mode', () => {
		for (const source of [propsSource, tagsSource, snippetsSource, pluginsSource]) {
			expect(source).toContain("interactionMode === 'select'");
			expect(source).toContain('selectedNodeIds');
			expect(source).toContain('selectionCheckboxPosition');
		}
	});

	it('persists the left/right checkbox edge with a stable default', () => {
		expect(settingsSource).toContain(
			"selectionCheckboxPosition: 'start' | 'end'",
		);
		expect(settingsSource).toContain("selectionCheckboxPosition: 'start'");
	});
});
