import {
	freezeVfs,
	type ImmutableStagedOp,
	type ImmutableVirtualFileState,
} from '../types/typeVfsImmutable';

export class VfsChain {
	private _snapshots: ImmutableVirtualFileState[];
	private _ops: ImmutableStagedOp[] = [];

	constructor(initial: ImmutableVirtualFileState) {
		this._snapshots = [freezeVfs(initial)];
	}

	get head(): ImmutableVirtualFileState {
		return this._snapshots[this._snapshots.length - 1];
	}

	get length(): number {
		return this._snapshots.length;
	}

	get ops(): readonly ImmutableStagedOp[] {
		return this._ops;
	}

	snapshotAt(index: number): ImmutableVirtualFileState {
		if (index < 0 || index >= this._snapshots.length) {
			throw new RangeError(
				`snapshotAt: ${index} out of range [0, ${this._snapshots.length - 1}]`,
			);
		}
		return this._snapshots[index];
	}

	opAt(index: number): ImmutableStagedOp | undefined {
		if (index <= 0) return undefined;
		return this._ops[index - 1];
	}

	appendOp(op: ImmutableStagedOp): ImmutableVirtualFileState {
		const input = freezeVfs({ ...this.head, ops: [...this.head.ops, op] });
		const next = freezeVfs(op.apply(input));
		this._snapshots.push(next);
		this._ops.push(op);
		return next;
	}

	rewind(toIndex: number): void {
		if (toIndex < 0 || toIndex >= this._snapshots.length) {
			throw new RangeError(`rewind: ${toIndex} out of range`);
		}
		this._snapshots = this._snapshots.slice(0, toIndex + 1);
		this._ops = this._ops.slice(0, toIndex);
	}
}
