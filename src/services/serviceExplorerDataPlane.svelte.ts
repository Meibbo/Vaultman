import type { ExplorerSnapshot } from '../types/typeExplorerDataPlane';

type AnySnapshot = ExplorerSnapshot<unknown>;

/**
 * In-memory, per-explorer immutable snapshot store. Each publish replaces the
 * snapshot for that explorer and stamps monotonically increasing counters.
 */
export class ExplorerDataPlaneService {
	#snapshots = new Map<string, AnySnapshot>();
	#subscribers = new Map<string, Set<() => void>>();
	#counters = new Map<string, number>();

	snapshot<TMeta = unknown>(explorerId: string): ExplorerSnapshot<TMeta> | undefined {
		return this.#snapshots.get(explorerId) as ExplorerSnapshot<TMeta> | undefined;
	}

	publish<TMeta = unknown>(explorerId: string, snapshot: ExplorerSnapshot<TMeta>): void {
		const nextRevision = (this.#counters.get(explorerId) ?? 0) + 1;
		this.#counters.set(explorerId, nextRevision);
		const stamped: ExplorerSnapshot<TMeta> = {
			...snapshot,
			revision: nextRevision,
			structureRevision: nextRevision,
		};
		this.#snapshots.set(explorerId, stamped);
		this.#fire(explorerId);
	}

	clear(explorerId: string): void {
		this.#snapshots.delete(explorerId);
		this.#counters.delete(explorerId);
		this.#fire(explorerId);
	}

	subscribe(explorerId: string, cb: () => void): () => void {
		let bucket = this.#subscribers.get(explorerId);
		if (!bucket) {
			bucket = new Set();
			this.#subscribers.set(explorerId, bucket);
		}
		bucket.add(cb);
		return () => {
			bucket?.delete(cb);
		};
	}

	#fire(explorerId: string): void {
		const bucket = this.#subscribers.get(explorerId);
		if (!bucket) return;
		for (const cb of bucket) cb();
	}
}
