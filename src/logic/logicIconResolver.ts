/**
 * logicIconResolver — PURE semantic icon resolver core (PAI-001, tracer slice).
 *
 * Canon: proto `icons.jsx` `resolveIconPackKey` (node-kind vocabulary: folder / file
 * / tag / prop / value / content / match, plus extension aliasing) translated into a
 * typed, framework-agnostic priority chain, per issue
 * `.agents/docs/work/hardening/issues/proto-absorption-icons/001-resolver-core-tree-tracer.md`
 * and ledger `06-theme-style-icons-decorations.md` (table "Iconos semánticos").
 *
 * Priority chain (canon, proto = authority on ORDER):
 *   folder -> role -> type -> ext -> override -> fallback
 *
 * ZERO `obsidian`, DOM, or Svelte imports — matches the style of the other
 * `logic*.ts` modules (see `logicBadge.ts`). No `window.*` (proto §29 hard rule:
 * proto's global `__vmIconOverrides` is NOT ported — state lives in the caller).
 *
 * This slice does NOT wire overrides: the `override` field exists on
 * `IconResolutionInput` so the chain's shape is final now, but `resolveIcon` never
 * reads it. PAI-002 wires override application; until then the chain always falls
 * through override to whatever the role/type/ext steps produced (parity with today).
 *
 * The Iconic bridge (`serviceIcons.ts`) is NOT consulted here — that precedence
 * ("Iconic wins when present") lives in the caller (`serviceDecorate.ts`), which
 * calls `resolveIcon` only as the fallback path when Iconic has no icon for the node.
 */

/** Semantic roles from the proto's node-kind vocabulary (icons.jsx `NODE_KIND_ICONS`). */
export const ICON_ROLES = [
	'folder',
	'file',
	'tag',
	'prop',
	'value',
	'content',
	'match',
] as const;

export type IconRole = (typeof ICON_ROLES)[number];

/** Resolution source: which step of the priority chain produced the icon id. */
export type IconResolutionSource = 'folder' | 'role' | 'type' | 'ext' | 'override' | 'fallback';

export interface IconResolution {
	role: IconRole | 'fallback';
	source: IconResolutionSource;
	iconId: string;
}

export interface IconResolutionInput {
	/** Semantic node kind. Anything outside `ICON_ROLES` degrades to fallback. */
	kind?: IconRole | string;
	isFolder?: boolean;
	/** File extension, with or without leading dot, any case. */
	extension?: string;
	/** Property type (only meaningful when `kind === 'prop'`); keys into `TYPE_ICON_MAP`. */
	propType?: string;
	/**
	 * Reserved for PAI-002 (persisted overrides). The parameter exists so the chain's
	 * shape is locked now; `resolveIcon` does not read it in this slice.
	 */
	override?: string;
}

/** Prop-type -> icon map. CONSUMED (not replaced) from `serviceDecorate.ts` TYPE_ICON_MAP. */
export const TYPE_ICON_MAP: Record<string, string> = {
	text: 'lucide-text-align-start',
	number: 'lucide-hash',
	checkbox: 'lucide-check-square',
	date: 'lucide-calendar',
	datetime: 'lucide-clock',
	list: 'lucide-list',
	multitext: 'lucide-list-plus',
};

/** Extensions that resolve to the image icon instead of the generic file icon. */
const IMAGE_EXTENSIONS = new Set([
	'avif',
	'bmp',
	'gif',
	'ico',
	'jpeg',
	'jpg',
	'png',
	'svg',
	'tif',
	'tiff',
	'webp',
]);

/** Fixed icon per non-file, non-folder semantic role (proto `NODE_KIND_ICONS`). */
const ROLE_FALLBACK_ICON: Partial<Record<IconRole, string>> = {
	tag: 'lucide-tag',
	prop: 'lucide-tag',
	value: 'lucide-sliders-horizontal',
	content: 'lucide-search',
	match: 'lucide-search',
};

const FALLBACK_ICON = 'lucide-file';

function normalizeExtension(extension: string | undefined): string {
	return String(extension ?? '')
		.toLowerCase()
		.replace(/^\./, '');
}

function resolveFileIcon(isFolder: boolean | undefined, extension: string | undefined): IconResolution {
	if (isFolder) {
		return { role: 'folder', source: 'folder', iconId: 'lucide-folder' };
	}
	const ext = normalizeExtension(extension);
	const iconId = IMAGE_EXTENSIONS.has(ext) ? 'lucide-image' : FALLBACK_ICON;
	return { role: 'file', source: 'ext', iconId };
}

/**
 * Resolve the semantic icon for a node through the canon priority chain:
 * folder -> role -> type -> ext -> override -> fallback.
 *
 * - `folder`: `isFolder` short-circuits everything, regardless of `kind`.
 * - `role`: fixed per-role icon for tag/prop/value/content/match.
 * - `type`: only for `kind: 'prop'` — `propType` looked up in `TYPE_ICON_MAP`;
 *   unknown/missing `propType` degrades back to the role step's generic icon.
 * - `ext`: only for `kind: 'file'` (non-folder) — extension decides image vs generic.
 * - `override`: reserved, unwired this slice (see module docblock).
 * - `fallback`: unrecognized/missing `kind` -> generic file icon.
 */
export function resolveIcon(input: IconResolutionInput): IconResolution {
	if (input.isFolder) {
		return { role: 'folder', source: 'folder', iconId: 'lucide-folder' };
	}

	switch (input.kind) {
		case 'folder':
			return { role: 'folder', source: 'folder', iconId: 'lucide-folder' };
		case 'file':
			return resolveFileIcon(input.isFolder, input.extension);
		case 'tag':
		case 'value':
		case 'content':
		case 'match':
			return { role: input.kind, source: 'role', iconId: ROLE_FALLBACK_ICON[input.kind]! };
		case 'prop': {
			const typeIcon = input.propType ? TYPE_ICON_MAP[input.propType] : undefined;
			if (typeIcon) {
				return { role: 'prop', source: 'type', iconId: typeIcon };
			}
			return { role: 'prop', source: 'role', iconId: ROLE_FALLBACK_ICON.prop! };
		}
		default:
			return { role: 'fallback', source: 'fallback', iconId: FALLBACK_ICON };
	}
}
