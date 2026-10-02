import type { InstanceRegistryData } from '../types/typeInstance';
import type {
	HomeSurfaceIntent,
	SurfaceAddress,
	SurfaceRequest,
	UnsupportedSurfaceKind,
} from '../types/typeSurface';
import {
	DEFAULT_HOME_SURFACE,
} from '../types/typeSurface';
import {
	InstanceMountRegistry,
	type InstanceMountLease,
} from '../logic/logicInstanceMountRegistry';

export interface SurfaceLeaf {
	setViewState(state: {
		type: string;
		active: boolean;
		state: { readonly workspaceInstanceId: string };
	}): Promise<void>;
}

export interface SurfaceWorkspace<Leaf extends SurfaceLeaf> {
	getLeaf(newLeaf?: boolean | string): Leaf;
	getLeftLeaf(newLeaf?: boolean): Leaf | null;
	getRightLeaf(newLeaf?: boolean): Leaf | null;
	revealLeaf(leaf: Leaf): Promise<void>;
}

export interface SurfaceHostDeps<Leaf extends SurfaceLeaf> {
	readonly workspace: SurfaceWorkspace<Leaf>;
	readonly frameType: string;
	readonly mounts: InstanceMountRegistry<Leaf>;
	readonly readRegistry: () => InstanceRegistryData;
	readonly isRtl?: () => boolean;
}

export type OpenWorkspaceInstanceFailure =
	| { readonly ok: false; readonly reason: 'unknown-instance'; readonly instanceId: string }
	| { readonly ok: false; readonly reason: 'tombstoned-instance'; readonly instanceId: string }
	| {
			readonly ok: false;
			readonly reason: 'unsupported-surface';
			readonly surface: UnsupportedSurfaceKind;
		}
	| {
			readonly ok: false;
			readonly reason: 'surface-unavailable';
			readonly surface: HomeSurfaceIntent['kind'];
		}
	| {
			readonly ok: false;
			readonly reason: 'mount-conflict';
			readonly ownerId: string;
		}
	| { readonly ok: false; readonly reason: 'stale-reservation' }
	| {
			readonly ok: false;
			readonly reason: 'view-state-failed' | 'reveal-failed';
			readonly cause: Error;
		};

export type OpenWorkspaceInstanceResult<Leaf extends object> =
	| {
			readonly ok: true;
			readonly instanceId: string;
			readonly address: SurfaceAddress<Leaf>;
			readonly lease: InstanceMountLease<Leaf>;
		}
	| OpenWorkspaceInstanceFailure;

export class SurfaceHost<Leaf extends SurfaceLeaf> {
	private readonly deps: SurfaceHostDeps<Leaf>;
	private readonly pending = new Map<
		string,
		{ readonly surface: HomeSurfaceIntent; readonly promise: Promise<OpenWorkspaceInstanceResult<Leaf>> }
	>();

	constructor(deps: SurfaceHostDeps<Leaf>) {
		this.deps = deps;
	}

	async openWorkspaceInstance(
		instanceId: string,
		requested?: SurfaceRequest,
	): Promise<OpenWorkspaceInstanceResult<Leaf>> {
		const record = this.deps.readRegistry().instances[instanceId];
		if (!record) return { ok: false, reason: 'unknown-instance', instanceId };
		if (record.tombstoned) {
			return { ok: false, reason: 'tombstoned-instance', instanceId };
		}
		const intent = resolveHomeIntent(requested, record.homeSurface ?? DEFAULT_HOME_SURFACE);
		if (!intent.ok) return intent;
		const pending = this.pending.get(instanceId);
		if (pending) {
			return requested === undefined || sameSurfaceIntent(pending.surface, intent.surface)
				? pending.promise
				: { ok: false, reason: 'mount-conflict', ownerId: instanceId };
		}
		const promise = this.openResolvedWorkspaceInstance(instanceId, intent.surface, requested !== undefined);
		this.pending.set(instanceId, { surface: intent.surface, promise });
		try {
			return await promise;
		} finally {
			if (this.pending.get(instanceId)?.promise === promise) {
				this.pending.delete(instanceId);
			}
		}
	}

