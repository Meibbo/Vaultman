/** A physical member of a Files group, resolved from the vault index. */
export interface GroupFolderMember {
	path: string;
	kind: 'file' | 'folder';
}

export interface GroupFolderPlan {
	targetPath: string;
	moves: ReadonlyArray<{ from: string; to: string; kind: GroupFolderMember['kind'] }>;
}

export type GroupFolderPlanResult =
	| { ok: true; plan: GroupFolderPlan }
	| { ok: false; reason: string };

const normalize = (path: string): string => path.replace(/^\/+|\/+$/g, '');
const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1);
const unsafe = (path: string): boolean =>
	!path || path.split('/').some((part) => part === '.' || part === '..' || part === '');
const inside = (path: string, folder: string): boolean =>
	path === folder || path.startsWith(`${folder}/`);

/**
 * Freeze the physical move set before the confirmation preview. A selected
 * folder carries its complete subtree, so a separately listed descendant is
 * pruned. Two different sources with the same basename cannot coexist in the
 * new folder; refusing that case avoids either overwrite or silent renaming.
 */
export function planGroupToFolder(
	targetPath: string,
	members: readonly GroupFolderMember[],
): GroupFolderPlanResult {
	const target = normalize(targetPath);
	if (unsafe(target))
		return { ok: false, reason: 'invalid_target' };
	const unique = new Map<string, GroupFolderMember['kind']>();
	for (const member of members) {
		const path = normalize(member.path);
		if (unsafe(path))
			return { ok: false, reason: `invalid_member:${member.path}` };
		if (inside(target, path) || inside(path, target))
			return { ok: false, reason: `folder_cycle:${path}` };
		const previous = unique.get(path);
		if (previous && previous !== member.kind)
			return { ok: false, reason: `conflicting_kind:${path}` };
		unique.set(path, member.kind);
	}
	if (unique.size === 0) return { ok: false, reason: 'empty_group' };
	const folders = [...unique].filter(([, kind]) => kind === 'folder').map(([path]) => path);
	const roots = [...unique].filter(([path]) =>
		!folders.some((folder) => folder !== path && inside(path, folder)));
	const names = new Set<string>();
	const moves: GroupFolderPlan['moves'][number][] = [];
	for (const [from, kind] of roots) {
		const name = basename(from);
		if (names.has(name)) return { ok: false, reason: `duplicate_name:${name}` };
		names.add(name);
		moves.push({ from, to: `${target}/${name}`, kind });
	}
	return { ok: true, plan: { targetPath: target, moves } };
}

export interface GroupFolderAdapter {
	/** Return the current physical kind, or null when absent. */
	stat(path: string): GroupFolderMember['kind'] | null;
	createFolder(path: string): Promise<void>;
	move(from: string, to: string): Promise<void>;
	deleteEmptyFolder(path: string): Promise<void>;
}

export type GroupFolderExecution =
	| { ok: true }
	| { ok: false; reason: string; rollbackFailures: readonly string[] };

/** Execute the previewed plan as one recoverable operation. */
export async function executeGroupToFolder(
	plan: GroupFolderPlan,
	adapter: GroupFolderAdapter,
): Promise<GroupFolderExecution> {
	if (adapter.stat(plan.targetPath))
		return { ok: false, reason: `target_exists:${plan.targetPath}`, rollbackFailures: [] };
	for (const move of plan.moves) {
		if (adapter.stat(move.from) !== move.kind)
			return { ok: false, reason: `source_changed:${move.from}`, rollbackFailures: [] };
		if (adapter.stat(move.to))
			return { ok: false, reason: `target_exists:${move.to}`, rollbackFailures: [] };
	}
	const completed: GroupFolderPlan['moves'][number][] = [];
	let created = false;
	try {
		await adapter.createFolder(plan.targetPath);
		created = true;
		for (const move of plan.moves) {
			if (adapter.stat(move.from) !== move.kind)
				throw new Error(`source_changed:${move.from}`);
			if (adapter.stat(move.to))
				throw new Error(`target_exists:${move.to}`);
			try {
				await adapter.move(move.from, move.to);
				completed.push(move);
			} catch (moveError) {
				if (adapter.stat(move.to) === move.kind && adapter.stat(move.from) !== move.kind) {
					completed.push(move);
				}
				throw moveError;
			}
		}
		return { ok: true };
	} catch (error) {
		const rollbackFailures: string[] = [];
		for (const move of [...completed].reverse()) {
			try {
				await adapter.move(move.to, move.from);
			} catch (rollbackError) {
				rollbackFailures.push(`${move.to}: ${String(rollbackError)}`);
			}
		}
		if (created && rollbackFailures.length === 0) {
			try {
				await adapter.deleteEmptyFolder(plan.targetPath);
			} catch (rollbackError) {
				rollbackFailures.push(`${plan.targetPath}: ${String(rollbackError)}`);
			}
		}
		return { ok: false, reason: String(error), rollbackFailures };
	}
}
