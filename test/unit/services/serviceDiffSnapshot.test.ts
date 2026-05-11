import { describe, expect, it } from 'vitest';
import { buildSnapshotDiff } from '../../../src/services/serviceDiffSnapshot';
import { VfsChain } from '../../../src/services/serviceVfsChain';
import type {
	ImmutableStagedOp,
	ImmutableVirtualFileState,
} from '../../../src/types/typeVfsImmutable';

function mkVfs(path = 'a.md'): ImmutableVirtualFileState {
	return {
		file: { path } as never,
		originalPath: path,
		fm: {},
		body: 'initial',
		ops: [],
		fmInitial: {},
		bodyInitial: 'initial',
		bodyLoaded: true,
	};
}

const setBody = (id: string, body: string): ImmutableStagedOp => ({
	id,
	kind: 'body-set',
	action: 'set-body',
	details: `→ ${body}`,
	apply: (vfs) => ({ ...vfs, body }),
});

const setFm = (id: string, key: string, value: unknown): ImmutableStagedOp => ({
	id,
	kind: 'fm-set',
	action: 'set-fm',
	details: `${key} = ${String(value)}`,
	apply: (vfs) => ({ ...vfs, fm: { ...vfs.fm, [key]: value } }),
});

describe('buildSnapshotDiff', () => {
	it('produces a FileDiff across two snapshot indices', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setBody('op1', 'first'));
		chain.appendOp(setBody('op2', 'second'));
		const d = buildSnapshotDiff({ path: 'a.md', chain, fromIndex: 0, toIndex: 2 });
		expect(d.bodyBefore).toBe('initial');
		expect(d.bodyAfter).toBe('second');
		expect(d.bodyChanged).toBe(true);
		expect(d.opSummaries.length).toBe(2);
	});

	it('captures frontmatter deltas', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setFm('op-fm', 'priority', 'high'));
		const d = buildSnapshotDiff({ path: 'a.md', chain, fromIndex: 0, toIndex: 1 });
		expect(d.fmDeltas.find((x) => x.key === 'priority')?.kind).toBe('added');
		expect(d.bodyChanged).toBe(false);
	});

	it('reports no body change when only fm changed', () => {
		const chain = new VfsChain(mkVfs());
		chain.appendOp(setFm('op-fm', 'x', 1));
		const d = buildSnapshotDiff({ path: 'a.md', chain, fromIndex: 0, toIndex: 1 });
		expect(d.bodyChanged).toBe(false);
	});
});
