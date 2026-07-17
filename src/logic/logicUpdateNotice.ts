export const CURRENT_UPDATES_VERSION = '1.2.0-beta.2';

export function shouldShowUpdates(
	lastSeenVersion: string | undefined,
	currentVersion: string,
): boolean {
	const current = currentVersion.trim();
	return current.length > 0 && lastSeenVersion !== current;
}
