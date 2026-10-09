/**
 * U130 native polish: clipboard contract and path safety parity.
 * Matches Obsidian 1.14.4 `obsidian/files` JSON format and path filtering.
 * Native source reference: app.js offsets 1445087 (FI), 1445178 (RI), 1517666 (handlePaste).
 */

import { isEditableKeyboardTarget } from './logicTreeKeyboard';

export const OBSIDIAN_FILES_MIME = 'obsidian/files';

export interface ObsidianClipboardFilesPayload {
	operation: 'copy' | 'cut';
	paths: string[];
}

export interface TreeClipboardHandler {
	handleCopy?(event: ClipboardEvent): void;
	handleCut?(event: ClipboardEvent): void;
	handlePaste?(event: ClipboardEvent): void;
}

interface ClipboardBoundary {
	readonly handler: TreeClipboardHandler;
	readonly isActive: () => boolean;
}
const clipboardHandlers = new WeakMap<HTMLElement, ClipboardBoundary>();
const activeClipboardOwners = new Set<HTMLElement>();

/** Relays active Obsidian window copy/cut/paste events to the registered owner element. */
export function registerTreeClipboardHandler(
	ownerEl: HTMLElement,
	handler: TreeClipboardHandler,
	isActive: () => boolean = () => ownerEl.getClientRects().length > 0,
): () => void {
	clipboardHandlers.set(ownerEl, { handler, isActive });
	activeClipboardOwners.add(ownerEl);
	return () => {
		clipboardHandlers.delete(ownerEl);
		activeClipboardOwners.delete(ownerEl);
	};
}

/**
 * Dispatches a copy, cut, or paste host event to the active tree clipboard handler
 * enclosed within the specified frame container.
 */
export function routeTreeClipboardEvent(
	type: 'copy' | 'cut' | 'paste',
	event: ClipboardEvent,
	options?: { frameEl?: HTMLElement | null },
): boolean {
	const frameEl = options?.frameEl;
	if (!frameEl || event.defaultPrevented || isEditableKeyboardTarget(event.target, null)) return false;
	for (const ownerEl of activeClipboardOwners) {
		const boundary = clipboardHandlers.get(ownerEl);
		if (!frameEl.contains(ownerEl) || !boundary?.isActive()) continue;
		const handler = boundary.handler;
		switch (type) {
			case 'copy': handler.handleCopy?.(event); break;
			case 'cut': handler.handleCut?.(event); break;
			case 'paste': handler.handlePaste?.(event); break;
		}
		return event.defaultPrevented;
	}
	return false;
}

/**
 * Parses and validates an `obsidian/files` JSON payload from the system clipboard.
 * Returns null if data is missing, malformed, or not conforming to the contract.
 */
export function parseObsidianFilesClipboard(
	data: string | null | undefined,
): ObsidianClipboardFilesPayload | null {
	if (!data || typeof data !== 'string') return null;
	try {
		const parsed: unknown = JSON.parse(data);
		if (!parsed || typeof parsed !== 'object') return null;
		if (!('operation' in parsed) || !('paths' in parsed)) return null;
		const op = parsed.operation;
		if (op !== 'copy' && op !== 'cut') return null;
		if (!Array.isArray(parsed.paths)) return null;
		const paths = parsed.paths.filter((p): p is string => typeof p === 'string' && p.length > 0);
		return { operation: op, paths };
	} catch {
		return null;
	}
}

/**
 * Serializes file paths and clipboard operation into the official `obsidian/files` JSON.
 */
export function serializeObsidianFilesClipboard(
	payload: ObsidianClipboardFilesPayload,
): string {
	return JSON.stringify({
		operation: payload.operation,
		paths: payload.paths,
	});
}

/**
 * Native `RI` parity (app.js offset 1445178):
 * Deduplicates file/folder paths by removing any path whose ancestor folder
 * is already present in the list.
 */
export function filterDescendantPaths(paths: readonly string[]): string[] {
	const result: string[] = [];
	// Process shorter paths first so ancestors are encountered before their descendants.
	const sorted = [...paths].sort((a, b) => a.length - b.length);
	for (const path of sorted) {
		const hasAncestor = result.some((ancestor) => {
			if (ancestor === path) return true;
			if (ancestor === '') return true;
			return path.startsWith(ancestor + '/');
		});
		if (!hasAncestor) {
			result.push(path);
		}
	}
	return result;
}

/**
 * Native `FI` parity (app.js offset 1445087):
 * Determines if a source file or folder can be moved/copied into a destination folder.
 * Returns false if the destination is the same item or inside a source folder's descendant tree.
 */
export function canMoveOrCopyPath(
	sourcePath: string,
	destinationFolderPath: string,
): boolean {
	if (sourcePath === destinationFolderPath) return false;
	if (destinationFolderPath === sourcePath || destinationFolderPath.startsWith(sourcePath + '/')) {
		return false;
	}
	return true;
}
