import { describe, expect, it, vi } from 'vitest';
import {
	collectSelectedMembershipUrns,
	NO_GROUP_ID,
	PRESET_GROUP_PREFIX,
} from '../../src/logic/logicTreeGroupProjection';
import { registerGroupActions } from '../../src/logic/logicGroupContextMenu';
import { SnippetsExplorerPanel } from '../../src/components/containers/explorerSnippets';
import type { ActionDef, MenuCtx } from '../../src/types/typeCMenu';
import type { SnippetMeta, TreeNode } from '../../src/types/typeTree';

const node = (
	id: string,
	children?: TreeNode<null>[],
	entityId?: string,
): TreeNode<null> => ({
	id,
	label: id,
	depth: 0,
	meta: null,
	...(children ? { children } : {}),
	...(entityId ? { entityId } : {}),
});

describe('spec 08 §3.3 — the selection as membership URNs', () => {
	it('walks the projected tree in order, skips headers and strips row suffixes', () => {
		const tree = [
			node(`${PRESET_GROUP_PREFIX}A`, [node('a1'), node('a2@x', undefined, 'a2')]),
			node(NO_GROUP_ID, [node('b1')]),
		];
		const urns = collectSelectedMembershipUrns(
			tree,
			new Set(['a2', 'b1', `${PRESET_GROUP_PREFIX}A`]),
			(n) => `urn:${n.entityId ?? n.id}`,
		);
		expect(urns).toEqual(['urn:a2', 'urn:b1']);
	});

	it('emits one URN per entity even when a node occurs in two groups', () => {
		const tree = [
			node('g1', [node('n@g1', undefined, 'n')]),
			node('g2', [node('n@g2', undefined, 'n')]),
		];
		const urns = collectSelectedMembershipUrns(
			tree,
			new Set(['n']),
			(n) => `urn:${n.entityId ?? n.id}`,
			new Set(['g1', 'g2']),
		);
		expect(urns).toEqual(['urn:n']);
	});
});

