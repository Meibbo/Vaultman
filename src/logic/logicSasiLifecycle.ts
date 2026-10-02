import { SASI_LIFECYCLE_CATALOGUE } from './logicSasiLifecycleCatalogue';

export interface SasiLifecycle {
	readonly createdAt: number;
	readonly updatedAt: number;
	readonly source: string;
	/** Update precision is the implementation module, not a claimed per-line behavioral history. */
	readonly precision: 'definition' | 'declaration-module';
}

export function sasiLifecycleFor(id: string): SasiLifecycle | undefined {
	const exact = SASI_LIFECYCLE_CATALOGUE[id];
	if (exact) return exact;
	const prefix = Object.keys(SASI_LIFECYCLE_CATALOGUE)
		.filter((key) => key.endsWith('.') && id.startsWith(key))
		.sort((a, b) => b.length - a.length)[0];
	return prefix ? SASI_LIFECYCLE_CATALOGUE[prefix] : undefined;
}
