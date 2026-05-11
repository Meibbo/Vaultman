import { describe, expect, it } from 'vitest';
import { buildMoveBlockOps } from '../../../src/services/serviceDnd';
import type { ImmutableVirtualFileState } from '../../../src/types/typeVfsImmutable';

function mkVfs(path: string, body: string): ImmutableVirtualFileState {
	return {
		file: { path } as never,
		originalPath: path,
		fm: {},
		body,
		ops: [],
		fmInitial: {},
		bodyInitial: body,
		bodyLoaded: true,
	};
}

describe('buildMoveBlockOps', () => {
	it('removes the block line from source and appends it to target', () => {
		const from = mkVfs('a.md', 'line0\n^myblock\nline2');
		const to = mkVfs('b.md', 'target');

		const { fromOp, toOp } = buildMoveBlockOps({
			fromVfs: from,
			toVfs: to,
			blockId: 'myblock',
			blockLine: 1,
		});

		expect(fromOp.apply(from).body).toBe('line0\nline2');
		expect(toOp.apply(to).body).toBe('target\n^myblock');
	});
});
