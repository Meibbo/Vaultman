import { describe, expect, it } from 'vitest';
import pluginsPanelSource from '../../src/components/containers/explorerPlugins.ts?raw';
import snippetsPanelSource from '../../src/components/containers/explorerSnippets.ts?raw';

describe('u200-polish L4: Addon explorer Enter toggles visible cell_toggle', () => {
	it('checks _visibleRowToggle before activating in explorerPlugins', () => {
		expect(pluginsPanelSource).toContain('private _visibleRowToggle(');
		expect(pluginsPanelSource).toContain('const toggle = node ? this._visibleRowToggle(node) : undefined;');
		expect(pluginsPanelSource).toContain('this.dataSource.cell(entityIdOf(node), toggle.id);');
		expect(pluginsPanelSource).toContain('if (settingNode && this._visibleRowToggle(settingNode))');
		expect(pluginsPanelSource).toContain('void this.toggle(settingNode.meta);');
		expect(pluginsPanelSource).toContain('this._activateSettingSceneRow(id);');
	});

	it('checks _visibleRowToggle before activating in explorerSnippets', () => {
		expect(snippetsPanelSource).toContain('private _visibleRowToggle(');
		expect(snippetsPanelSource).toContain('if (node && this._visibleRowToggle(node))');
		expect(snippetsPanelSource).toContain('void this.toggle(node.meta);');
	});

	it('checks cell.id === "state" && cell.kind === "toggle" with scopeCellToggles override', () => {
		for (const source of [pluginsPanelSource, snippetsPanelSource]) {
			expect(source).toContain("cell.id === 'state' && cell.kind === 'toggle'");
			expect(source).toContain('node.scopeCellToggles?.[toggle.id]');
			expect(source).toContain("this.visibleCells.has(toggle.id)");
		}
	});
});
