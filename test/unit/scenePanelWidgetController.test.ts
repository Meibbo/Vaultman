import { describe, expect, it } from 'vitest';
import { ScenePanelWidgetController } from '../../src/logic/logicScenePanelWidgetController';
import type { NavbarPanelWidgetState, ScenePanelWidgetPublication } from '../../src/types/typePanelWidget';

function mockProjection(providerId: string): NavbarPanelWidgetState {
	return {
		providerId,
		actionPort: { invoke: async () => true },
		activeTab: 'files',
		filtersSearch: '',
		filtersSearchCategory: { files: 0, props: 0, tags: 0 },
		icon: () => ({ update: () => {} }),
	};
}

describe('ScenePanelWidgetController', () => {
	it('accepts publication with matching sceneInstanceId, providerId, and current generation', () => {
		const controller = new ScenePanelWidgetController('scene-1');
		const gen = controller.begin('files');

		const publication: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-1',
			providerId: 'files',
			generation: gen,
			projection: mockProjection('files'),
		};

		const result = controller.publish(publication);
		expect(result).not.toBeNull();
		expect(result?.providerId).toBe('files');
		expect(result?.generation).toBe(gen);
		expect(controller.current()).toEqual(publication);
	});

	it('rejects publication with older generation', () => {
		const controller = new ScenePanelWidgetController('scene-1');
		const gen1 = controller.begin('files');
		const gen2 = controller.begin('props');

		const oldPublication: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-1',
			providerId: 'files',
			generation: gen1,
			projection: mockProjection('files'),
		};

		const result = controller.publish(oldPublication);
		expect(result).toBeNull();
		expect(controller.current()).toBeNull();

		const newPublication: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-1',
			providerId: 'props',
			generation: gen2,
			projection: mockProjection('props'),
		};
		expect(controller.publish(newPublication)).not.toBeNull();
		expect(controller.current()?.providerId).toBe('props');
	});

	it('rejects publication with mismatched sceneInstanceId', () => {
		const controller = new ScenePanelWidgetController('scene-1');
		const gen = controller.begin('files');

		const foreignPublication: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-2',
			providerId: 'files',
			generation: gen,
			projection: mockProjection('files'),
		};

		expect(controller.publish(foreignPublication)).toBeNull();
	});

	it('makes clear conditional on the same owner and generation', () => {
		const controller = new ScenePanelWidgetController('scene-1');
		const gen1 = controller.begin('files');
		const pub1: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-1',
			providerId: 'files',
			generation: gen1,
			projection: mockProjection('files'),
		};
		controller.publish(pub1);

		const gen2 = controller.begin('props');

		// Attempting to clear using old owner token should fail and not clear current (props)
		const clearedOld = controller.clear({ sceneInstanceId: 'scene-1', providerId: 'files', generation: gen1 });
		expect(clearedOld).toBe(false);

		// Clearing with active owner token succeeds
		const clearedActive = controller.clear({ sceneInstanceId: 'scene-1', providerId: 'props', generation: gen2 });
		expect(clearedActive).toBe(true);
		expect(controller.current()).toBeNull();
	});

	it('keeps state independent between two controllers using the same providerId', () => {
		const controllerA = new ScenePanelWidgetController('scene-A');
		const controllerB = new ScenePanelWidgetController('scene-B');

		const genA = controllerA.begin('files');
		const genB = controllerB.begin('files');

		const pubA: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-A',
			providerId: 'files',
			generation: genA,
			projection: mockProjection('files'),
		};

		const pubB: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-B',
			providerId: 'files',
			generation: genB,
			projection: mockProjection('files'),
		};

		controllerA.publish(pubA);
		expect(controllerA.current()?.sceneInstanceId).toBe('scene-A');
		expect(controllerB.current()).toBeNull();

		controllerB.publish(pubB);
		expect(controllerB.current()?.sceneInstanceId).toBe('scene-B');

		controllerA.destroy();
		expect(controllerA.current()).toBeNull();
		expect(controllerB.current()).not.toBeNull();
	});

	it('invalidates outstanding tokens on destroy', () => {
		const controller = new ScenePanelWidgetController('scene-1');
		const gen = controller.begin('files');
		controller.destroy();

		const pub: ScenePanelWidgetPublication = {
			sceneInstanceId: 'scene-1',
			providerId: 'files',
			generation: gen,
			projection: mockProjection('files'),
		};

		expect(controller.publish(pub)).toBeNull();
		expect(controller.current()).toBeNull();
	});
});
