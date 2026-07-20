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
