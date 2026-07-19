const RELEASE_VERSION_PATTERN =
	/^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/;
const UPDATES_REPOSITORY_URL = 'https://github.com/Meibbo/Vaultman';

export function updatesAnchorForVersion(version: string): string {
	const normalized = version.trim();
	if (!RELEASE_VERSION_PATTERN.test(normalized)) {
		throw new Error(`Invalid release version: ${version}`);
	}
	return `v${normalized.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`;
}

export function updatesUrlForVersion(version: string): string {
	const normalized = version.trim();
	const anchor = updatesAnchorForVersion(normalized);
	return `${UPDATES_REPOSITORY_URL}/blob/${encodeURIComponent(normalized)}/docs/whats-new.md#${anchor}`;
}

/** Open the trusted, tag-pinned bulletin only from an explicit user action. */
export function openUpdatesBulletin(
	version: string,
	doc: Document = activeDocument,
): void {
	const link = doc.createElement('a');
	link.href = updatesUrlForVersion(version);
	link.target = '_blank';
	link.rel = 'noopener noreferrer';
	link.hidden = true;
	doc.body.appendChild(link);
	try {
		link.click();
	} finally {
		link.remove();
	}
}

export function shouldShowUpdates(
	lastSeenVersion: string | undefined,
	currentVersion: string,
): boolean {
	const current = currentVersion.trim();
	return current.length > 0 && lastSeenVersion !== current;
}
