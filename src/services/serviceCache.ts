interface CacheEntry<V> {
	value: V;
	fingerprint: string;
}

export interface ServiceCacheOptions {
	maxEntries: number;
}

export class ServiceCache<K, V> {
	private readonly maxEntries: number;
	private readonly entries = new Map<K, CacheEntry<V>>();

	constructor(options: ServiceCacheOptions) {
		this.maxEntries = Math.max(1, options.maxEntries);
	}

	get(key: K, fingerprint: string): V | undefined {
		const entry = this.entries.get(key);
		if (!entry || entry.fingerprint !== fingerprint) return undefined;
		this.entries.delete(key);
		this.entries.set(key, entry);
		return entry.value;
	}

	set(key: K, value: V, fingerprint: string): void {
		this.entries.delete(key);
		this.entries.set(key, { value, fingerprint });
		while (this.entries.size > this.maxEntries) {
			const oldest = this.entries.keys().next();
			if (oldest.done) return;
			this.entries.delete(oldest.value);
		}
	}
}
