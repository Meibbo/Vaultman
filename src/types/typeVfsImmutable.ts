import type { TFile } from 'obsidian';

export interface ImmutableStagedOp {
	readonly id: string;
	readonly changeId?: string;
	readonly property?: string;
	readonly tag?: string;
	readonly kind: string;
	readonly action: string;
	readonly details: string;
	readonly apply: (vfs: ImmutableVirtualFileState) => ImmutableVirtualFileState;
}

export interface ImmutableVirtualFileState {
	readonly file: TFile;
	readonly originalPath: string;
	readonly newPath?: string;
	readonly deleted?: boolean;
	readonly fm: Readonly<Record<string, unknown>>;
	readonly body: string;
	readonly ops: ReadonlyArray<ImmutableStagedOp>;
	readonly fmInitial: Readonly<Record<string, unknown>>;
	readonly bodyInitial: string;
	readonly bodyLoaded: boolean;
}

const FROZEN_TAG = Symbol.for('vaultman.vfs.frozen');

export function freezeVfs(state: ImmutableVirtualFileState): ImmutableVirtualFileState {
	const fm = deepFreeze({ ...state.fm });
	const fmInitial = deepFreeze({ ...state.fmInitial });
	const ops = deepFreeze([...state.ops]);
	const tagged = { ...state, fm, fmInitial, ops, [FROZEN_TAG]: true } as unknown as ImmutableVirtualFileState;
	return Object.freeze(tagged);
}

export function isFrozenVfs(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<symbol, unknown>)[FROZEN_TAG] === true
	);
}

function deepFreeze<T>(value: T): T {
	if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
	for (const nested of Object.values(value as Record<string, unknown>)) {
		deepFreeze(nested);
	}
	return Object.freeze(value);
}
