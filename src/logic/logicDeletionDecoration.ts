import type { PendingChange } from '../types/typeOps';
import type { NodeBadge } from '../types/typeTree';

/**
 * U121-071: every scene used to decide on its own what "this node is being
 * deleted" meant, and no two agreed. Files matched by TFile path and skipped
 * folders entirely, Props inferred a property-wide delete from the ABSENCE of a
 * `value` key, and Tags cascaded onto nested tags that their own `logicFunc`
 * never touches. This module is the single answer. It stays pure -- no DOM, no
 * Obsidian runtime -- so the unified panelExplorer can adopt it without
 * dragging a renderer along.
 */

export type DeletionSubject =
	| { kind: 'file'; path: string }
	| { kind: 'folder'; path: string }
	| { kind: 'prop'; property: string }
	| { kind: 'value'; property: string; rawValue: string | undefined }
	| { kind: 'tag'; tagPath: string }
	| { kind: 'snippet'; name: string }
	| { kind: 'plugin'; pluginId: string };

export interface DeletionMatch {
	/** Index in the live queue, so the badge can address its own operation. */
	queueIndex: number;
	/** The operation's own copy, for the tooltip. Never the badge text. */
	details: string;
	/**
	 * U121-073: set when this node is doomed by an ANCESTOR's deletion rather
	 * than by an operation that names it. Its badge then releases this node and
	 * its subtree instead of cancelling the whole folder delete.
	 */
	releasePath?: string;
}

/** One icon and one word for deletion, in every scene (U121-071 rule 4). */
export const DELETION_BADGE_ICON = 'lucide-trash-2';
export const DELETION_BADGE_TEXT = 'Delete';

type PropertyChangeLike = Extract<PendingChange, { type: 'property' }>;

/**
 * A property-wide delete names no value; a value delete names its target in
 * BOTH `value` and `oldValue` (U121-072). Before that fix a value delete named
 * its target only inside the free-text `details`, so it was indistinguishable
 * from a property-wide one and the whole property went grey.
 */
function isPropertyWideDelete(change: PropertyChangeLike): boolean {
	return (
		change.action === 'delete' &&
		change.value === undefined &&
		change.oldValue === undefined
	);
}

function namesValue(
	change: PropertyChangeLike,
	rawValue: string | undefined,
): boolean {
	if (rawValue === undefined) return false;
	return change.value === rawValue || change.oldValue === rawValue;
}

/** A path reaches itself and everything nested under it. */
export function pathReaches(ancestor: string, path: string): boolean {
	return path === ancestor || path.startsWith(`${ancestor}/`);
}

function excludedPathsOf(change: PendingChange): readonly string[] {
	const value = (change as { excludedPaths?: string[] }).excludedPaths;
	return Array.isArray(value) ? value : [];
}

/** U121-073: a released node, and its subtree, are no longer doomed. */
function isReleased(change: PendingChange, path: string): boolean {
	return excludedPathsOf(change).some((excluded) => pathReaches(excluded, path));
}

function parentPathOf(path: string): string {
	const cut = path.lastIndexOf('/');
	return cut < 0 ? '' : path.slice(0, cut);
}

export interface PromotionMove {
	from: string;
	to: string;
}

/**
 * U121-073: releasing a node from a folder deletion cannot leave it where it
 * is -- its ancestors are going away with the folder. It rises to the nearest
 * level that survives, which is the deleted folder's own parent.
 *
 * Only TOP-LEVEL releases move. If both `a/b` and `a/b/c` are released then
 * `a/b` survives, so `c` belongs inside it and must not be promoted past it.
 */
export function promotionPlan(
	targetFolder: string,
	excludedPaths: readonly string[],
): PromotionMove[] {
	const destination = parentPathOf(targetFolder);
	const moves: PromotionMove[] = [];
	for (const path of excludedPaths) {
		const hasReleasedAncestor = excludedPaths.some(
			(other) => other !== path && pathReaches(other, path),
		);
		if (hasReleasedAncestor) continue;
		const name = path.slice(path.lastIndexOf('/') + 1);
		moves.push({ from: path, to: destination ? `${destination}/${name}` : name });
	}
	return moves;
}

function targetFolderOf(change: PendingChange): string | undefined {
	const value = (change as { targetFolder?: string }).targetFolder;
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function changeDeletes(
	change: PendingChange,
	subject: DeletionSubject,
): boolean {
	switch (subject.kind) {
		case 'file':
			return (
				change.type === 'file_delete' &&
				change.files.some((file) => file.path === subject.path) &&
				!isReleased(change, subject.path)
			);
		case 'folder': {
			if (change.type !== 'file_delete') return false;
			const targetFolder = targetFolderOf(change);
			return (
				targetFolder !== undefined &&
				pathReaches(targetFolder, subject.path) &&
				!isReleased(change, subject.path)
			);
		}
		case 'prop':
			return (
				change.type === 'property' &&
				change.property === subject.property &&
				isPropertyWideDelete(change)
			);
		case 'value':
			if (change.type !== 'property') return false;
			if (change.property !== subject.property) return false;
			if (change.action !== 'delete') return false;
			// Deleting the property takes its values with it; deleting one
			// value takes only that one.
			return (
				isPropertyWideDelete(change) || namesValue(change, subject.rawValue)
			);
		case 'tag':
			// Exact match on purpose: `_deleteTag` filters tags by equality, so
			// nested tags survive and must not be decorated as doomed
			// (U121-074).
			return (
				change.type === 'tag' &&
				change.action === 'delete' &&
				change.tag === subject.tagPath
			);
		case 'snippet':
			return (
				change.type === 'snippet_delete' && change.name === subject.name
			);
		case 'plugin':
			return (
				change.type === 'plugin_uninstall' &&
				change.pluginId === subject.pluginId
			);
	}
}

/**
 * The first queued operation that deletes this subject, or null. First rather
 * than any, so the badge points at the operation the user would cancel.
 */
export function findDeletionMatch(
	subject: DeletionSubject,
	queue: readonly PendingChange[],
): DeletionMatch | null {
	for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
		const change = queue[queueIndex];
		if (changeDeletes(change, subject)) {
			const targetFolder = targetFolderOf(change);
			const isDescendant =
				(subject.kind === 'file' || subject.kind === 'folder') &&
				targetFolder !== undefined &&
				targetFolder !== subject.path;
			return {
				queueIndex,
				details: change.details,
				...(isDescendant ? { releasePath: subject.path } : {}),
			};
		}
	}
	return null;
}

/** Does the queue, as it stands, delete this subject when it is processed? */
export function queueDeletesSubject(
	subject: DeletionSubject,
	queue: readonly PendingChange[],
): boolean {
	return findDeletionMatch(subject, queue) !== null;
}

/**
 * The badge every scene shows for a queued deletion. `details` goes to the
 * tooltip, never into the badge text: Files used to render the whole sentence
 * inside the pill (U121-073).
 */
export function deletionBadge(
	match: DeletionMatch,
	options: { solid?: boolean } = {},
): NodeBadge {
	return {
		text: DELETION_BADGE_TEXT,
		icon: DELETION_BADGE_ICON,
		color: 'red',
		tooltip: match.details,
		queueIndex: match.queueIndex,
		...(match.releasePath !== undefined
			? { releasePath: match.releasePath }
			: {}),
		...(options.solid === true ? { solid: true } : {}),
	};
}
