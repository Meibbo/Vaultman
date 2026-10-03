import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	InstanceRegistryData,
	WorkspaceInstanceRecord,
} from '../../src/types/typeInstance';
import { createInstanceRecord } from '../../src/logic/logicInstanceRegistry';
import {
	InstanceMountRegistry,
	type InstanceMountLease,
} from '../../src/logic/logicInstanceMountRegistry';

const svelteMocks = vi.hoisted(() => {
	const mountedApi = {};
	return {
		mountedApi,
		mount: vi.fn(
			(
				_component: unknown,
				options: {
					readonly target: unknown;
					readonly props: { readonly workspaceInstanceId: string };
				},
			) => ({ mountedApi, options }),
		),
		unmount: vi.fn(async () => undefined),
	};
});

vi.mock('obsidian', () => ({
	ItemView: class {
		readonly app;
		readonly contentEl;
		readonly leaf;

		constructor(leaf: FakeLeaf) {
			this.app = leaf.app;
			this.contentEl = leaf.contentEl;
			this.leaf = leaf;
		}

		registerEvent(_event: unknown): void {}
		register(_cleanup: () => unknown): void {}
		getState(): Record<string, unknown> {
			return {};
		}
		async setState(_state: unknown, _result: unknown): Promise<void> {}
	},
}));
vi.mock('svelte', () => ({ mount: svelteMocks.mount, unmount: svelteMocks.unmount }));
vi.mock('../../src/VaultmanFrame.svelte', () => ({ default: {} }));
vi.mock('../../src/i18n/index', () => ({ translate: (key: string) => key }));
vi.mock('../../src/logic/logicScenePerformance', () => ({
	measureSceneSync: (_name: string, _input: unknown, operation: () => unknown) => operation(),
	measureSceneAsync: async (
		_name: string,
		_input: unknown,
		operation: () => Promise<unknown>,
	) => operation(),
}));

import { VaultmanFrame } from '../../src/VaultmanFrame';

type FakeContentElement = {
	readonly empty: ReturnType<typeof vi.fn>;
	readonly addClass: ReturnType<typeof vi.fn>;
	readonly ownerDocument: { readonly defaultView: null };
};

type FakeLeaf = {
	readonly app: {
		readonly workspace: {
			readonly on: ReturnType<typeof vi.fn>;
			readonly requestSaveLayout: ReturnType<typeof vi.fn>;
		};
	};
	readonly contentEl: FakeContentElement;
	readonly parent: null;
	readonly getViewState: () => { readonly state: Record<string, unknown> };
};

type HarnessOptions = {
	readonly anchor?: string;
	readonly registry?: InstanceRegistryData;
	readonly reservedInstanceId?: string;
};

function createHarness(options: HarnessOptions = {}) {
	const contentEl: FakeContentElement = {
		empty: vi.fn(),
		addClass: vi.fn(),
		ownerDocument: { defaultView: null },
	};
	const workspace = {
		on: vi.fn(() => ({ unload: vi.fn() })),
		requestSaveLayout: vi.fn(),
	};
	const leaf: FakeLeaf = {
		app: { workspace },
		contentEl,
		parent: null,
		getViewState: () => ({
			state: options.anchor ? { workspaceInstanceId: options.anchor } : {},
		}),
	};
	const mounts = new InstanceMountRegistry<object>();
	if (options.reservedInstanceId) {
		mounts.reserve(options.reservedInstanceId, leaf, { kind: 'main', leaf });
	}
	const settings = {
		instanceRegistry: options.registry ?? { schema: 1, instances: {} },
	};
	const saveSettings = vi.fn(async () => undefined);
	const plugin = {
		settings,
		saveSettings,
		onSettingsChange: vi.fn(() => () => undefined),
		workspaceMountForLeaf: (candidate: object) => mounts.getByLeaf(candidate),
		adoptWorkspaceMount: (instanceId: string, candidate: object) =>
			mounts.adopt(instanceId, candidate, { kind: 'main', leaf: candidate }),
		releaseWorkspaceMount: (lease: InstanceMountLease<object>) => mounts.release(lease),
		readdressWorkspaceMount: (_candidate: object) => undefined,
	};
	const constructed: unknown = Reflect.construct(VaultmanFrame, [leaf, plugin]);
	if (!(constructed instanceof VaultmanFrame)) {
		throw new Error('VaultmanFrame fixture construction failed');
	}
	return { frame: constructed, leaf, mounts, settings, saveSettings, workspace, contentEl };
}

