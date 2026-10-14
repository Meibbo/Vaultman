import { describe, expect, it } from 'vitest';

import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	buildApiSceneNodes,
	findApiSceneNode,
	PUBLISH_CELL_ID,
} from '../../src/logic/logicApiScene';
import { createSasiCommandPublisher } from '../../src/logic/logicSasiCommands';
import {
	TOOLBAR_FOCUS_SEARCH_ID,
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_SEARCHBOX_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
	TOOLBAR_SCENE_MENU_ID,
	TOOLBAR_VIEW_MENU_ID,
	TOOLBAR_SORT_MENU_ID,
} from '../../src/logic/logicSasiToolbarActions';
import {
	FILTER_QUEUE_ACTIONS,
	FILTERS_BASES_INTEROP_ID,
	FILTERS_CLEAR_ALL_ID,
	FILTERS_SHOW_SELECTED_ID,
	FILTERS_TEMPLATES_ID,
	QUEUE_CLEAR_ID,
	QUEUE_DETAILS_ID,
	QUEUE_EXECUTE_ID,
	QUEUE_TEMPLATES_ID,
} from '../../src/logic/logicSasiFilterQueueActions';
import {
	SEARCH_CREATE_TARGET_ID,
	SEARCH_CYCLE_CATEGORY_ID,
} from '../../src/logic/logicSasiSearchActions';

const BINDABLE_TOOLBAR_IDS = [
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
	TOOLBAR_SEARCHBOX_ID,
	TOOLBAR_FOCUS_SEARCH_ID,
	TOOLBAR_SCENE_MENU_ID,
	TOOLBAR_VIEW_MENU_ID,
	TOOLBAR_SORT_MENU_ID,
	FILTERS_CLEAR_ALL_ID,
	FILTERS_SHOW_SELECTED_ID,
	FILTERS_TEMPLATES_ID,
	FILTERS_BASES_INTEROP_ID,
	QUEUE_CLEAR_ID,
	QUEUE_DETAILS_ID,
	QUEUE_TEMPLATES_ID,
	QUEUE_EXECUTE_ID,
	SEARCH_CYCLE_CATEGORY_ID,
	SEARCH_CREATE_TARGET_ID,
] as const;

function publisherFor(ids: readonly string[]) {
	const publisher = createSasiCommandPublisher({
		addCommand: () => undefined,
		removeCommand: () => undefined,
	});
	for (const id of ids) {
		publisher.register({ id, name: id, handler: () => {} });
	}
	return publisher;
}

