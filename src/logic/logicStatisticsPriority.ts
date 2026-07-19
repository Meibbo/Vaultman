export interface StatisticsPriorityFile {
	path: string;
	stat: { mtime: number };
}

/**
 * Explorer statistics are most useful when the rows on screen settle first.
 * Preserve the caller's visible-row order, then process the rest newest-first
 * with a deterministic path tie-breaker.
 */
export function prioritizeStatisticsFiles<T extends StatisticsPriorityFile>(
	files: readonly T[],
	priorityPaths: Iterable<string> = [],
): T[] {
	const priorityByPath = new Map<string, number>();
	for (const path of priorityPaths) {
		if (!priorityByPath.has(path)) {
			priorityByPath.set(path, priorityByPath.size);
		}
	}

	return [...files].sort((a, b) => {
		const aPriority = priorityByPath.get(a.path);
		const bPriority = priorityByPath.get(b.path);
		if (aPriority !== undefined || bPriority !== undefined) {
			if (aPriority === undefined) return 1;
			if (bPriority === undefined) return -1;
			return aPriority - bPriority;
		}

		const mtimeDifference = b.stat.mtime - a.stat.mtime;
		return mtimeDifference || a.path.localeCompare(b.path);
	});
}
