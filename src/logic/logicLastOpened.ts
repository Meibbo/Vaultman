/**
 * BT5-013: the last instant Obsidian opened each file.
 *
 * The scope is deliberately one timestamp per path, not an event history, so
 * the store grows with the vault instead of with usage. Every function is
 * pure and returns a fresh record, which keeps the service layer free to
 * decide when a change is worth persisting.
 */
export type LastOpenedRecord = Readonly<Record<string, number>>;

function isValidTimestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** A folder path owns every entry below it, but never a same-prefixed sibling. */
function isInsideFolder(path: string, folderPath: string): boolean {
	return path.startsWith(`${folderPath}/`);
}

export function normalizeLastOpenedRecord(value: unknown): LastOpenedRecord {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const normalized: Record<string, number> = {};
	for (const [path, timestamp] of Object.entries(value)) {
		if (!path || !isValidTimestamp(timestamp)) continue;
		normalized[path] = timestamp;
	}
	return normalized;
}

export function lastOpenedAt(
	record: LastOpenedRecord,
	path: string,
): number | null {
	const timestamp = record[path];
	return isValidTimestamp(timestamp) ? timestamp : null;
}

export function withFileOpened(
	record: LastOpenedRecord,
	path: string,
	at: number,
): LastOpenedRecord {
	if (!path || !isValidTimestamp(at)) return record;
	return { ...record, [path]: at };
}

export function withRenamedPath(
	record: LastOpenedRecord,
	oldPath: string,
	newPath: string,
): LastOpenedRecord {
	if (!oldPath || !newPath || oldPath === newPath) return record;
	const migrated: Record<string, number> = {};
	for (const [path, timestamp] of Object.entries(record)) {
		if (path === oldPath) migrated[newPath] = timestamp;
		else if (isInsideFolder(path, oldPath)) {
			migrated[`${newPath}${path.slice(oldPath.length)}`] = timestamp;
		} else migrated[path] = timestamp;
	}
	return migrated;
}

export function withDeletedPath(
	record: LastOpenedRecord,
	path: string,
): LastOpenedRecord {
	if (!path) return record;
	const kept: Record<string, number> = {};
	for (const [candidate, timestamp] of Object.entries(record)) {
		if (candidate === path || isInsideFolder(candidate, path)) continue;
		kept[candidate] = timestamp;
	}
	return kept;
}

/** Startup hygiene: entries whose file vanished while the plugin was off. */
export function pruneMissingPaths(
	record: LastOpenedRecord,
	existingPaths: ReadonlySet<string>,
): LastOpenedRecord {
	const kept: Record<string, number> = {};
	for (const [path, timestamp] of Object.entries(record)) {
		if (!existingPaths.has(path)) continue;
		kept[path] = timestamp;
	}
	return kept;
}

/**
 * Never-opened sorts below every opened file, so the default descending order
 * reads "most recent first" and leaves the unopened tail stable.
 */
export function compareLastOpenedValues(
	left: number | null,
	right: number | null,
): number {
	return (left ?? 0) - (right ?? 0);
}

/** How many files were last opened at or after `sinceMs`. */
export function countOpenedSince(
	record: LastOpenedRecord,
	sinceMs: number,
): number {
	let count = 0;
	for (const timestamp of Object.values(record)) {
		if (isValidTimestamp(timestamp) && timestamp >= sinceMs) count += 1;
	}
	return count;
}

/**
 * BT5-090: recency for every folder, as the newest open of any file beneath
 * it. Opening `a/b/c.md` ages the folders `a` and `a/b`, so a recency sort can
 * float the branch that owns the just-opened file — a folder's "last opened"
 * is the most recent of its descendants.
 *
 * One pass over the opened files, bubbling each timestamp up its ancestor
 * chain, so the whole map costs O(entries x depth) rather than a scan per
 * folder. A folder with no opened descendant is simply absent, which reads as
 * "never opened" the same way an unopened file does.
 */
export function bubbleMaxToFolders(
	pairs: Iterable<readonly [string, number]>,
): Map<string, number> {
	const folders = new Map<string, number>();
	for (const [path, value] of pairs) {
		if (!isValidTimestamp(value)) continue;
		let slash = path.lastIndexOf('/');
		while (slash > 0) {
			const folder = path.slice(0, slash);
			const current = folders.get(folder);
			if (current === undefined || value > current) {
				folders.set(folder, value);
			} else {
				// An ancestor already holds a newer or equal descendant, so every
				// folder above it does too: stop climbing.
				break;
			}
			slash = folder.lastIndexOf('/');
		}
	}
	return folders;
}

export function buildFolderRecency(
	record: LastOpenedRecord,
): ReadonlyMap<string, number> {
	return bubbleMaxToFolders(Object.entries(record));
}

export function folderRecencyAt(
	folders: ReadonlyMap<string, number>,
	folderPath: string,
): number | null {
	const timestamp = folders.get(folderPath);
	return isValidTimestamp(timestamp) ? timestamp : null;
}

/** Local midnight for the day containing `at` (defaults to now). */
export function startOfDay(at: number = Date.now()): number {
	const date = new Date(at);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
}
