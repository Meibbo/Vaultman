// Snapshot-based diff layer for the immutable VFS.
// Coexists with serviceDiff.ts (mutable / legacy). Both surfaces share the
// FileDiff shape so viewDiff.svelte can consume either source.

import type { VfsChain } from './serviceVfsChain';
import { diffFm, type FileDiff } from './serviceDiff';

export interface SnapshotDiffContext {
	path: string;
	chain: VfsChain;
	fromIndex: number;
	toIndex: number;
}

export function buildSnapshotDiff(ctx: SnapshotDiffContext): FileDiff {
	const before = ctx.chain.snapshotAt(ctx.fromIndex);
	const after = ctx.chain.snapshotAt(ctx.toIndex);
	const fmBefore = { ...before.fm };
	const fmAfter = { ...after.fm };
	return {
		path: before.originalPath,
		newPath: after.newPath,
		fmBefore,
		fmAfter,
		fmDeltas: diffFm(fmBefore, fmAfter),
		bodyBefore: before.body,
		bodyAfter: after.body,
		bodyChanged: before.body !== after.body,
		opSummaries: collectOpSummariesBetween(ctx.chain, ctx.fromIndex, ctx.toIndex),
	};
}

function collectOpSummariesBetween(
	chain: VfsChain,
	from: number,
	to: number,
): Array<{ id: string; action: string; details: string }> {
	const out: Array<{ id: string; action: string; details: string }> = [];
	for (let i = from + 1; i <= to; i++) {
		const op = chain.opAt(i);
		if (op) out.push({ id: op.id, action: op.action, details: op.details });
	}
	return out;
}
