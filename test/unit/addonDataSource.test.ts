import { describe, expect, it } from 'vitest';
import { projectAddonDataNodes } from '../../src/logic/logicAddonDataSource';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';

const rows: TreeNode<PluginMeta>[] = ['Zulu', 'Alpha'].map((name) => ({
	id: `sasi:command:${name}`, label: name, depth: 0,
	meta: { pluginId: name, name, enabled: false, loaded: false, isVaultman: false },
}));
describe('shared addon data source projection', () => {
	it('searches provider rows without invoking native plugin-settings search', () => {
		expect(projectAddonDataNodes(rows, 'alpha', { sortBy: 'name', direction: 'asc' }).map((node) => node.id)).toEqual(['sasi:command:Alpha']);
	});
	it('sorts the original provider identities without mutating the input', () => {
		const projected = projectAddonDataNodes(rows, '', { sortBy: 'name', direction: 'asc' });
		expect(projected.map((node) => node.id)).toEqual(['sasi:command:Alpha', 'sasi:command:Zulu']);
		expect(projected[0]).toBe(rows[1]);
		expect(rows[0]?.label).toBe('Zulu');
	});
});