	private async openResolvedWorkspaceInstance(
		instanceId: string,
		surface: HomeSurfaceIntent,
		hasSurfaceOverride: boolean,
	): Promise<OpenWorkspaceInstanceResult<Leaf>> {

		const current = this.deps.mounts.get(instanceId);
		if (current) {
			// Home is an allocation intent, not a request to relocate an existing mount.
			if (hasSurfaceOverride && !sameSurface(current.address, surface)) {
				return { ok: false, reason: 'mount-conflict', ownerId: instanceId };
			}
			if (!this.deps.mounts.isCurrent(current)) {
				return { ok: false, reason: 'stale-reservation' };
			}
			try {
				await this.deps.workspace.revealLeaf(current.address.leaf);
			} catch (error) {
				return { ok: false, reason: 'reveal-failed', cause: asError(error) };
			}
			return this.deps.mounts.isCurrent(current)
				? { ok: true, instanceId, address: current.address, lease: current }
				: { ok: false, reason: 'stale-reservation' };
		}

		const leaf = leafFor(this.deps.workspace, surface, this.deps.isRtl?.() === true);
		if (!leaf) {
			return { ok: false, reason: 'surface-unavailable', surface: surface.kind };
		}
		const reservation = this.deps.mounts.reserve(
			instanceId,
			leaf,
			surface.kind === 'main'
				? { kind: 'main', leaf }
				: { kind: 'sidebar', edge: surface.edge, leaf },
		);
		if (!reservation.ok) {
			return { ok: false, reason: 'mount-conflict', ownerId: reservation.ownerId };
		}
		try {
			await leaf.setViewState({
				type: this.deps.frameType,
				active: true,
				state: { workspaceInstanceId: instanceId },
			});
		} catch (error) {
			this.deps.mounts.release(reservation.lease);
			return { ok: false, reason: 'view-state-failed', cause: asError(error) };
		}
		if (!this.deps.mounts.isCurrent(reservation.lease)) {
			this.deps.mounts.release(reservation.lease);
			return { ok: false, reason: 'stale-reservation' };
		}
		try {
			await this.deps.workspace.revealLeaf(leaf);
		} catch (error) {
			return { ok: false, reason: 'reveal-failed', cause: asError(error) };
		}
		return this.deps.mounts.isCurrent(reservation.lease)
			? {
					ok: true,
					instanceId,
					address: reservation.lease.address,
					lease: reservation.lease,
				}
			: { ok: false, reason: 'stale-reservation' };
	}
}

function resolveHomeIntent(
	requested: SurfaceRequest | undefined,
	fallback: HomeSurfaceIntent,
):
	| { readonly ok: true; readonly surface: HomeSurfaceIntent }
	| OpenWorkspaceInstanceFailure {
	const surface = requested ?? fallback;
	switch (surface.kind) {
		case 'main':
		case 'sidebar':
			return { ok: true, surface };
		case 'island':
		case 'new-window':
			return { ok: false, reason: 'unsupported-surface', surface: surface.kind };
		default:
			return assertNever(surface);
	}
}

function leafFor<Leaf extends SurfaceLeaf>(
	workspace: SurfaceWorkspace<Leaf>,
	surface: HomeSurfaceIntent,
	isRtl: boolean,
): Leaf | null {
	switch (surface.kind) {
		case 'main':
			return workspace.getLeaf('tab');
		case 'sidebar':
			return (surface.edge === 'start') !== isRtl
				? workspace.getLeftLeaf(true)
				: workspace.getRightLeaf(true);
		default:
			return assertNever(surface);
	}
}

function sameSurfaceIntent(left: HomeSurfaceIntent, right: HomeSurfaceIntent): boolean {
	return left.kind === right.kind &&
		(left.kind === 'main' || (right.kind === 'sidebar' && left.edge === right.edge));
}

function sameSurface<Leaf extends object>(
	address: SurfaceAddress<Leaf>,
	surface: HomeSurfaceIntent,
): boolean {
	if (address.kind !== surface.kind) return false;
	if (surface.kind === 'main') return true;
	return address.kind === 'sidebar' && address.edge === surface.edge;
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

function assertNever(value: never): never {
	throw new Error(`Unexpected surface: ${String(value)}`);
}
