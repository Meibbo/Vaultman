import type { DataAdapter } from 'obsidian';
import { normalizeLastOpenedRecord, type LastOpenedRecord } from '../logic/logicLastOpened';

export type OpeningEvent = { readonly path: string; readonly at: number };
export type OpenedHistoryAdapter = Pick<DataAdapter, 'exists' | 'read' | 'write' | 'rename' | 'mkdir' | 'remove' | 'rmdir' | 'list'>;

/** Immutable journal batches make a failed write safely retryable at the same path. */
export class OpenedHistoryStore {
	private queue: Promise<unknown> = Promise.resolve();
	private sequence = 0;
	private readonly writerId = crypto.getRandomValues(new Uint32Array(4)).join('-');
	private retryBatchPath: string | null = null;
	constructor(private readonly adapter: OpenedHistoryAdapter, private readonly root: string) {}

	private serialize<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.queue.then(operation, operation);
		this.queue = result;
		return result;
	}

	load(): Promise<LastOpenedRecord> {
		return this.serialize(async () => {
			// Finish a clear interrupted between its two stores before projecting old data.
			if (await this.adapter.exists(`${this.root}/opened-history-clear.json`)) await this.erase();
			const path = `${this.root}/last-opened.json`;
			const canonicalExists = await this.adapter.exists(path);
			const source = canonicalExists ? path : `${path}.pending`;
			if (!canonicalExists && !(await this.adapter.exists(source))) return {};
			const value: unknown = JSON.parse(await this.adapter.read(source));
			if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid last-opened store');
			const record = normalizeLastOpenedRecord(value);
			if (Object.keys(record).length !== Object.keys(value).length) throw new Error('Invalid last-opened entries');
			if (!canonicalExists) await this.adapter.rename(source, path);
			return record;
		});
	}

	persist(snapshot: string, events: readonly OpeningEvent[]): Promise<void> {
		// A batch keeps its identity across a retry; appending JSONL cannot offer that guarantee.
		const batchPath = events.length > 0 ? this.retryBatchPath ?? `${this.root}/opened-history/${Date.now()}-${String(this.sequence++).padStart(10, '0')}-${this.writerId}.json` : '';
		return this.serialize(async () => {
			try {
				if (events.length > 0) {
					const folder = `${this.root}/opened-history`;
					if (!(await this.adapter.exists(folder))) await this.adapter.mkdir(folder);
					await this.replace(batchPath, JSON.stringify(events));
				}
				await this.replace(`${this.root}/last-opened.json`, snapshot);
				this.retryBatchPath = null;
			} catch (error) {
				if (events.length > 0) this.retryBatchPath = batchPath;
				throw error;
			}
		});
	}

	private async replace(path: string, content: string): Promise<void> {
		await this.adapter.write(`${path}.pending`, content);
		// Obsidian rejects rename-overwrite. A completed pending file recovers
		// the brief canonical gap if the process stops between remove and rename.
		if (await this.adapter.exists(path)) await this.adapter.remove(path);
		await this.adapter.rename(`${path}.pending`, path);
	}

	clear(): Promise<void> {
		return this.serialize(async () => {
			await this.adapter.write(`${this.root}/opened-history-clear.json`, '{}');
			await this.erase();
		});
	}

	private async erase(): Promise<void> {
		this.retryBatchPath = null;
		await this.replace(`${this.root}/last-opened.json`, '{}');
		const folder = `${this.root}/opened-history`;
		if (await this.adapter.exists(folder)) await this.adapter.rmdir(folder, true);
		await this.adapter.remove(`${this.root}/opened-history-clear.json`);
	}

	/** The journal is never loaded or traversed by rendering or normal startup. */
	readHistory(): Promise<readonly OpeningEvent[]> {
		return this.serialize(async () => {
			const folder = `${this.root}/opened-history`;
			if (!(await this.adapter.exists(folder))) return [];
			const history: OpeningEvent[] = [];
			const { files } = await this.adapter.list(folder);
			const paths = new Set(files.filter((path) => path.endsWith('.json') || path.endsWith('.json.pending')).map((path) => path.replace(/\.pending$/, '')));
			for (const path of [...paths].sort()) {
				const canonicalExists = await this.adapter.exists(path);
				const source = canonicalExists ? path : `${path}.pending`;
				const batch: unknown = JSON.parse(await this.adapter.read(source));
				if (!Array.isArray(batch)) throw new Error('Invalid opening-history batch');
				const events: readonly unknown[] = batch;
				for (const event of events) {
					if (!event || typeof event !== 'object' || !('path' in event) || typeof event.path !== 'string' || !event.path || !('at' in event) || typeof event.at !== 'number' || !Number.isFinite(event.at) || event.at <= 0) throw new Error('Invalid opening-history event');
					history.push({ path: event.path, at: event.at });
				}
				if (!canonicalExists) await this.adapter.rename(source, path);
			}
			return history.sort((a, b) => a.at - b.at);
		});
	}
}
