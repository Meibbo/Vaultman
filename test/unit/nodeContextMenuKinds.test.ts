import { describe, expect, it } from 'vitest';

import {
	PANEL_MENU_KINDS,
	panelMenuKindForNodeType,
} from '../../src/logic/logicFilesContextMenu';
import contextMenuSource from '../../src/services/serviceContextMenu.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('BT5-036 per-kind node context menus', () => {
	it('maps each node type to its own menu kind', () => {
		expect(panelMenuKindForNodeType('file')).toBe('files');
		expect(panelMenuKindForNodeType('folder')).toBe('files');
		expect(panelMenuKindForNodeType('prop')).toBe('props');
		expect(panelMenuKindForNodeType('value')).toBe('props');
		expect(panelMenuKindForNodeType('tag')).toBe('tags');
		expect(panelMenuKindForNodeType('snippet')).toBe('snippets');
		expect(panelMenuKindForNodeType('plugin')).toBe('plugins');
		expect(panelMenuKindForNodeType('content')).toBe('content');
		expect(PANEL_MENU_KINDS).toContain('props');
		expect(PANEL_MENU_KINDS).toContain('tags');
	});

	it('routes each menu through its own kind layout, not the Files one', () => {
		// Regression: openPanelMenu projected every node type through the Files
		// layout, so props/tags actions (not in the Files catalog) were dropped.
		expect(contextMenuSource).toContain('panelMenuKindForNodeType(ctx.nodeType)');
		expect(contextMenuSource).toContain('projectFilesMenu(this.menuLayoutFor(kind)');
		// The catalog is filtered by the node types that feed the kind.
		expect(contextMenuSource).toContain('_nodeTypesForKind(kind)');
		// Native probing stays Files-only.
		expect(contextMenuSource).toContain("kind === 'files' ? this._probeNativePanelEntries() : []");
	});

	it('keeps the props and tags actions the regression had hidden', () => {
		// These still register — the fix restores them by routing, not re-adding.
		expect(propsSource).toContain("id: 'prop.rename'");
		expect(propsSource).toContain("id: 'prop.delete'");
		expect(propsSource).toContain("submenu: 'Change type'");
		expect(tagsSource).toContain("id: 'tag.rename'");
		expect(tagsSource).toContain("id: 'tag.delete'");
	});
});
