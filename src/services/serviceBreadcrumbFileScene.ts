import { Component, type App } from 'obsidian';
import { resolveBreadcrumbFolderPath } from './serviceNativeSurfaceBinding';

// Canonical value lives in src/VaultmanFrame.ts (VAULTMAN_FRAME_TYPE); main.ts
// passes it explicitly at wiring so unit tests never resolve the .svelte twin.
export const BREADCRUMB_FRAME_TYPE_DEFAULT = 'vaultman-frame';

/** Flash highlight for the focused folder row, mirroring Obsidian core. */
export const BREADCRUMB_FLASH_CLASS = 'vaultman-breadcrumb-flash';
export const BREADCRUMB_FLASH_MS = 750;

export const BREADCRUMB_SELECTOR = '.view-header-breadcrumb';

type ClosableElement = HTMLElement & {
	closest(selector: string): HTMLElement | null;
	getAttribute?(name: string): string | null;
	dataset?: DOMStringMap | Record<string, string | undefined>;
};

export interface BreadcrumbFileSceneDeps {
	app: App;
	frameType?: string;
}

export interface FileSceneLeaf {
	view: unknown;
	containerEl?: unknown;
}

/** Plain primary click only: modifiers and aux buttons belong to other handlers. */
export function isPlainPrimaryClick(event: MouseEvent): boolean {
	return (
		event.button === 0 &&
		!event.ctrlKey &&
		!event.metaKey &&
		!event.altKey &&
		!event.shiftKey
	);
}

function asElement(target: EventTarget | null): ClosableElement | null {
	if (!target || typeof (target as ClosableElement).closest !== 'function')
		return null;
	return target as ClosableElement;
}

/** Resolve the folder path for a breadcrumb element, or null outside breadcrumbs. */
export function resolveBreadcrumbFolder(
	target: EventTarget | null,
	app?: App,
): string | null {
	const base = asElement(target);
	if (!base) return null;
	const crumb = base.closest(BREADCRUMB_SELECTOR);
	if (!crumb) return null;
	return resolveBreadcrumbFolderPath(crumb as ClosableElement, app as App);
}

function leafHasFileScene(leaf: FileSceneLeaf): boolean {
	const view = leaf?.view as { getActiveScene?: unknown } | null | undefined;
	if (!view || typeof view.getActiveScene !== 'function') return false;
	try {
		return (view.getActiveScene as () => unknown)() === 'files';
	} catch {
		return false;
	}
}

/** First Vaultman instance whose active scene is fileScene, in leaf order. */
export function findFirstFileSceneLeaf(
	leaves: FileSceneLeaf[] | null | undefined,
): FileSceneLeaf | null {
	if (!leaves) return null;
	for (const leaf of leaves) {
		if (leafHasFileScene(leaf)) return leaf;
	}
	return null;
}

/** Flash the folder row inside the revealed leaf, core-style (750 ms). */
export function flashFolderRow(
	container: { querySelector?: unknown } | null | undefined,
	folderPath: string,
): boolean {
	if (
		!container ||
		typeof container.querySelector !== 'function' ||
		!folderPath
	)
		return false;
	let row: unknown = null;
	try {
		row = (container.querySelector as (sel: string) => unknown)(
			`[data-path="${folderPath}"]`,
		);
	} catch {
		return false;
	}
	const rowEl = row as {
		classList?: { add?: unknown; remove?: unknown };
		win?: { setTimeout?: unknown };
	} | null;
	if (!rowEl || !rowEl.classList || typeof rowEl.classList.add !== 'function')
		return false;
	try {
		(rowEl.classList.add as (cls: string) => void)(BREADCRUMB_FLASH_CLASS);
	} catch {
		return false;
	}
	const schedule =
		rowEl.win && typeof rowEl.win.setTimeout === 'function'
			? rowEl.win.setTimeout.bind(rowEl.win)
			: setTimeout;
	schedule(() => {
		try {
			(rowEl.classList?.remove as (cls: string) => void)?.(
				BREADCRUMB_FLASH_CLASS,
			);
		} catch {
			// Non-fatal: the row may be gone when the timer fires.
		}
	}, BREADCRUMB_FLASH_MS);
	return true;
}

/**
 * Intercept a plain primary click on a view-header breadcrumb and route it to
 * the first Vaultman instance with fileScene, INSTEAD of the file explorer:
 * resolve folder → reveal + focus leaf → reveal folder in fileScene → flash.
 * Returns true when handled (native must stay suppressed), false otherwise.
 */
export function handleBreadcrumbFileSceneClick(
	event: MouseEvent,
	deps: BreadcrumbFileSceneDeps,
): boolean {
	if (!isPlainPrimaryClick(event)) return false;
	const folderPath = resolveBreadcrumbFolder(event.target, deps.app);
	if (!folderPath) return false;
	const workspace = deps.app?.workspace as unknown as
		| {
				getLeavesOfType?: (type: string) => FileSceneLeaf[];
				revealLeaf?: (leaf: unknown) => void;
				setActiveLeaf?: (leaf: unknown, opts?: { focus?: boolean }) => void;
		  }
		| undefined;
	const leaves =
		workspace?.getLeavesOfType?.(
			deps.frameType ?? BREADCRUMB_FRAME_TYPE_DEFAULT,
		) ?? [];
	const leaf = findFirstFileSceneLeaf(leaves);
	if (!leaf) return false;

	event.preventDefault();
	event.stopImmediatePropagation();

	try {
		workspace?.revealLeaf?.(leaf);
		workspace?.setActiveLeaf?.(leaf, { focus: true });
	} catch {
		return false;
	}
	const view = leaf.view as
		{ revealFolderInFileScene?: unknown } | null | undefined;
	if (view && typeof view.revealFolderInFileScene === 'function') {
		let revealed = false;
		try {
			revealed =
				(view.revealFolderInFileScene as (p: string) => unknown)(folderPath) ===
				true;
		} catch {
			revealed = false;
		}
		if (!revealed) return true;
	}
	const container = (leaf as { containerEl?: unknown }).containerEl as {
		querySelector?: unknown;
	} | null;
	if (container) flashFolderRow(container, folderPath);
	return true;
}

export interface BreadcrumbFileSceneServiceDeps {
	plugin: { app: App };
	app: App;
	doc?: Document;
	frameType?: string;
}

/** Document-level capture listener: runs before Obsidian's breadcrumb handler. */
export class BreadcrumbFileSceneService extends Component {
	constructor(private readonly deps: BreadcrumbFileSceneServiceDeps) {
		super();
	}

	onload(): void {
		const doc =
			this.deps.doc ??
			(typeof activeDocument !== 'undefined' ? activeDocument : undefined);
		if (!doc) return;
		this.registerDomEvent(
			doc,
			'click',
			(event) => {
				handleBreadcrumbFileSceneClick(event, {
					app: this.deps.app,
					frameType: this.deps.frameType,
				});
			},
			{ capture: true },
		);
	}
}
