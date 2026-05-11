import { describe, it, expect } from 'vitest';
import {
	diffFm,
	buildFileDiff,
	buildOperationDiff,
	computeBodyHunks,
} from '../../../src/services/serviceDiff';
import type { VirtualFileState, StagedOp } from '../../../src/types/typeOps';
import { mockTFile } from '../../helpers/obsidian-mocks';

function vfs(partial: Partial<VirtualFileState>): VirtualFileState {
	const file = mockTFile('a.md');
	const base: VirtualFileState = {
		file,
		originalPath: 'a.md',
		newPath: undefined,
		fm: { x: 1 },
		body: 'before',
		ops: [],
		fmInitial: { x: 1 },
		bodyInitial: 'before',
		bodyLoaded: true,
	};
	return { ...base, ...partial };
}

function op(id: string, apply: (v: VirtualFileState) => VirtualFileState): StagedOp {
	return { id, kind: 'set_prop', action: 'set', details: '', apply };
}

describe('diffFm', () => {
	it('classifies added / removed / changed / unchanged', () => {
		const deltas = diffFm({ a: 1, b: 2, c: 3 }, { b: 2, c: 9, d: 4 });
		const map = Object.fromEntries(deltas.map((d) => [d.key, d.kind]));
		expect(map.a).toBe('removed');
		expect(map.b).toBe('unchanged');
		expect(map.c).toBe('changed');
		expect(map.d).toBe('added');
	});

	it('strips the synthetic position key', () => {
		const deltas = diffFm({ position: { start: 0 } }, {});
		expect(deltas).toHaveLength(0);
	});
});

describe('buildFileDiff', () => {
	it('produces a snapshot of fm + body + op summaries', () => {
		const v = vfs({
			fm: { x: 2 },
			body: 'after',
			ops: [op('o1', () => {}), op('o2', () => {})],
		});
		const diff = buildFileDiff(v);
		expect(diff.fmDeltas.find((d) => d.key === 'x')?.kind).toBe('changed');
		expect(diff.bodyChanged).toBe(true);
		expect(diff.opSummaries.map((o) => o.id)).toEqual(['o1', 'o2']);
	});
});

describe('buildOperationDiff', () => {
	it('returns null when path is missing', () => {
		const txs = new Map<string, VirtualFileState>();
		expect(buildOperationDiff(txs, { path: 'missing', opId: 'x' })).toBeNull();
	});

	it('returns null when opId is unknown', () => {
		const v = vfs({ ops: [op('o1', () => {})] });
		const txs = new Map([[v.originalPath, v]]);
		expect(buildOperationDiff(txs, { path: v.originalPath, opId: 'nope' })).toBeNull();
	});

	it('isolates a single op by replaying earlier ops + applying selected op', () => {
		const v = vfs({
			fm: { x: 1, y: 2 },
			fmInitial: { x: 1 },
			ops: [
				op('o1', (s) => ({
					...s,
					fm: { ...s.fm, helper: 1 },
				})),
				op('o2', (s) => {
					const { helper: _helper, ...fm } = s.fm;
					return {
						...s,
						fm: { ...fm, y: 2 },
					};
				}),
			],
		});
		const txs = new Map([[v.originalPath, v]]);
		const diff = buildOperationDiff(txs, { path: v.originalPath, opId: 'o2' });
		expect(diff).not.toBeNull();
		expect(diff!.fmDeltas.find((d) => d.key === 'y')?.kind).toBe('added');
		expect(diff!.fmDeltas.find((d) => d.key === 'helper')?.kind).toBe('removed');
	});
});

describe('computeBodyHunks', () => {
	it('returns no hunks when input is identical', () => {
		expect(computeBodyHunks('a\nb\nc', 'a\nb\nc')).toEqual([]);
	});

	it('emits a single hunk header for short replacements', () => {
		const hunks = computeBodyHunks('a\nb\nc', 'a\nB\nc');
		expect(hunks).toHaveLength(1);
		expect(hunks[0].lines.find((l) => l.kind === 'add')?.text).toBe('B');
		expect(hunks[0].lines.find((l) => l.kind === 'del')?.text).toBe('b');
	});

	it('omits the diff when content exceeds the body-size limit', () => {
		const big = 'x'.repeat(300_000);
		const hunks = computeBodyHunks(big, big + 'y');
		expect(hunks).toHaveLength(1);
		expect(hunks[0].header).toContain('diff omitted');
	});
});
