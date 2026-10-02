import { describe, expect, it, vi } from 'vitest';
import { ensureInstance, EMPTY_REGISTRY } from '../../src/logic/logicInstanceRegistry';
import { InstanceMountRegistry } from '../../src/logic/logicInstanceMountRegistry';
import { SurfaceHost } from '../../src/services/serviceSurfaceHost';

type FakeLeaf = {
	id: string;
	setViewState: (state: {
		type: string;
		active: boolean;
		state: { readonly workspaceInstanceId: string };
	}) => Promise<void>;
};

function fakeLeaf(id: string): FakeLeaf {
	return { id, setViewState: vi.fn(async () => undefined) };
}

function harness(isRtl = false) {
	const main = fakeLeaf('main');
	const left = fakeLeaf('left');
	const right = fakeLeaf('right');
	let registry = ensureInstance(EMPTY_REGISTRY, 'vm-a').registry;
	registry = ensureInstance(registry, 'vm-b').registry;
	const workspace = {
		getLeaf: vi.fn(() => main),
		getLeftLeaf: vi.fn(() => left),
		getRightLeaf: vi.fn(() => right),
		revealLeaf: vi.fn(async () => undefined),
	};
	const mounts = new InstanceMountRegistry<FakeLeaf>();
	const host = new SurfaceHost({
		workspace,
		frameType: 'vaultman-frame',
		mounts,
		isRtl: () => isRtl,
		readRegistry: () => registry,
	});
	return { host, workspace, mounts, main, left, right, get registry() { return registry; } };
}

describe('SurfaceHost', () => {
	it('opens a known instance on an explicit logical sidebar surface', async () => {
		const h = harness();
		const result = await h.host.openWorkspaceInstance('vm-a', { kind: 'sidebar', edge: 'start' });

		expect(result.ok).toBe(true);
		expect(h.workspace.getLeftLeaf).toHaveBeenCalledWith(true);
		expect(h.left.setViewState).toHaveBeenCalledWith({
			type: 'vaultman-frame',
			active: true,
			state: { workspaceInstanceId: 'vm-a' },
		});
	});

	it('treats a requested surface as a one-open override', async () => {
		const h = harness();
		h.registry.instances['vm-a'].homeSurface = { kind: 'main' };

		const result = await h.host.openWorkspaceInstance('vm-a', {
			kind: 'sidebar',
			edge: 'end',
		});

		expect(result.ok).toBe(true);
		expect(h.registry.instances['vm-a'].homeSurface).toEqual({ kind: 'main' });
	});

	it('maps logical start to the physical right sidebar under RTL', async () => {
		const h = harness(true);
		await h.host.openWorkspaceInstance('vm-a', { kind: 'sidebar', edge: 'start' });

		expect(h.workspace.getRightLeaf).toHaveBeenCalledWith(true);
		expect(h.workspace.getLeftLeaf).not.toHaveBeenCalled();
	});

	it('rejects unknown, tombstoned, and unsupported opens without fallback', async () => {
		const h = harness();
		let result = await h.host.openWorkspaceInstance('missing');
		expect(result).toEqual({ ok: false, reason: 'unknown-instance', instanceId: 'missing' });

		h.registry.instances['vm-b'].tombstoned = true;
		result = await h.host.openWorkspaceInstance('vm-b');
		expect(result).toEqual({ ok: false, reason: 'tombstoned-instance', instanceId: 'vm-b' });

		for (const surface of ['island', 'new-window'] as const) {
			result = await h.host.openWorkspaceInstance('vm-a', { kind: surface });
			expect(result).toEqual({ ok: false, reason: 'unsupported-surface', surface });
		}
		expect(h.workspace.getLeaf).not.toHaveBeenCalled();
	});

	it('reveals the existing lease without opening a second leaf', async () => {
		const h = harness();
		const first = await h.host.openWorkspaceInstance('vm-a');
		const second = await h.host.openWorkspaceInstance('vm-a');

		expect(first.ok).toBe(true);
		expect(second).toEqual(first);
		expect(h.main.setViewState).toHaveBeenCalledTimes(1);
		expect(h.workspace.revealLeaf).toHaveBeenCalledTimes(2);
	});

	it('reveals an exact restored frame adopted before the explicit open', async () => {
		const h = harness();
		const adopted = h.mounts.adopt('vm-a', h.main, { kind: 'main', leaf: h.main });
		expect(adopted.ok).toBe(true);

		const result = await h.host.openWorkspaceInstance('vm-a');

		expect(result.ok).toBe(true);
		expect(h.workspace.getLeaf).not.toHaveBeenCalled();
		expect(h.main.setViewState).not.toHaveBeenCalled();
		expect(h.workspace.revealLeaf).toHaveBeenCalledWith(h.main);
	});

	it('shares an in-flight open and never reveals after its reservation is fenced', async () => {
		const h = harness();
		let finishState: (() => void) | undefined;
		const stateComplete = new Promise<void>((resolve) => {
			finishState = resolve;
		});
		h.main.setViewState = vi.fn(() => stateComplete);

		const firstPromise = h.host.openWorkspaceInstance('vm-a');
		await Promise.resolve();
		const secondPromise = h.host.openWorkspaceInstance('vm-a');
		expect(h.workspace.revealLeaf).not.toHaveBeenCalled();
		const lease = h.mounts.get('vm-a');
		expect(lease).toBeDefined();
		if (!lease || !finishState) return;
		h.mounts.release(lease);
		finishState();

		expect(await firstPromise).toEqual({ ok: false, reason: 'stale-reservation' });
		expect(await secondPromise).toEqual({ ok: false, reason: 'stale-reservation' });
		expect(h.workspace.revealLeaf).not.toHaveBeenCalled();
	});

	it('reveals the moved live mount instead of forcing its durable home', async () => {
		const h = harness();
		h.registry.instances['vm-a'].homeSurface = { kind: 'main' };
		h.mounts.adopt('vm-a', h.right, { kind: 'sidebar', edge: 'end', leaf: h.right });

		const result = await h.host.openWorkspaceInstance('vm-a');

		expect(result.ok).toBe(true);
		expect(h.workspace.revealLeaf).toHaveBeenCalledWith(h.right);
		expect(h.workspace.getLeaf).not.toHaveBeenCalled();
		expect(h.registry.instances['vm-a'].homeSurface).toEqual({ kind: 'main' });
	});

	it('rejects an explicit conflicting override without replacing a live mount', async () => {
		const h = harness();
		h.mounts.adopt('vm-a', h.right, { kind: 'sidebar', edge: 'end', leaf: h.right });

		const result = await h.host.openWorkspaceInstance('vm-a', { kind: 'main' });

		expect(result).toEqual({ ok: false, reason: 'mount-conflict', ownerId: 'vm-a' });
		expect(h.workspace.revealLeaf).not.toHaveBeenCalled();
		expect(h.workspace.getLeaf).not.toHaveBeenCalled();
	});

	it('retains a successfully mounted lease when reveal fails so retry cannot duplicate it', async () => {
		const h = harness();
		h.workspace.revealLeaf.mockRejectedValueOnce(new Error('reveal failed'));

		const failed = await h.host.openWorkspaceInstance('vm-a');

		expect(failed).toMatchObject({ ok: false, reason: 'reveal-failed' });
		expect(h.mounts.get('vm-a')?.address.leaf).toBe(h.main);
		const retry = await h.host.openWorkspaceInstance('vm-a');
		expect(retry.ok).toBe(true);
		expect(h.main.setViewState).toHaveBeenCalledTimes(1);
		expect(h.workspace.getLeaf).toHaveBeenCalledTimes(1);
	});
});
