import type { NodeBadge } from '../types/typeTree';
import type { PendingChange } from '../types/typeOps';

function renameTargetForPath(
	change: PendingChange,
	path: string,
): string | undefined {
	if (change.type === 'snippet_rename') {
		if (change.sourcePath !== path) return undefined;
		return change.targetPath.split('/').pop() ?? change.targetPath;
	}
	if (change.type !== 'file_rename') return undefined;
	if (!change.files.some((file) => file.path === path)) return undefined;
	return change.newName;
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
