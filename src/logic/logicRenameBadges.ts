import type { NodeBadge } from '../types/typeTree';
import type { PendingChange } from '../types/typeOps';

export function renameTargetForPath(
	change: PendingChange,
	path: string,
): string | undefined {
	if (change.type === 'snippet_rename') {
		if (change.sourcePath !== path) return undefined;
		return change.targetPath.split('/').pop() ?? change.targetPath;
	}
	if (change.type === 'tag' && change.action === 'rename') {
		if (change.tag !== path) return undefined;
		const match = change.details.match(/to "#(.*?)"/);
		return match ? match[1] : undefined;
	}
	if (change.type === 'property' && change.action === 'rename') {
		if (change.oldValue !== undefined) {
			if (path !== `${change.property}::${change.oldValue}`) return undefined;
			return change.value;
		} else {
			if (change.property !== path) return undefined;
			const match = change.details?.match(/→ "(.*?)"/);
			return match ? match[1] : undefined;
		}
	}
	if (change.type !== 'file_rename') return undefined;
	if (!change.files.some((file) => file.path === path)) return undefined;
	return change.newName;
}

export function renameTargetFromQueue(
	queue: readonly PendingChange[],
	path: string,
): string | undefined {
	for (const change of queue) {
		const target = renameTargetForPath(change, path);
		if (target) return target;
	}
	return undefined;
}

/**
 * Índice de la staged op que un preview de fecha puede sustituir al
 * editarse (-1 si no hay). Misma coincidencia que el preview.
 */
export function findStagedRenameIndex(
	queue: readonly PendingChange[],
	path: string,
): number {
	for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
		if (renameTargetForPath(queue[queueIndex], path)) return queueIndex;
	}
	return -1;
}

export function queuedRenameBadgeForPath(
	queue: readonly PendingChange[],
	path: string,
): NodeBadge | undefined {
	for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
		const target = renameTargetForPath(queue[queueIndex], path);
		if (!target) continue;
		return {
			text: `Rename to ${target}`,
			icon: 'lucide-pencil',
			color: 'blue',
			queueIndex,
		};
	}
	return undefined;
}
