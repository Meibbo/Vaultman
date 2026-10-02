import { describe, expect, it } from 'vitest';

import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	buildApiSceneNodes,
	PUBLISH_CELL_ID,
} from '../../src/logic/logicApiScene';
import { createSasiCommandPublisher } from '../../src/logic/logicSasiCommands';
import {
	TOOLBAR_FOCUS_SEARCH_ID,
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_SEARCHBOX_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
} from '../../src/logic/logicSasiToolbarActions';
import {
	SEARCH_CREATE_TARGET_ID,
	SEARCH_CYCLE_CATEGORY_ID,
} from '../../src/logic/logicSasiSearchActions';

const BINDABLE_TOOLBAR_IDS = [
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
	TOOLBAR_SEARCHBOX_ID,
	TOOLBAR_FOCUS_SEARCH_ID,
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
	it('registers toolbar, focus-search and searchbox actions on usable surfaces', () => {
		const { registry } = createVaultmanSasi();
		for (const id of [
			TOOLBAR_REVEAL_ACTIVE_FILE_ID,
			TOOLBAR_TOGGLE_EXPANSION_ID,
			TOOLBAR_SEARCHBOX_ID,
			TOOLBAR_FOCUS_SEARCH_ID,
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

	it('projects bindeable toolbar/search descriptors as published command rows', () => {
		const { registry } = createVaultmanSasi();
		const publisher = publisherFor(BINDABLE_TOOLBAR_IDS);
		const decisions: Record<string, boolean> = {};
		for (const id of BINDABLE_TOOLBAR_IDS) decisions[id] = true;
		publisher.restorePublished(decisions);

		const nodes = buildApiSceneNodes(registry, publisher);
		for (const id of BINDABLE_TOOLBAR_IDS) {
			const command = nodes.find(
				(node) => node.meta.group === 'command' && node.meta.sasiId === id,
			);
			expect(command?.meta.publishable, id).toBe(true);
			expect(command?.meta.published, id).toBe(true);
			expect(command?.cells, id).toContainEqual(
				expect.objectContaining({ id: PUBLISH_CELL_ID, kind: 'toggle' }),
			);
		}
	});

	it('keeps the action identity separate from its command publication row', () => {
		const { registry } = createVaultmanSasi();
		const publisher = publisherFor([TOOLBAR_FOCUS_SEARCH_ID]);
		publisher.restorePublished({ [TOOLBAR_FOCUS_SEARCH_ID]: true });
		const nodes = buildApiSceneNodes(registry, publisher);
		const action = nodes.find(
			(node) =>
				node.meta.group === 'action' &&
				node.meta.sasiId === TOOLBAR_FOCUS_SEARCH_ID,
		);
		const command = nodes.find(
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
		const action = nodes.find(
			(node) =>
				node.meta.group === 'action' &&
				node.meta.sasiId === TOOLBAR_REVEAL_ACTIVE_FILE_ID,
		);
		expect(action?.meta.publishable).toBe(false);
		expect(action?.cells ?? []).toEqual([]);
	});
});
