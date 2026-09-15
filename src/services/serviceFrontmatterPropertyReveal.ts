import type { App, TFile } from 'obsidian';
import { openFileAtOffset } from '../utils/openFileAtOffset';

export const FRONTMATTER_PROPERTY_FLASH_CLASS = 'is-flashing';
export const FRONTMATTER_PROPERTY_FLASH_MS = 750;

export interface CurrentFilePropertyRevealState {
	revealActive?: boolean;
	scene_prop_reveal?: boolean;
	revealAnchor?: 'current-file' | 'pinned';
	revealAnchorPath?: string | null;
	currentFilePath: string | null;
}

export interface FrontmatterPropertyRevealRequest {
	filePath: string;
	propertyName: string;
	propertyValue?: string;
}

export interface FrontmatterSourceLocation {
	offset: number;
	content: string;
	range: readonly [number, number];
}

export interface VaultmanPropertyRevealView {
	workspaceInstanceId?: string | null;
	revealCurrentFileProperty?: (
		request: FrontmatterPropertyRevealRequest,
	) => boolean;
}

export interface VaultmanPropertyRevealLeaf {
	view?: unknown;
}

interface NativePropertyRow {
	scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
	classList?: {
		add?: (className: string) => void;
		remove?: (className: string) => void;
	};
	ownerDocument?: {
		defaultView?: { setTimeout?: (handler: () => void, timeout: number) => unknown } | null;
	} | null;
}

/**
 * A pinned scene is deliberately not equivalent to current-file even when its
 * path happens to match today. The anchor is the user's durable intent and it
 * must not start following editor events by accident.
 */
export function isCurrentFilePropertyRevealEligible(
	state: CurrentFilePropertyRevealState,
	filePath: string,
): boolean {
	const active = state.scene_prop_reveal ?? state.revealActive;
	return (
		active === true &&
		state.revealAnchor !== 'pinned' &&
		state.currentFilePath === filePath
	);
}

/**
 * Deliver one request to every mounted Vaultman instance, keyed by the durable
 * workspace instance id. No DOM lookup is involved: each scene uses its own
 * virtual view's indexed reveal primitive.
 */
export function routeVaultmanCurrentFileProperty(
	leaves: readonly VaultmanPropertyRevealLeaf[] | null | undefined,
	request: FrontmatterPropertyRevealRequest,
): number {
	const visited = new Set<string>();
	let revealed = 0;
	for (const leaf of leaves ?? []) {
		const view = (leaf as { view?: VaultmanPropertyRevealView })?.view ?? (leaf as unknown as VaultmanPropertyRevealView);
		const instanceId =
			view?.workspaceInstanceId ??
			(leaf as unknown as { getViewState?: () => { state?: { workspaceInstanceId?: string } } })?.getViewState?.()?.state?.workspaceInstanceId;
		if (!instanceId || visited.has(instanceId)) continue;
		visited.add(instanceId);
		if (typeof view.revealCurrentFileProperty !== 'function') continue;
		try {
			if (view.revealCurrentFileProperty(request)) revealed += 1;
		} catch {
			// A closing/remounting instance cannot prevent the remaining fan-out.
		}
	}
	return revealed;
}

function leafFilePath(leaf: {
	view?: { file?: { path?: string } } | null;
	getViewState?: () => { state?: { file?: unknown; mode?: unknown; source?: unknown } };
}): string | null {
	const viewPath = leaf.view?.file?.path;
	if (viewPath) return viewPath;
	const statePath = leaf.getViewState?.().state?.file;
	return typeof statePath === 'string' ? statePath : null;
}

function isExplicitSourceLeaf(leaf: {
	view?: { getMode?: () => string } | null;
	getViewState?: () => { state?: { mode?: unknown; source?: unknown } };
}): boolean {
	const state = leaf.getViewState?.().state;
	return (
		leaf.view?.getMode?.() === 'source' &&
		state?.mode === 'source' &&
		state.source === true
	);
}

function propertySelector(propertyName: string): string {
	const escaped = propertyName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `.metadata-property[data-property-key="${escaped}"]`;
}

function propertiesInDocumentMode(app: App): 'visible' | 'source' | 'hidden' | null {
	try {
		const value = (
			app.vault as unknown as { getConfig?: (key: string) => unknown }
		).getConfig?.('showPropertiesInDocument');
		return value === 'visible' || value === 'source' || value === 'hidden'
			? value
			: null;
	} catch {
		return null;
	}
}

