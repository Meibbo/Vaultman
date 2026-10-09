/**
 * U130 native FileExplorer DnD adapter (pure logic, no DOM).
 *
 * Mirrors the Obsidian 1.14.4 explorer lifecycle so Vaultman can ride the
 * native DragManager instead of planting `draggable` by hand:
 * - source: `dragFile` / `dragFolder` / `dragFiles` then native `onDragStart`
 *   (ghost, `is-grabbing`, source highlight, edge-scroll, cleanup come free).
 * - target: folder rows + root container only; file rows are never targets.
 * - validation: `FI` self/descendant guard, `RI` descendant prune,
 *   same-parent no-op, whole-path (folder) vs ext-split (file) collisions.
 * - hover: native 750ms collapsed-folder expansion through an owner callback.
 *
 * Native offsets point at `tmp-vanilla-1.14.4/app.js` / `app.css`.
 * Tag/property drop language stays outside this Files adapter on purpose.
 */

export const NATIVE_EXPLORER_SOURCE = 'file-explorer';
export const NATIVE_EXPLORER_HOVER_CLASS = 'is-being-dragged-over';
export const NATIVE_EXPLORER_HOVER_EXPAND_MS = 750;

export interface NativeExplorerDndSource {
	kind: 'file' | 'folder';
	path: string;
}

export type NativeSourceDragCall = 'dragFile' | 'dragFolder' | 'dragFiles';

export interface NativeSourceDragOptions {
	/** Native `fileBeingRenamed` guard: a renaming row starts no drag. */
	isRenaming?: boolean;
}

/**
 * Which native DragManager source call owns this dragstart. Returns null
 * when native would yield null (rename in progress, empty selection).
 * The caller MUST then run the native `onDragStart` path (via
 * `handleDrag`/`onDragStartGlobal`) — never assign `draggable` directly.
 */
export function selectNativeSourceDragCall(
	sources: readonly NativeExplorerDndSource[],
	options: NativeSourceDragOptions = {},
): NativeSourceDragCall | null {
	if (options.isRenaming === true || sources.length === 0) return null;
	if (sources.length === 1) {
		return sources[0].kind === 'folder' ? 'dragFolder' : 'dragFile';
	}
	return 'dragFiles';
}

export interface ExplorerDropTargetInput {
	isFolderRow: boolean;
	folderPath: string;
	isRootContainer: boolean;
}

/**
 * Folder rows resolve to their path, the root container to `''`.
 * File rows are never targets — there is no depth-0 file-row-as-root alias.
 */
export function resolveExplorerDropTarget(
	input: ExplorerDropTargetInput,
): string | null {
	if (input.isRootContainer) return '';
	return input.isFolderRow ? input.folderPath : null;
}

/** Native `FI` gate: identity plus folder-into-own-descendant. */
export function isValidExplorerMove(
	source: NativeExplorerDndSource,
	targetFolderPath: string,
): boolean {
	if (source.path.length === 0 || source.path === targetFolderPath) return false;
	if (
		source.kind === 'folder' &&
		targetFolderPath.startsWith(`${source.path}/`)
	) {
		return false;
	}
	return true;
}

/** Native `RI` prune: drop sources nested under another dragged folder. */
export function pruneNestedExplorerSources(
	sources: readonly NativeExplorerDndSource[],
): NativeExplorerDndSource[] {
	return sources.filter((source) => {
		for (const other of sources) {
			if (
				other !== source &&
				other.kind === 'folder' &&
				source.path.startsWith(`${other.path}/`)
			) {
				return false;
			}
		}
		return true;
	});
}

export interface ExplorerMoveItem {
	from: string;
	kind: 'file' | 'folder';
}

export interface ExplorerMovePlan {
	moves: ExplorerMoveItem[];
	skippedSameParent: string[];
	skippedInvalid: string[];
}

/**
 * One commit plan per drop: pruned, validated, same-parent no-ops reported
 * instead of executed. The caller commits each move exactly once (see the
 * commit ledger) through the queued-change policy, never bare `renameFile`.
 */
export function planExplorerMoves(
	sources: readonly NativeExplorerDndSource[],
	targetFolderPath: string,
	parentPathOf: (path: string) => string | null,
): ExplorerMovePlan {
	const plan: ExplorerMovePlan = {
		moves: [],
		skippedSameParent: [],
		skippedInvalid: [],
	};
	for (const source of pruneNestedExplorerSources(sources)) {
		if (!isValidExplorerMove(source, targetFolderPath)) {
			plan.skippedInvalid.push(source.path);
			continue;
		}
		if (parentPathOf(source.path) === targetFolderPath) {
			plan.skippedSameParent.push(source.path);
			continue;
		}
		plan.moves.push({ from: source.path, kind: source.kind });
	}
	return plan;
}

/**
 * Native `getAvailablePath` parity: folders resolve whole-path
 * (`Notes/Sub` → `Notes/Sub 1`), files split the extension
 * (`Notes/a.md` → `Notes/a 1.md`).
 */