describe('U130 toolbar actions in SASI', () => {
	it('registers toolbar, filter-island and queue-island actions on usable surfaces', () => {
		const { registry } = createVaultmanSasi();
		for (const id of [
			TOOLBAR_REVEAL_ACTIVE_FILE_ID,
			TOOLBAR_TOGGLE_EXPANSION_ID,
			TOOLBAR_SEARCHBOX_ID,
			TOOLBAR_FOCUS_SEARCH_ID,
			TOOLBAR_SCENE_MENU_ID,
			TOOLBAR_VIEW_MENU_ID,
			TOOLBAR_SORT_MENU_ID,
			...FILTER_QUEUE_ACTIONS.map((action) => action.id),
			SEARCH_CYCLE_CATEGORY_ID,
			SEARCH_CREATE_TARGET_ID,
		]) {
			const resolved = registry.resolve(id);
			expect(resolved.available, id).toBe(true);
			expect(
				resolved.def?.supports.map((support) => support.surface),
			).toContain('panelWidget');
		}
	});

	it('assigns correct scopes to toggle expansion and toolbar menu actions in registry', () => {
		const { registry } = createVaultmanSasi();
		const toggleDef = registry.resolve(TOOLBAR_TOGGLE_EXPANSION_ID).def;
		expect(toggleDef?.scope).toBe('this.scene -> {scope_depth}');

		const sceneMenuDef = registry.resolve(TOOLBAR_SCENE_MENU_ID).def;
		expect(sceneMenuDef?.scope).toBe('this.scene -> this.node');

		const viewMenuDef = registry.resolve(TOOLBAR_VIEW_MENU_ID).def;
		expect(viewMenuDef?.scope).toBe('this.scene -> this.node');

		const sortMenuDef = registry.resolve(TOOLBAR_SORT_MENU_ID).def;
		expect(sortMenuDef?.scope).toBe('this.scene -> this.node');

		for (const action of FILTER_QUEUE_ACTIONS) {
			const def = registry.resolve(action.id).def;
			expect(def?.scope, action.id).toBe(action.scope);
			expect(def?.labelKey, action.id).toBe(action.labelKey);
			expect(def?.supports.map((support) => support.surface), action.id).toContain(
				'panelWidget',
			);
		}
	});

	it('projects bindable toolbar, filter and queue actions as published command rows', () => {
		const { registry } = createVaultmanSasi();
		const publisher = publisherFor(BINDABLE_TOOLBAR_IDS);
		const decisions: Record<string, boolean> = {};
		for (const id of BINDABLE_TOOLBAR_IDS) decisions[id] = true;
		publisher.restorePublished(decisions);

		const nodes = buildApiSceneNodes(registry, publisher);
		for (const id of BINDABLE_TOOLBAR_IDS) {
			const action = findApiSceneNode(
				nodes,
				(node) => node.meta.group === 'action' && node.meta.sasiId === id,
			);
			expect(action, `registered action ${id}`).toBeDefined();
			const command = findApiSceneNode(
				nodes,
				(node) => node.meta.group === 'command' && node.meta.sasiId === id,
			);
			expect(command?.meta.publishable, id).toBe(true);
			expect(command?.meta.published, id).toBe(true);
			expect(command?.cells, id).toContainEqual(
				expect.objectContaining({ id: PUBLISH_CELL_ID, kind: 'toggle' }),
			);
		}
	});

	it('projects correct scopes into compound command scope children and workspace scopes', () => {
		const { registry } = createVaultmanSasi();
		const publisher = publisherFor(BINDABLE_TOOLBAR_IDS);
		const nodes = buildApiSceneNodes(registry, publisher);

		// Toggle expansion scope
		const toggleCmd = findApiSceneNode(
			nodes,
			(node) =>
				node.meta.group === 'command' &&
				node.meta.sasiId === TOOLBAR_TOGGLE_EXPANSION_ID,
		);
		const toggleScopeGroup = toggleCmd?.children?.find((c) =>
			c.id.includes(':group:scope'),
		);
		expect(toggleScopeGroup?.children?.[0]?.meta.sasiId).toBe(
			'this.scene -> {scope_depth}',
		);

		// Menu commands scopes
		for (const menuId of [
			TOOLBAR_SCENE_MENU_ID,
			TOOLBAR_VIEW_MENU_ID,
			TOOLBAR_SORT_MENU_ID,
		]) {
			const menuCmd = findApiSceneNode(
				nodes,
				(node) => node.meta.group === 'command' && node.meta.sasiId === menuId,
			);
			const menuScopeGroup = menuCmd?.children?.find((c) =>
				c.id.includes(':group:scope'),
			);
			expect(menuScopeGroup?.children?.[0]?.meta.sasiId, menuId).toBe(
				'this.scene -> this.node',
			);
		}

		for (const action of FILTER_QUEUE_ACTIONS) {
			const command = findApiSceneNode(
				nodes,
				(node) => node.meta.group === 'command' && node.meta.sasiId === action.id,
			);
			const actionGroup = command?.children?.find((child) =>
				child.id.includes(':group:actions'),
			);
			const scopeGroup = command?.children?.find((child) =>
				child.id.includes(':group:scope'),
			);
			expect(actionGroup?.children?.[0]?.meta.sasiId, action.id).toBe(action.id);
			expect(scopeGroup?.children?.[0]?.meta.sasiId, action.id).toBe(action.scope);
		}

		// Workspace scope list contains the new scopes
		const scopeDepthNode = findApiSceneNode(
			nodes,
			(n) =>
				n.meta.group === 'scope' &&
				n.meta.sasiId === 'this.scene -> {scope_depth}',
		);
		expect(scopeDepthNode).toBeDefined();

		const scopeNodeNode = findApiSceneNode(
			nodes,
			(n) =>
				n.meta.group === 'scope' && n.meta.sasiId === 'this.scene -> this.node',
		);
		expect(scopeNodeNode).toBeDefined();
	});

	it('keeps the action identity separate from its command publication row', () => {
		const { registry } = createVaultmanSasi();
		const publisher = publisherFor([TOOLBAR_FOCUS_SEARCH_ID]);
		publisher.restorePublished({ [TOOLBAR_FOCUS_SEARCH_ID]: true });
		const nodes = buildApiSceneNodes(registry, publisher);
		const action = findApiSceneNode(
			nodes,
			(node) =>
				node.meta.group === 'action' &&
				node.meta.sasiId === TOOLBAR_FOCUS_SEARCH_ID,
		);
		const command = findApiSceneNode(
			nodes,
			(node) =>
				node.meta.group === 'command' &&
				node.meta.sasiId === TOOLBAR_FOCUS_SEARCH_ID,
		);
		expect(action?.cells ?? []).toEqual([]);
		expect(command?.cells).toContainEqual(
			expect.objectContaining({ id: PUBLISH_CELL_ID, enabled: true }),
		);
		expect(action?.meta.urn).not.toBe(command?.meta.urn);
	});

	it('publishes only descriptors and keeps registry actions non-publishable', () => {
		const { registry } = createVaultmanSasi();
		const publisher = publisherFor([TOOLBAR_REVEAL_ACTIVE_FILE_ID]);
		const nodes = buildApiSceneNodes(registry, publisher);
		const action = findApiSceneNode(
			nodes,
			(node) =>
				node.meta.group === 'action' &&
				node.meta.sasiId === TOOLBAR_REVEAL_ACTIVE_FILE_ID,
		);
		expect(action?.meta.publishable).toBe(false);
		expect(action?.cells ?? []).toEqual([]);
	});
});