function flashNativePropertyRow(row: NativePropertyRow): boolean {
	try {
		row.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
		row.classList?.add?.(FRONTMATTER_PROPERTY_FLASH_CLASS);
		const schedule = row.ownerDocument?.defaultView?.setTimeout;
		if (typeof schedule === 'function') {
			schedule(() => {
				try {
					row.classList?.remove?.(FRONTMATTER_PROPERTY_FLASH_CLASS);
				} catch {
					// The editor may have rerendered the property surface meanwhile.
				}
			}, FRONTMATTER_PROPERTY_FLASH_MS);
		}
		return true;
	} catch {
		return false;
	}
}

type CollapsibleContainer = {
	classList?: {
		contains: (cls: string) => boolean;
		remove: (cls: string) => void;
	};
	querySelector?: (selector: string) => { click?: () => void } | null;
};

/**
 * A10: a collapsed properties block (`.metadata-container.is-collapsed`) hides
 * every `.metadata-property`, so there is nothing to flash until it opens.
 * Prefer the native toggle -- a click on `.metadata-properties-heading`, which
 * is what the user does and what the editor tracks -- and only strip the
 * class if the heading is not there. Returns true when it had to expand.
 * Waits one frame so the rows exist before the caller queries them.
 */
async function expandMetadataContainer(root: {
	querySelector?: (selector: string) => unknown;
}): Promise<boolean> {
	try {
		if (typeof root.querySelector !== 'function') return false;
		const container = root.querySelector('.metadata-container') as
			| CollapsibleContainer
			| null;
		const cls = container?.classList;
		if (!cls?.contains?.('is-collapsed')) return false;
		const heading = container?.querySelector?.('.metadata-properties-heading');
		if (typeof heading?.click === 'function') heading.click();
		if (cls.contains('is-collapsed')) cls.remove('is-collapsed');
		await new Promise<void>((resolve) => {
			if (typeof requestAnimationFrame === 'function') {
				requestAnimationFrame(() => resolve());
			} else {
				resolve();
			}
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Reveal Core's own property row when "Show properties in document" is
 * Visible. In explicit Source mode, reuse the editor match-state path. Hidden
 * or unavailable native surfaces reject quietly.
 *
 * `propertyValue` — when provided, the flash targets the `.multi-select-pill`
 * inside the row whose `.multi-select-pill-content` text matches this value
 * instead of the whole row (A11).
 */
export async function revealNativeFrontmatterProperty(
	app: App,
	file: TFile,
	propertyName: string,
	source?: FrontmatterSourceLocation,
	propertyValue?: string,
): Promise<boolean> {
	const workspace = app.workspace as unknown as {
		activeLeaf?: unknown;
		getLeavesOfType?: (type: string) => Array<{
			view?: {
				file?: { path?: string };
				getMode?: () => string;
				containerEl?: { querySelector?: (selector: string) => unknown };
				contentEl?: { querySelector?: (selector: string) => unknown };
			};
			getViewState?: () => { state?: { file?: unknown; mode?: unknown; source?: unknown } };
		}>;
	};
	const leaves = workspace.getLeavesOfType?.('markdown') ?? [];
	const matching = leaves.filter((leaf) => leafFilePath(leaf) === file.path);
	const leaf =
		matching.find((candidate) => candidate === workspace.activeLeaf) ?? matching[0];
	if (!leaf) return false;

	const documentMode = propertiesInDocumentMode(app);
	if (isExplicitSourceLeaf(leaf) || documentMode === 'source') {
		if (!source) return false;
		return openFileAtOffset(app, file, source.offset, {
			match: { content: source.content, range: source.range },
			source: 'frontmatter',
			allowFrontmatterInLivePreview: documentMode === 'source',
		});
	}
	if (documentMode === 'hidden') return false;

	const root = leaf.view?.containerEl ?? leaf.view?.contentEl;
	if (!root || typeof root.querySelector !== 'function') return false;

	// A10: a collapsed block has no rows to flash; open it first.
	await expandMetadataContainer(root);

	let row: unknown;
	try {
		row = root.querySelector(propertySelector(propertyName));
	} catch {
		return false;
	}
	if (!row) return false;

	// A11: with a value, flash the matching pill (`.multi-select-pill-content`)
	// instead of the whole row; `.is-flashing` is generic in core's sheet, so
	// a pill lights up the same way a row does.
	const pillHost = row as {
		querySelectorAll?: (s: string) => Iterable<{
			querySelector?: (s: string) => { textContent?: string } | null;
		}>;
	};
	if (propertyValue && typeof pillHost.querySelectorAll === 'function') {
		for (const pill of pillHost.querySelectorAll('.multi-select-pill')) {
			const content = pill.querySelector?.('.multi-select-pill-content');
			if (content?.textContent?.trim() === propertyValue) {
				return flashNativePropertyRow(pill as NativePropertyRow);
			}
		}
	}
	return flashNativePropertyRow(row);
}