export function resolveExplorerMovePath(
	desiredPath: string,
	isFolder: boolean,
	exists: (path: string) => boolean,
): string {
	if (!exists(desiredPath)) return desiredPath;
	if (isFolder) {
		for (let n = 1; n < 10000; n += 1) {
			const candidate = `${desiredPath} ${n}`;
			if (!exists(candidate)) return candidate;
		}
		return `${desiredPath} ${Date.now()}`;
	}
	const slash = desiredPath.lastIndexOf('/');
	const dir = slash >= 0 ? `${desiredPath.slice(0, slash)}/` : '';
	const name = slash >= 0 ? desiredPath.slice(slash + 1) : desiredPath;
	const dot = name.lastIndexOf('.');
	const hasExtension = dot > 0;
	const base = hasExtension ? name.slice(0, dot) : name;
	const ext = hasExtension ? name.slice(dot) : '';
	for (let n = 1; n < 10000; n += 1) {
		const candidate = `${dir}${base} ${n}${ext}`;
		if (!exists(candidate)) return candidate;
	}
	return `${dir}${base} ${Date.now()}${ext}`;
}

export type ExplorerDropEffect = 'copy' | 'link' | 'move' | 'none';

const EFFECT_ALLOWANCE: Record<string, readonly ExplorerDropEffect[]> = {
	none: [],
	copy: ['copy'],
	copyLink: ['copy', 'link'],
	copyMove: ['copy', 'move'],
	link: ['link'],
	linkMove: ['link', 'move'],
	move: ['move'],
	all: ['copy', 'link', 'move'],
	uninitialized: [],
};

/** Native `DR` gate: a dropEffect is served only if effectAllowed covers it. */
export function negotiateExplorerDropEffect(
	effectAllowed: string,
	requested: ExplorerDropEffect,
): ExplorerDropEffect {
	const allowed = EFFECT_ALLOWANCE[effectAllowed] ?? [];
	return allowed.includes(requested) ? requested : 'none';
}

export type ExplorerDropOrigin =
	| 'native-file'
	| 'native-multi'
	| 'os-files'
	| 'unsupported';

export interface ExplorerDropOriginInput {
	draggableType?: string | null;
	/** Native `link` draggables only land when they resolved to a file. */
	draggableHasFile?: boolean;
	/** Native `_L` gate: a transfer holding at least one file-kind item. */
	hasOsFileItems?: boolean;
}

/**
 * Accepts native-origin payloads at Files targets: single file/folder/link
 * draggables, multi `files` draggables, and external OS files (import path).
 * Everything else — tags, properties, unknown types — is unsupported here.
 */
export function classifyExplorerDropOrigin(
	input: ExplorerDropOriginInput,
): ExplorerDropOrigin {
	if (
		input.draggableType === 'file' ||
		input.draggableType === 'folder' ||
		(input.draggableType === 'link' && input.draggableHasFile === true)
	) {
		return 'native-file';
	}
	if (input.draggableType === 'files') return 'native-multi';
	if (
		(input.draggableType === null ||
			input.draggableType === undefined ||
			input.draggableType === '') &&
		input.hasOsFileItems === true
	) {
		return 'os-files';
	}
	return 'unsupported';
}

export interface ExplorerHoverDecision {
	accept: boolean;
	dropEffect: ExplorerDropEffect;
	hoverClass: string | null;
	action: 'move' | 'copy' | null;
}

/**
 * Hover/commit descriptor for a resolved target (`null` = not a target).
 * Mirrors the native `handleDrop` truthy gate: only truthy descriptors
 * `preventDefault` and paint hover. The commit branch reuses the hover
 * descriptor and MUST pass through the commit ledger exactly once.
 */
export function decideExplorerHover(
	origin: ExplorerDropOrigin,
	targetFolderPath: string | null,
): ExplorerHoverDecision {
	if (targetFolderPath === null) {
		return { accept: false, dropEffect: 'none', hoverClass: null, action: null };
	}
	if (origin === 'native-file' || origin === 'native-multi') {
		return {
			accept: true,
			dropEffect: 'move',
			hoverClass: NATIVE_EXPLORER_HOVER_CLASS,
			action: 'move',
		};
	}
	if (origin === 'os-files') {
		return {
			accept: true,
			dropEffect: 'copy',
			hoverClass: NATIVE_EXPLORER_HOVER_CLASS,
			action: 'copy',
		};
	}
	return { accept: false, dropEffect: 'none', hoverClass: null, action: null };
}

export interface HoverExpandTracker {
	/** Steady hover notifies the OWNER to expand its own row when due. */
	noteHover(targetKey: string | null, isCollapsedFolder: boolean): void;
	cancel(): void;
}

/**
 * Native 750ms collapsed-folder hover expansion. The callback receives the
 * Vaultman target key so the owner expands its own row — never the hidden
 * native explorer.
 */
export function createHoverExpandTracker(
	onExpand: (targetKey: string) => void,
	delayMs: number = NATIVE_EXPLORER_HOVER_EXPAND_MS,
): HoverExpandTracker {
	let pendingKey: string | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	const clear = (): void => {
		if (timer !== null) clearTimeout(timer);
		timer = null;
		pendingKey = null;
	};
	return {
		noteHover(targetKey: string | null, isCollapsedFolder: boolean): void {
			if (targetKey === null || !isCollapsedFolder) {
				clear();
				return;
			}
			if (pendingKey === targetKey) return;
			clear();
			pendingKey = targetKey;
			timer = setTimeout(() => {
				clear();
				onExpand(targetKey);
			}, delayMs);
		},
		cancel(): void {
			clear();
		},
	};
}

export interface ExplorerCommitLedger {
	/** First attempt for a key commits; repeats are dropped. */
	tryCommit(key: string): boolean;
}

export function createExplorerCommitLedger(): ExplorerCommitLedger {
	const committed = new Set<string>();
	return {
		tryCommit(key: string): boolean {
			if (committed.has(key)) return false;
			committed.add(key);
			return true;
		},
	};
}