describe('VaultmanFrame exact instance lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('waits without provisional identity, then mounts the late exact anchor and releases it', async () => {
		const harness = createHarness();
		const initialRegistry = harness.settings.instanceRegistry;

		await harness.frame.onOpen();

		expect(harness.frame.workspaceInstanceId).toBeNull();
		expect(harness.settings.instanceRegistry).toBe(initialRegistry);
		expect(harness.mounts.getByLeaf(harness.leaf)).toBeUndefined();
		expect(svelteMocks.mount).not.toHaveBeenCalled();
		expect(harness.workspace.requestSaveLayout).not.toHaveBeenCalled();

		await harness.frame.setState({ workspaceInstanceId: 'vm-late' }, { history: false });
		await harness.frame.setState({ workspaceInstanceId: 'vm-late' }, { history: false });

		expect(harness.frame.workspaceInstanceId).toBe('vm-late');
		expect(harness.mounts.get('vm-late')?.address.leaf).toBe(harness.leaf);
		expect(harness.settings.instanceRegistry.instances['vm-late']?.id).toBe('vm-late');
		expect(svelteMocks.mount).toHaveBeenCalledTimes(1);
		const mountOptions = svelteMocks.mount.mock.calls[0]?.[1];
		expect(mountOptions?.target).toBe(harness.contentEl);
		expect(mountOptions?.props.workspaceInstanceId).toBe('vm-late');

		const lease = harness.mounts.get('vm-late');
		expect(lease).toBeDefined();
		await harness.frame.onClose();
		expect(svelteMocks.unmount).toHaveBeenCalledWith(
			expect.objectContaining({ mountedApi: svelteMocks.mountedApi }),
		);
		expect(harness.mounts.get('vm-late')).toBeUndefined();
		expect(lease && harness.mounts.isCurrent(lease)).toBe(false);
	});

	it('keeps local and durable identity unchanged when a late exact claim conflicts', async () => {
		const harness = createHarness();
		await harness.frame.onOpen();
		const competingLeaf = {};
		const reservation = harness.mounts.reserve('vm-owned', competingLeaf, {
			kind: 'main',
			leaf: competingLeaf,
		});
		const initialRegistry = harness.settings.instanceRegistry;

		await expect(
			harness.frame.setState({ workspaceInstanceId: 'vm-owned' }, { history: false }),
		).rejects.toMatchObject({
			name: 'InstanceMountConflictError',
			instanceId: 'vm-owned',
			ownerId: 'vm-owned',
		});

		expect(harness.frame.workspaceInstanceId).toBeNull();
		expect(harness.settings.instanceRegistry).toBe(initialRegistry);
		expect(harness.mounts.get('vm-owned')).toEqual(reservation.ok ? reservation.lease : undefined);
		expect(harness.saveSettings).not.toHaveBeenCalled();
		expect(svelteMocks.mount).not.toHaveBeenCalled();
	});

	it('rejects a declared tombstone without reviving or claiming it', async () => {
		const tombstone: WorkspaceInstanceRecord = {
			...createInstanceRecord('vm-declared-dead'),
			tombstoned: true,
			homeSurface: { kind: 'main' },
		};
		const registry: InstanceRegistryData = {
			schema: 1,
			instances: { 'vm-declared-dead': tombstone },
		};
		const harness = createHarness({ anchor: 'vm-declared-dead', registry });

		await expect(harness.frame.onOpen()).rejects.toMatchObject({
			name: 'InstanceMountUnavailableError',
			instanceId: 'vm-declared-dead',
			reason: 'tombstoned-instance',
		});

		expect(harness.frame.workspaceInstanceId).toBeNull();
		expect(harness.settings.instanceRegistry).toBe(registry);
		expect(registry.instances['vm-declared-dead']?.tombstoned).toBe(true);
		expect(harness.mounts.get('vm-declared-dead')).toBeUndefined();
		expect(harness.saveSettings).not.toHaveBeenCalled();
		expect(svelteMocks.mount).not.toHaveBeenCalled();
	});

	it('adopts a supplied reservation on open and mounts its exact identity once', async () => {
		const registry: InstanceRegistryData = {
			schema: 1,
			instances: { 'vm-reserved': createInstanceRecord('vm-reserved') },
		};
		const harness = createHarness({
			anchor: 'vm-reserved',
			registry,
			reservedInstanceId: 'vm-reserved',
		});
		const reservation = harness.mounts.get('vm-reserved');

		await harness.frame.onOpen();
		await harness.frame.setState({ workspaceInstanceId: 'vm-reserved' }, { history: false });

		expect(harness.frame.workspaceInstanceId).toBe('vm-reserved');
		expect(harness.mounts.get('vm-reserved')?.token).toBe(reservation?.token);
		expect(svelteMocks.mount).toHaveBeenCalledTimes(1);
		expect(svelteMocks.mount.mock.calls[0]?.[1].props.workspaceInstanceId).toBe('vm-reserved');
	});
});