describe('spec 08 §3.3 — `Create group with selected` on the cmenu', () => {
	function registered(): ActionDef {
		const registerAction = vi.fn();
		registerGroupActions({
			contextMenuService: { registerAction },
		} as never);
		const actions = registerAction.mock.calls.map(
			([action]) => action as ActionDef,
		);
		const action = actions.find((entry) => entry.id === 'vaultman.group.selected');
		expect(action).toBeDefined();
		expect(actions.map((entry) => entry.id)).toEqual(
				expect.arrayContaining([
				'group.materialize-preset',
				'group.toggle-expand',
				'group.copy-id',
				'group.icon',
				'group.hide-toggle',
				'group.delete',
			]),
		);
		if (!action) throw new Error('vaultman.group.selected action was not registered');
		return action;
	}

	it('is offered to every explorer node kind on the panel surface', () => {
		const action = registered();
		expect(action.id).toBe('vaultman.group.selected');
		expect([...action.nodeTypes].sort()).toEqual(
			['file', 'folder', 'plugin', 'prop', 'snippet', 'tag', 'value'].sort(),
		);
		expect(action.surfaces).toEqual(['panel']);
	});

	it('materializes only preset headers and awaits the scene handler', async () => {
		const registerAction = vi.fn();
		registerGroupActions({
			contextMenuService: { registerAction },
		} as never);
		const action = registerAction.mock.calls
			.map(([entry]) => entry as ActionDef)
			.find((entry) => entry.id === 'group.materialize-preset');
		if (!action) throw new Error('materialize action was not registered');
		const materialize = vi.fn(async () => ({
			status: 'committed' as const,
			groupId: 'A',
			affectedUrns: ['urn:a'],
		}));
		const preset: MenuCtx = {
			nodeType: 'group',
			node: node('preset:A'),
			surface: 'panel',
			groupOwner: 'preset',
			materializePreset: materialize,
		};
		expect(action.when?.(preset)).toBe(true);
		await action.run(preset);
		expect(materialize).toHaveBeenCalledTimes(1);
		expect(action.when?.({ ...preset, groupOwner: 'custom' })).toBe(false);
	});

	it('dispatches header hide for presets and custom groups, but deletes custom only', async () => {
		const registerAction = vi.fn();
		registerGroupActions({ contextMenuService: { registerAction } } as never);
		const actions = registerAction.mock.calls.map(([entry]) => entry as ActionDef);
		const hide = actions.find((entry) => entry.id === 'group.hide-toggle');
		const remove = actions.find((entry) => entry.id === 'group.delete');
		const icon = actions.find((entry) => entry.id === 'group.icon');
		if (!hide || !remove || !icon) throw new Error('group actions were not registered');

		const hidden = vi.fn();
		const preset: MenuCtx = {
			nodeType: 'group', node: node('preset:A'), surface: 'panel',
			groupId: 'vaultman.group.preset:A', groupOwner: 'preset',
			groupHidden: false, hideGroup: hidden,
		};
		expect(hide.disabledReason?.(preset)).toBeNull();
		void hide.run(preset);
		expect(hidden).toHaveBeenCalledWith('vaultman.group.preset:A', true);
		expect(remove.disabledReason?.(preset)).toBe('Preset groups cannot be deleted');
		expect(icon.disabledReason?.(preset)).toBe('Group icons are not configurable yet');

		const deleted = vi.fn();
		const custom: MenuCtx = {
			...preset, groupId: 'Work', groupOwner: 'custom', deleteGroup: deleted,
		};
		expect(remove.disabledReason?.(custom)).toBeNull();
		void remove.run(custom);
		expect(deleted).toHaveBeenCalledWith('Work');
	});

	it('only appears when the explorer attached the creator, and dispatches to it', () => {
		const action = registered();
		const base: MenuCtx = { nodeType: 'file', node: node('f'), surface: 'panel' };
		expect(action.when?.(base)).toBe(false);
		const create = vi.fn(async () => ({ status: 'cancelled' as const }));
		const ctx: MenuCtx = { ...base, createGroupWithSelected: create };
		expect(action.when?.(ctx)).toBe(true);
		void action.run(ctx);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it('the explorer attaches it whenever a selection and listener exist, independent of mode', () => {
		type Harness = {
			interactionMode: 'open' | 'select';
			selectedNodeIds: Set<string>;
			nodes: TreeNode<SnippetMeta>[];
			_groupIds: Set<string>;
			_lastProjectedTree: TreeNode<SnippetMeta>[];
			setCreateGroupHandler: (h?: (snapshot: unknown) => Promise<unknown>) => void;
			_groupCreationMenuCtx: () => Pick<MenuCtx, 'createGroupWithSelected'>;
		};
		const panel = Object.create(SnippetsExplorerPanel.prototype) as Harness;
		// Field initialisers never ran (no constructor): give the projected
		// tree its empty default so the A07b-2 fallback to `nodes` applies.
		(panel as unknown as { _lastProjectedTree: unknown[] })._lastProjectedTree = [];
		panel._groupIds = new Set();
		// A07b-2 walks the last projected tree; the prototype harness never
		// rendered, so it starts empty and the walk falls back to `nodes`.
		panel._lastProjectedTree = [];
		panel.nodes = [
			{ id: 'snippet:alpha', label: 'alpha', depth: 0, meta: { name: 'alpha', enabled: true } },
			{ id: 'snippet:beta', label: 'beta', depth: 0, meta: { name: 'beta', enabled: true } },
		];
		panel.interactionMode = 'select';
		panel.selectedNodeIds = new Set(['snippet:beta']);
		expect(panel._groupCreationMenuCtx()).toEqual({});

		const handler = vi.fn(async () => ({ status: 'cancelled' as const }));
		panel.setCreateGroupHandler(handler);
		panel.interactionMode = 'open';
		expect(panel._groupCreationMenuCtx()).toHaveProperty('createGroupWithSelected');
		panel.interactionMode = 'select';
		panel.selectedNodeIds = new Set();
		expect(panel._groupCreationMenuCtx()).toEqual({});

		panel.selectedNodeIds = new Set(['snippet:beta']);
		void panel._groupCreationMenuCtx().createGroupWithSelected?.();
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				entityIds: ['snippet:beta'],
				urns: ['snippets:snippet:beta|beta'],
			}),
		);
	});
});
