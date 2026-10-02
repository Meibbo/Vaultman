import type { SurfaceAddress } from '../types/typeSurface';

export interface InstanceMountLease<Leaf extends object = object> {
	readonly instanceId: string;
	readonly token: string;
	readonly address: SurfaceAddress<Leaf>;
}

export class InstanceMountConflictError extends Error {
	readonly name = 'InstanceMountConflictError';

	constructor(
		readonly instanceId: string,
		readonly ownerId: string,
	) {
		super(`workspace instance ${instanceId} conflicts with mount owner ${ownerId}`);
	}
}

export class InstanceMountUnavailableError extends Error {
	readonly name = 'InstanceMountUnavailableError';

	constructor(
		readonly instanceId: string,
		readonly reason: 'tombstoned-instance',
	) {
		super(`workspace instance ${instanceId} is unavailable: ${reason}`);
	}
}

export type MountReservationResult<Leaf extends object> =
	| { readonly ok: true; readonly lease: InstanceMountLease<Leaf> }
	| {
			readonly ok: false;
			readonly reason: 'instance-owned' | 'leaf-owned';
			readonly ownerId: string;
		};

export class InstanceMountRegistry<Leaf extends object> {
	private readonly byInstance = new Map<string, InstanceMountLease<Leaf>>();
	private readonly byLeaf = new Map<Leaf, InstanceMountLease<Leaf>>();
	private nextToken = 0;

	reserve(
		instanceId: string,
		leaf: Leaf,
		address: SurfaceAddress<Leaf>,
	): MountReservationResult<Leaf> {
		return this.claim(instanceId, leaf, address);
	}

	adopt(
		instanceId: string,
		leaf: Leaf,
		address: SurfaceAddress<Leaf>,
	): MountReservationResult<Leaf> {
		return this.claim(instanceId, leaf, address);
	}

	readdress(
		lease: InstanceMountLease<Leaf>,
		address: SurfaceAddress<Leaf>,
	): boolean {
		const current = this.byInstance.get(lease.instanceId);
		if (!current || current.token !== lease.token) return false;
		const owner = this.byLeaf.get(address.leaf);
		if (owner && owner.token !== lease.token) return false;
		if (current.address.leaf !== address.leaf) {
			if (this.byLeaf.get(current.address.leaf)?.token === lease.token) {
				this.byLeaf.delete(current.address.leaf);
			}
			this.byLeaf.set(address.leaf, { ...current, address });
		} else {
			this.byLeaf.set(address.leaf, { ...current, address });
		}
		this.byInstance.set(lease.instanceId, { ...current, address });
		return true;
	}

	private claim(
		instanceId: string,
		leaf: Leaf,
		address: SurfaceAddress<Leaf>,
	): MountReservationResult<Leaf> {
		const existing = this.byInstance.get(instanceId);
		if (existing) {
			if (existing.address.leaf === leaf && sameAddress(existing.address, address)) {
				return { ok: true, lease: existing };
			}
			return { ok: false, reason: 'instance-owned', ownerId: instanceId };
		}
		const owner = this.byLeaf.get(leaf);
		if (owner) return { ok: false, reason: 'leaf-owned', ownerId: owner.instanceId };

		const lease: InstanceMountLease<Leaf> = {
			instanceId,
			token: `mount-${++this.nextToken}`,
			address,
		};
		this.byInstance.set(instanceId, lease);
		this.byLeaf.set(leaf, lease);
		return { ok: true, lease };
	}

	get(instanceId: string): InstanceMountLease<Leaf> | undefined {
		return this.byInstance.get(instanceId);
	}

	getByLeaf(leaf: Leaf): InstanceMountLease<Leaf> | undefined {
		return this.byLeaf.get(leaf);
	}

	isCurrent(lease: InstanceMountLease<Leaf>): boolean {
		return this.byInstance.get(lease.instanceId)?.token === lease.token;
	}

	release(lease: InstanceMountLease<Leaf>): boolean {
		const current = this.byInstance.get(lease.instanceId);
		if (!current || current.token !== lease.token) return false;
		this.byInstance.delete(lease.instanceId);
		if (this.byLeaf.get(current.address.leaf)?.token === lease.token) {
			this.byLeaf.delete(current.address.leaf);
		}
		return true;
	}
}

function sameAddress<Leaf extends object>(
	left: SurfaceAddress<Leaf>,
	right: SurfaceAddress<Leaf>,
): boolean {
	if (left.kind !== right.kind) return false;
	switch (left.kind) {
		case 'main':
			return true;
		case 'sidebar':
			return right.kind === 'sidebar' && left.edge === right.edge;
		default:
			return false;
	}
}
