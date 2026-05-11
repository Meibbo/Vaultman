import type { VirtualFileState } from '../types/typeOps';

export type FmChangeKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface FmDelta {
	key: string;
	kind: FmChangeKind;
	before?: unknown;
	after?: unknown;
}

export interface BodyHunkLine {
	kind: 'ctx' | 'add' | 'del';
	text: string;
	lineNo?: number;
}

export interface BodyHunk {
	header: string;
	lines: BodyHunkLine[];
}

export interface FileDiff {
	path: string;
	newPath?: string;
	fmBefore: Record<string, unknown>;
	fmAfter: Record<string, unknown>;
	fmDeltas: FmDelta[];
	bodyBefore: string;
	bodyAfter: string;
	bodyChanged: boolean;
	opSummaries: Array<{ id: string; action: string; details: string }>;
}

export interface OperationDiffContext {
	path: string;
	opId: string;
}

function cloneFm(fm: Record<string, unknown>): Record<string, unknown> {
	const out = { ...fm };
	delete out['position']; // metadataCache artifact
	return out;
}

export function diffFm(
	fmBefore: Record<string, unknown>,
	fmAfter: Record<string, unknown>,
): FmDelta[] {
	const before = cloneFm(fmBefore);
	const after = cloneFm(fmAfter);
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	const deltas: FmDelta[] = [];
	for (const key of keys) {
		const b = before[key];
		const a = after[key];
		const bHas = key in before;
		const aHas = key in after;
		let kind: FmChangeKind;
		if (!bHas && aHas) kind = 'added';
		else if (bHas && !aHas) kind = 'removed';
		else if (JSON.stringify(b) !== JSON.stringify(a)) kind = 'changed';
		else kind = 'unchanged';
		deltas.push({ key, kind, before: b, after: a });
	}
	return deltas;
}

export function buildFileDiff(vfs: VirtualFileState): FileDiff {
	const fmBefore = cloneFm(vfs.fmInitial);
	const fmAfter = cloneFm(vfs.fm);
	return {
		path: vfs.originalPath,
		newPath: vfs.newPath,
		fmBefore,
		fmAfter,
		fmDeltas: diffFm(fmBefore, fmAfter),
		bodyBefore: vfs.bodyInitial,
		bodyAfter: vfs.body,
		bodyChanged: vfs.bodyInitial !== vfs.body,
		opSummaries: vfs.ops.map((op) => ({
			id: op.id,
			action: op.action,
			details: op.details,
		})),
	};
}

export function buildDiff(txs: Map<string, VirtualFileState>): FileDiff[] {
	return [...txs.values()].map(buildFileDiff);
}

function cloneState(vfs: VirtualFileState): VirtualFileState {
	return {
		file: vfs.file,
		originalPath: vfs.originalPath,
		newPath: undefined as string | undefined,
		fm: { ...cloneFm(vfs.fmInitial) },
		body: vfs.bodyInitial,
		ops: [],
		fmInitial: { ...cloneFm(vfs.fmInitial) },
		bodyInitial: vfs.bodyInitial,
		bodyLoaded: true,
	};
}

function applyOpSnapshot(vfs: VirtualFileState, op: VirtualFileState['ops'][number]): VirtualFileState {
	return op.apply({ ...vfs, ops: [...vfs.ops, op] });
}

export function buildOperationDiff(
	txs: Map<string, VirtualFileState>,
	context: OperationDiffContext,
): FileDiff | null {
	const vfs = txs.get(context.path);
	if (!vfs) return null;

	const opIndex = vfs.ops.findIndex((op) => op.id === context.opId);
	if (opIndex < 0) return null;

	const selectedOp = vfs.ops[opIndex];
	let before = cloneState(vfs);

	for (let i = 0; i < opIndex; i++) {
		before = applyOpSnapshot(before, vfs.ops[i]);
	}

	const after = applyOpSnapshot(before, selectedOp);

	const fmBefore = cloneFm(before.fm);
	const fmAfter = cloneFm(after.fm);

	return {
		path: vfs.originalPath,
		newPath: after.newPath,
		fmBefore,
		fmAfter,
		fmDeltas: diffFm(fmBefore, fmAfter),
		bodyBefore: before.body,
		bodyAfter: after.body,
		bodyChanged: before.body !== after.body,
		opSummaries: [
			{
				id: selectedOp.id,
				action: selectedOp.action,
				details: selectedOp.details,
			},
		],
	};
}

