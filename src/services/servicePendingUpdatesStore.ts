import type { DataAdapter } from 'obsidian';

/** Durable discovery hints for pending plugin updates; never installation authority. */
export interface PendingUpdateEntry {
	readonly id: string;
	readonly pendingVersion: string;
	readonly discoveredAt: number;
	readonly checkId: number;
	readonly schema: 1;
}

export type PendingUpdatesAdapter = Pick<
	DataAdapter,
	'exists' | 'read' | 'write' | 'rename' | 'mkdir' | 'remove' | 'rmdir' | 'list'
>;

interface PendingUpdatesFile {
	readonly schema: 1;
	readonly entries: readonly PendingUpdateEntry[];
}

interface SemVer {
	major: string;
	minor: string;
	patch: string;
	pre: string[];
}

function parseSemVer(input: string): SemVer | undefined {
	const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(input);
	if (!match) return undefined;
	const pre = match[4]?.split('.') ?? [];
	if (pre.some((part) => /^\d+$/.test(part) && part.length > 1 && part[0] === '0')) return undefined;
	return { major: match[1], minor: match[2], patch: match[3], pre };
}

/** Invalid versions compare as NaN and cannot authorize an update badge. */
export function comparePendingVersions(left: string, right: string): number {
	const a = parseSemVer(left);
	const b = parseSemVer(right);
	if (!a || !b) return Number.NaN;
	for (const key of ['major', 'minor', 'patch'] as const) {
		const order = compareNumericIdentifiers(a[key], b[key]);
		if (order !== 0) return order;
	}
	if (a.pre.length === 0 || b.pre.length === 0) return a.pre.length === b.pre.length ? 0 : a.pre.length === 0 ? 1 : -1;
	for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
		if (a.pre[i] === undefined) return -1;
		if (b.pre[i] === undefined) return 1;
		if (a.pre[i] === b.pre[i]) continue;
		const an = /^\d+$/.test(a.pre[i]);
		const bn = /^\d+$/.test(b.pre[i]);
		if (an && bn) return compareNumericIdentifiers(a.pre[i], b.pre[i]);
		if (an !== bn) return an ? -1 : 1;
		return a.pre[i] < b.pre[i] ? -1 : 1;
	}
	return 0;
}

function compareNumericIdentifiers(left: string, right: string): number {
	if (left.length !== right.length) return left.length - right.length;
	return left === right ? 0 : left < right ? -1 : 1;
}

export function isPendingVersion(value: string): boolean {
	return parseSemVer(value) !== undefined;
}

type ReadResult =
	| { kind: 'missing' }
	| { kind: 'io' }
	| { kind: 'invalid' }
	| { kind: 'valid'; entries: Map<string, PendingUpdateEntry> };

/** Atomic v1 snapshot with `.pending` recovery and sibling corrupt quarantine. */
export class PendingUpdatesStore {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly adapter: PendingUpdatesAdapter,
		private readonly dir: string,
	) {}

	private serialize<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.queue.then(operation, operation);
		this.queue = result;
		return result;
	}

	private path(): string {
		return `${this.dir}/v1.json`;
	}

	load(): Promise<Map<string, PendingUpdateEntry>> {
		return this.serialize(async () => {
			const path = this.path();
			const pendingPath = `${path}.pending`;
			const pending = await this.readSnapshot(pendingPath);
			if (pending.kind === 'valid') {
				const canonical = await this.readSnapshot(path);
				try {
					if (canonical.kind === 'valid' || canonical.kind === 'invalid') await this.adapter.remove(path);
					if (canonical.kind === 'io') return pending.entries;
					await this.adapter.rename(pendingPath, path);
					if (canonical.kind === 'invalid') return pending.entries;
					return pending.entries;
				} catch {
					return canonical.kind === 'valid' ? canonical.entries : pending.entries;
				}
			}
			if (pending.kind === 'invalid') await this.quarantine(pendingPath);
			return this.readCanonical(path);
		});
	}

	persist(entries: Iterable<PendingUpdateEntry>): Promise<void> {
		const snapshot: PendingUpdatesFile = { schema: 1, entries: [...entries] };
		return this.serialize(async () => {
			if (!(await this.adapter.exists(this.dir))) await this.adapter.mkdir(this.dir);
			await this.replace(this.path(), JSON.stringify(snapshot));
		});
	}

	private async readCanonical(path: string): Promise<Map<string, PendingUpdateEntry>> {
		const result = await this.readSnapshot(path);
		if (result.kind === 'valid') return result.entries;
		if (result.kind === 'invalid') await this.quarantine(path);
		return new Map();
	}

	private async readSnapshot(path: string): Promise<ReadResult> {
		let exists: boolean;
		try {
			exists = await this.adapter.exists(path);
		} catch {
			return { kind: 'io' };
		}
		if (!exists) return { kind: 'missing' };
		let raw: string;
		try {
			raw = await this.adapter.read(path);
		} catch {
			return { kind: 'io' };
		}
		try {
			return { kind: 'valid', entries: this.parseSnapshot(raw) };
		} catch {
			return { kind: 'invalid' };
		}
	}

	private async quarantine(path: string): Promise<void> {
		try {
			await this.adapter.rename(path, `${this.dir}.corrupt-${Date.now()}`);
		} catch {
			// Malformed bytes remain recoverable if quarantine storage is unavailable.
		}
	}

	private async replace(path: string, content: string): Promise<void> {
		await this.adapter.write(`${path}.pending`, content);
		if (await this.adapter.exists(path)) await this.adapter.remove(path);
		await this.adapter.rename(`${path}.pending`, path);
	}

	private parseSnapshot(raw: string): Map<string, PendingUpdateEntry> {
		const value: unknown = JSON.parse(raw);
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new Error('Invalid pending-updates store');
		}
		const snapshot = value as { schema?: unknown; entries?: unknown };
		if (snapshot.schema !== 1) throw new Error('Unsupported pending-updates schema');
		if (!Array.isArray(snapshot.entries)) throw new Error('Invalid pending-updates entries');
		const record = new Map<string, PendingUpdateEntry>();
		for (const candidate of snapshot.entries) {
			const entry = validEntry(candidate);
			if (entry && !record.has(entry.id)) record.set(entry.id, entry);
		}
		return record;
	}
}

function validEntry(value: unknown): PendingUpdateEntry | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const candidate = value as Record<string, unknown>;
	const { id, pendingVersion, discoveredAt, checkId, schema } = candidate;
	if (typeof id !== 'string' || id.length === 0) return undefined;
	if (typeof pendingVersion !== 'string' || !isPendingVersion(pendingVersion)) return undefined;
	if (typeof discoveredAt !== 'number' || !Number.isFinite(discoveredAt) || discoveredAt <= 0) return undefined;
	if (typeof checkId !== 'number' || !Number.isFinite(checkId)) return undefined;
	if (schema !== 1) return undefined;
	return { id, pendingVersion, discoveredAt, checkId, schema: 1 };
}
