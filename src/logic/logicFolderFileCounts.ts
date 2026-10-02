/** Counts descendant files without retaining per-file path data. */
export function folderFileCounts(files: readonly { readonly path: string }[]): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();
	for (const file of files) {
		for (let end = file.path.lastIndexOf('/'); end > 0;
			end = file.path.lastIndexOf('/', end - 1)) {
			const path = file.path.slice(0, end);
			counts.set(path, (counts.get(path) ?? 0) + 1);
		}
	}
	return counts;
}
