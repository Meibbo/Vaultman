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

const node = (id: string, children?: TreeNode<null>[]): TreeNode<null> => ({
	id,
	label: id,
	depth: 0,
	meta: null,
	...(children ? { children } : {}),
});

describe('spec 08 §3.3 — the selection as membership URNs', () => {
	it('walks the projected tree in order, skips headers and strips row suffixes', () => {
		const tree = [
			node(`${PRESET_GROUP_PREFIX}A`, [node('a1'), node('a2@x')]),
			node(NO_GROUP_ID, [node('b1')]),
		];
		const urns = collectSelectedMembershipUrns(
			tree,
			new Set(['a2', 'b1', `${PRESET_GROUP_PREFIX}A`]),
			(n) => `urn:${n.id.split('@')[0]}`,
		);
		expect(urns).toEqual(['urn:a2', 'urn:b1']);
	});

	it('emits one URN per entity even when a node occurs in two groups', () => {
		const tree = [node('g1', [node('n@g1')]), node('g2', [node('n@g2')])];
		const urns = collectSelectedMembershipUrns(
			tree,
			new Set(['n']),
			(n) => `urn:${n.id.split('@')[0]}`,
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
		expect(registerAction).toHaveBeenCalledTimes(1);
		return registerAction.mock.calls[0]?.[0] as ActionDef;
	}

	it('is offered to every explorer node kind on the panel surface', () => {
		const action = registered();
		expect(action.id).toBe('group.create-with-selected');
		expect([...action.nodeTypes].sort()).toEqual(
			['file', 'folder', 'plugin', 'prop', 'snippet', 'tag', 'value'].sort(),
		);
		expect(action.surfaces).toEqual(['panel']);
	});

	it('only appears when the explorer attached the creator, and dispatches to it', () => {
		const action = registered();
		const base: MenuCtx = { nodeType: 'file', node: node('f'), surface: 'panel' };
		expect(action.when?.(base)).toBe(false);
		const create = vi.fn();
		const ctx: MenuCtx = { ...base, createGroupWithSelected: create };
		expect(action.when?.(ctx)).toBe(true);
		void action.run(ctx);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it('the explorer attaches it only in select mode with a selection and a listener', () => {
		type Harness = {
			interactionMode: 'open' | 'select';
			selectedNodeIds: Set<string>;
			nodes: TreeNode<SnippetMeta>[];
			_groupIds: Set<string>;
			_lastProjectedTree: TreeNode<SnippetMeta>[];
			setCreateGroupHandler: (h?: (urns: readonly string[]) => void) => void;
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

		const handler = vi.fn();
		panel.setCreateGroupHandler(handler);
		panel.interactionMode = 'open';
		expect(panel._groupCreationMenuCtx()).toEqual({});
		panel.interactionMode = 'select';
		panel.selectedNodeIds = new Set();
		expect(panel._groupCreationMenuCtx()).toEqual({});

		panel.selectedNodeIds = new Set(['snippet:beta']);
		panel._groupCreationMenuCtx().createGroupWithSelected?.();
		expect(handler).toHaveBeenCalledWith(['snippets:snippet:beta|beta']);
	});
});