const BODY_HUNK_SIZE_LIMIT = 200_000;

/**
 * Line-based LCS diff → unified hunk output.
 * Returns a synthetic "too large" hunk when either side exceeds BODY_HUNK_SIZE_LIMIT.
 */
export function computeBodyHunks(before: string, after: string): BodyHunk[] {
	if (before === after) return [];

	if (Math.max(before.length, after.length) > BODY_HUNK_SIZE_LIMIT) {
		return [
			{
				header: `body modified (${before.length} → ${after.length} bytes, diff omitted)`,
				lines: [],
			},
		];
	}

	const aLines = before.split('\n');
	const bLines = after.split('\n');
	const lcs = lcsTable(aLines, bLines);
	const ops = backtrack(lcs, aLines, bLines, aLines.length, bLines.length);
	return collectHunks(ops, 3);
}

type LineOp = {
	kind: 'ctx' | 'add' | 'del';
	text: string;
	aIdx: number;
	bIdx: number;
};

function lcsTable(a: string[], b: string[]): number[][] {
	const n = a.length,
		m = b.length;
	const t: number[][] = [];
	for (let i = 0; i <= n; i++) {
		t.push(Array.from({ length: m + 1 }, () => 0));
	}
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
		}
	}
	return t;
}

function backtrack(t: number[][], a: string[], b: string[], i: number, j: number): LineOp[] {
	const out: LineOp[] = [];
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			out.push({ kind: 'ctx', text: a[i - 1], aIdx: i - 1, bIdx: j - 1 });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || t[i][j - 1] >= t[i - 1][j])) {
			out.push({ kind: 'add', text: b[j - 1], aIdx: i - 1, bIdx: j - 1 });
			j--;
		} else {
			out.push({ kind: 'del', text: a[i - 1], aIdx: i - 1, bIdx: j - 1 });
			i--;
		}
	}
	return out.reverse();
}

function collectHunks(ops: LineOp[], ctxLines: number): BodyHunk[] {
	const hunks: BodyHunk[] = [];
	let i = 0;
	while (i < ops.length) {
		// Find next non-ctx op
		while (i < ops.length && ops[i].kind === 'ctx') i++;
		if (i >= ops.length) break;
		const start = Math.max(0, i - ctxLines);
		// Find end of change block
		let end = i;
		while (end < ops.length) {
			if (ops[end].kind !== 'ctx') {
				end++;
				continue;
			}
			// Check if next ctxLines+1 are all ctx — then we can close the hunk
			let allCtx = true;
			for (let k = end; k < Math.min(end + ctxLines + 1, ops.length); k++) {
				if (ops[k].kind !== 'ctx') {
					allCtx = false;
					break;
				}
			}
			if (allCtx) break;
			end++;
		}
		const stop = Math.min(ops.length, end + ctxLines);
		const slice = ops.slice(start, stop);
		const aStart = slice.find((o) => o.aIdx >= 0)?.aIdx ?? 0;
		const bStart = slice.find((o) => o.bIdx >= 0)?.bIdx ?? 0;
		const aLen = slice.filter((o) => o.kind !== 'add').length;
		const bLen = slice.filter((o) => o.kind !== 'del').length;
		hunks.push({
			header: `@@ -${aStart + 1},${aLen} +${bStart + 1},${bLen} @@`,
			lines: slice.map((o) => ({
				kind: o.kind,
				text: o.text,
				lineNo: o.kind === 'add' ? o.bIdx + 1 : o.aIdx + 1,
			})),
		});
		i = stop;
	}
	return hunks;
}
