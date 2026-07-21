/**
 * BT5-023 / BT5-024: safe projection of Obsidian commands as Vaultman actions.
 *
 * Everything resolves by stable command id at invoke time. Vaultman never
 * copies a command's callback or label into its own state, so a command that
 * is retired or disabled degrades to a repairable, explicit state instead of
 * failing silently or executing something stale.
 */

/** The subset of Obsidian's `Command` this module needs, kept App-free. */
export interface CommandDescriptor {
	id: string;
	name: string;
	icon?: string;
}

/** Sentinel meaning "run Vaultman's own built-in action", not a command id. */
export const VAULTMAN_DEFAULT_COMMAND = 'vaultman-default';

export interface ResolvedCommandAction {
	id: string;
	/** Label from the live registry, or the raw id when the command is gone. */
	label: string;
	icon?: string;
	/** False when the id is not (or no longer) a registered command. */
	available: boolean;
}

export function isVaultmanDefault(id: string | null | undefined): boolean {
	return !id || id === VAULTMAN_DEFAULT_COMMAND;
}

export function resolveCommandAction(
	commands: readonly CommandDescriptor[],
	id: string,
): ResolvedCommandAction {
	const match = commands.find((command) => command.id === id);
	if (match) {
		return {
			id: match.id,
			label: match.name,
			available: true,
			...(match.icon ? { icon: match.icon } : {}),
		};
	}
	// Retired or from a disabled plugin: keep it visible and repairable.
	return { id, label: id, available: false };
}

/**
 * Dedupe an ordered list of command ids, dropping empties and the default
 * sentinel, preserving first-seen order. The projection is stable so a saved
 * toolbar command list never reorders itself on load.
 */
export function normalizeCommandIds(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of value) {
		if (typeof raw !== 'string') continue;
		const id = raw.trim();
		if (!id || id === VAULTMAN_DEFAULT_COMMAND || seen.has(id)) continue;
		seen.add(id);
		result.push(id);
	}
	return result;
}

/** Resolve a whole saved list against the live registry, order preserved. */
export function resolveCommandActions(
	commands: readonly CommandDescriptor[],
	ids: readonly string[],
): ResolvedCommandAction[] {
	return normalizeCommandIds(ids).map((id) => resolveCommandAction(commands, id));
}

/** Add a command id to a list without creating a duplicate. */
export function addCommandId(
	ids: readonly string[],
	id: string,
): string[] {
	return normalizeCommandIds([...ids, id]);
}

export function removeCommandId(
	ids: readonly string[],
	id: string,
): string[] {
	return normalizeCommandIds(ids).filter((candidate) => candidate !== id);
}

/** Drag-and-drop reorder by moving `movedId` to where `targetId` sits. */
export function reorderCommandIds(
	ids: readonly string[],
	movedId: string,
	targetId: string,
): string[] {
	const normalized = normalizeCommandIds(ids);
	if (movedId === targetId || !normalized.includes(movedId)) return normalized;
	const without = normalized.filter((id) => id !== movedId);
	const targetIndex = without.indexOf(targetId);
	if (targetIndex < 0) return normalized;
	without.splice(targetIndex, 0, movedId);
	return without;
}
