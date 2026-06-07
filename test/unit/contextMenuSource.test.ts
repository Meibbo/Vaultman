import { describe, expect, it } from 'vitest';

import contextMenuSource from '../../src/services/serviceContextMenu.ts?raw';

describe('ContextMenuService source guards', () => {
	it('registers a panel action to clear active filters from node context menus', () => {
		expect(contextMenuSource).toContain("id: 'filters.clear-selection'");
		expect(contextMenuSource).toContain(
			"label: translate('context_menu.clean_selection')",
		);
		expect(contextMenuSource).toContain(
			'this.plugin.filterService?.clearFilters()',
		);
		expect(contextMenuSource).toContain(
			"nodeTypes: ['file', 'folder', 'tag', 'prop', 'value']",
		);
	});
});
