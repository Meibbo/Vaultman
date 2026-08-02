import { describe, expect, it } from 'vitest';

import { ScenePanelWidgetController } from '../../src/logic/logicScenePanelWidgetController';
import type { NavbarPanelWidgetState } from '../../src/types/typePanelWidget';

function projection(label: string): NavbarPanelWidgetState {
	return { label } as unknown as NavbarPanelWidgetState;
}

function publication(
	sceneInstanceId: string,
	providerId: string,
	generation: number,
	label: string,
) {
	return {
		sceneInstanceId,
		providerId,
		generation,
		projection: projection(label),
	};
}

describe('U121-003 shard 01 — ScenePanelWidgetController', () => {
	it('accepts a publication for the generation it just opened', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const generation = controller.begin('files');

		const accepted = controller.publish(
			publication('scene-a', 'files', generation, 'files-toolbar'),
		);

		expect(accepted).not.toBeNull();
		expect(controller.current()?.providerId).toBe('files');
		expect(controller.current()?.projection).toEqual(
			projection('files-toolbar'),
		);
	});

	it('rejects a publication from a superseded generation', () => {
		// The Statistics softlock: a slow provider finishes its async work after
		// the user has already moved on, and its stale projection wins.
		const controller = new ScenePanelWidgetController('scene-a');
		const statistics = controller.begin('statistics');
		const files = controller.begin('files');
		controller.publish(publication('scene-a', 'files', files, 'files-toolbar'));

		const late = controller.publish(
			publication('scene-a', 'statistics', statistics, 'statistics-toolbar'),
		);

		expect(late).toBeNull();
		expect(controller.current()?.providerId).toBe('files');
	});

	it('rejects a publication whose provider is not the current owner', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const generation = controller.begin('files');

		const wrongProvider = controller.publish(
			publication('scene-a', 'props', generation, 'props-toolbar'),
		);

		expect(wrongProvider).toBeNull();
		expect(controller.current()).toBeNull();
	});

	it('rejects a publication addressed to another Scene instance', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const generation = controller.begin('files');

		const foreign = controller.publish(
			publication('scene-b', 'files', generation, 'files-toolbar'),
		);

		expect(foreign).toBeNull();
		expect(controller.current()).toBeNull();
	});

	it('rejects a generation that was never opened', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		controller.begin('files');

		const invented = controller.publish(
			publication('scene-a', 'files', 999, 'files-toolbar'),
		);

		expect(invented).toBeNull();
	});

	it('clears only for the owner that still holds the envelope', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const files = controller.begin('files');
		controller.publish(publication('scene-a', 'files', files, 'files-toolbar'));

		const stale = controller.clear({
			sceneInstanceId: 'scene-a',
			providerId: 'statistics',
			generation: files - 1,
		});
		expect(stale).toBe(false);
		expect(controller.current()).not.toBeNull();

		const owner = controller.clear({
			sceneInstanceId: 'scene-a',
			providerId: 'files',
			generation: files,
		});
		expect(owner).toBe(true);
		expect(controller.current()).toBeNull();
	});

	it('cannot clear a later provider publication', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const statistics = controller.begin('statistics');
		const props = controller.begin('props');
		controller.publish(publication('scene-a', 'props', props, 'props-toolbar'));

		// The Statistics page unmounting must not blank the toolbar Props owns.
		const cleared = controller.clear({
			sceneInstanceId: 'scene-a',
			providerId: 'statistics',
			generation: statistics,
		});

		expect(cleared).toBe(false);
		expect(controller.current()?.providerId).toBe('props');
	});

	it('keeps two controllers independent even on the same provider id', () => {
		const a = new ScenePanelWidgetController('scene-a');
		const b = new ScenePanelWidgetController('scene-b');
		const generationA = a.begin('files');
		const generationB = b.begin('files');

		a.publish(publication('scene-a', 'files', generationA, 'a-toolbar'));
		b.publish(publication('scene-b', 'files', generationB, 'b-toolbar'));

		expect(a.current()?.projection).toEqual(projection('a-toolbar'));
		expect(b.current()?.projection).toEqual(projection('b-toolbar'));

		b.clear({
			sceneInstanceId: 'scene-b',
			providerId: 'files',
			generation: generationB,
		});

		expect(a.current()).not.toBeNull();
		expect(b.current()).toBeNull();
	});

	it('invalidates outstanding tokens on destroy', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const generation = controller.begin('files');
		controller.destroy();

		expect(
			controller.publish(
				publication('scene-a', 'files', generation, 'files-toolbar'),
			),
		).toBeNull();
		expect(controller.current()).toBeNull();
	});

	it('does not let a rebuilt Scene inherit a destroyed one', () => {
		const destroyed = new ScenePanelWidgetController('scene-a');
		const generation = destroyed.begin('files');
		destroyed.destroy();

		const rebuilt = new ScenePanelWidgetController('scene-a');
		expect(
			rebuilt.publish(
				publication('scene-a', 'files', generation, 'files-toolbar'),
			),
		).toBeNull();
	});

	it('advances the generation on every begin', () => {
		const controller = new ScenePanelWidgetController('scene-a');
		const first = controller.begin('files');
		const second = controller.begin('files');

		expect(second).toBeGreaterThan(first);
		// Re-opening the same provider still supersedes: a refresh in flight from
		// the previous pass is as stale as one from another provider.
		expect(
			controller.publish(publication('scene-a', 'files', first, 'stale')),
		).toBeNull();
	});
});
