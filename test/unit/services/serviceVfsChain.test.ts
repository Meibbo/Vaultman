import { describe, expect, it } from 'vitest';
import { VfsChain } from '../../../src/services/serviceVfsChain';
import type {
	ImmutableStagedOp,
	ImmutableVirtualFileState,
} from '../../../src/types/typeVfsImmutable';

function mkVfs(): ImmutableVirtualFileState {
	return {
		file: { path: 'a.md' } as never,
		originalPath: 'a.md',
		fm: {},
		body: 'initial',
		ops: [],
		fmInitial: {},
		bodyInitial: 'initial',
		bodyLoaded: true,
	};
}

function setBody(id: string, body: string): ImmutableStagedOp {
	return {
		id,
		kind: 'body-set',
		action: 'set-body',
		details: `→ ${body}`,
		apply: (vfs) => ({ ...vfs, body }),
	};
}

describe('VfsChain', () => {
	it('starts with initial as the head', () => {
		const chain = new VfsChain(mkVfs());
		expect(chain.head.body).toBe('initial');
		expect(chain.length).toBe(1);
	});

	it('appendOp produces a new snapshot', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setBody('op1', 'first'));
		expect(chain.length).toBe(2);
		expect(chain.head.body).toBe('first');
		expect(chain.snapshotAt(0).body).toBe('initial');
		expect(chain.snapshotAt(1).body).toBe('first');
	});

	it('snapshots are immutable references; no head mutation when walking', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setBody('op1', 'first'));
		chain.appendOp(setBody('op2', 'second'));
		const prev = chain.snapshotAt(1);
		const head = chain.head;
		expect(prev.body).toBe('first');
		expect(head.body).toBe('second');
		expect(prev).not.toBe(head);
	});

	it('rewind(n) truncates snapshots past n', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setBody('op1', 'first'));
		chain.appendOp(setBody('op2', 'second'));
		chain.rewind(1);
		expect(chain.length).toBe(2);
		expect(chain.head.body).toBe('first');
	});

	it('opAt returns the op that produced the snapshot at i (i > 0)', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setBody('op1', 'first'));
		expect(chain.opAt(1)?.id).toBe('op1');
		expect(chain.opAt(0)).toBeUndefined();
	});
});
