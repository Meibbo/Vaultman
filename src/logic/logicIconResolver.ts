/**
 * logicIconResolver — PURE semantic icon resolver core (PAI-001 tracer + PAI-002
 * override wiring).
 *
 * Canon: **proto v12** `icons.jsx` (`C:/Users/vic_A/Downloads/vaultman/proto-v12/icons.jsx`)
 * — `NODE_KIND_ICONS` (:73), `NODE_TYPE_ICONS` (:92), `FILE_ICON_ALIASES` (:47),
 * `LUCIDE_ROLE_ICONS` (:126), `resolveIconPackKey` (:190) — translated into a typed,
 * framework-agnostic priority chain, per issues
 * `.agents/docs/work/hardening/issues/proto-absorption-icons/001-resolver-core-tree-tracer.md`
 * and `002-override-model-persistence.md`, and ledger `06-theme-style-icons-decorations.md`
 * (table "Iconos semánticos").
 *
 * Priority chain (canon, v12 = authority on ORDER, icons.jsx:199-212):
 *   folder -> role -> type -> ext -> override -> fallback
 *
 * The chain always classifies role/type/ext first (`resolveIconChain`); `override`
 * (PAI-002, via `logicIconOverride.ts`) is then applied as a final step that keeps
 * the classified `role` but WINS on `source`/`iconId` when present and resolvable —
 * see `resolveIcon`'s docblock below for the exact precedence rule.
 *
 * SEMANTICS vs THEME: this module resolves the semantic ROLE per v12, but the icon ids
 * it emits come from `ACTIVE_ROLE_ICON_MAP`, which preserves today's product output
 * exactly (PAI-001 DoD: visual parity — the tracer changes the resolution path, not the
 * rendered icons). The v12 polish look ships as `PROTO_POLISH_ROLE_ICONS`, defined but
 * UNWIRED (preset-polish concern, D8; wiring belongs to preset work, not this slice).
 *
 * ZERO `obsidian`, DOM, or Svelte imports — matches the style of the other
 * `logic*.ts` modules (see `logicBadge.ts`). No `window.*` (proto §29 hard rule:
 * proto's `window.normalizeIconOverride`/globals are NOT ported — state lives in the
 * caller/store, see `serviceIconOverrides.ts`).
 *
 * The Iconic bridge (`serviceIcons.ts`) is NOT consulted here — that precedence
 * ("override wins over Iconic, Iconic wins over the chain when no override") lives
 * in the caller (`serviceDecorate.ts`).
 */
import {
	normalizeIconOverride,
	type IconOverrideSpec,
	type RawIconOverride,
} from './logicIconOverride';

/**
 * Semantic roles: the 16 keys of v12 `LUCIDE_ROLE_ICONS` (icons.jsx:126-143).
 * 7 kind-roles (folder/file/tag/prop/value/content/match) + 9 type/ext-roles
 * (md/txt/json/img/code/sheet/canvas/base/pdf). `code`/`sheet` are not producible
 * from kind/type/ext today (v12 addresses them via pack aliases only) but belong to
 * the role vocabulary.
 */
export const ICON_ROLES = [
	'folder',
	'file',
	'md',
	'txt',
	'json',
	'img',
	'code',
	'sheet',
	'canvas',
	'base',
	'pdf',
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
	/** Semantic node kind; v12 aliases (dir/doc/tags/property/option/search…) normalize. */
	kind?: string;
	isFolder?: boolean;
	/** Node/file type (v12 `node.type`); wins over `extension` for files (type step). */
	nodeType?: string;
	/** File extension, with or without leading dot, any case. */
	extension?: string;
	/** Property type (only meaningful when kind normalizes to `prop`); keys into `TYPE_ICON_MAP`. */
	propType?: string;
	/**
	 * PAI-002: a per-node icon override. Accepts a raw v12-style shorthand
	 * (`emoji:<id>` / `adw:<id>` / `packId:iconId` / bare id) or object, OR an
	 * already-normalized `IconOverrideSpec` from the override store — both are
	 * normalized internally. When present and resolvable, it wins over every
	 * chain step; malformed/empty/unresolvable overrides fall through.
	 */
	override?: RawIconOverride | IconOverrideSpec;
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

/** v12 NODE_KIND_ICONS (icons.jsx:73-90): kind aliases -> canonical kind-role. */
const KIND_ALIASES: Record<string, IconRole> = {
	folder: 'folder',
	dir: 'folder',
	directory: 'folder',
	file: 'file',
	doc: 'file',
	document: 'file',
	tag: 'tag',
	tags: 'tag',
	prop: 'prop',
	property: 'prop',
	properties: 'prop',
	value: 'value',
	option: 'value',
	content: 'content',
	match: 'match',
	search: 'content',
};

/**
 * v12 FILE_ICON_ALIASES (icons.jsx:47-71): extension/type spelling -> ext-role.
 * Parity superset: v12 only aliases jpg/jpeg/png/gif/svg to `img`; the product also
 * treats avif/bmp/ico/tif/tiff/webp as images today, so those keep resolving to `img`.
 */
const EXT_ROLE_ALIASES: Record<string, IconRole> = {
	markdown: 'md',
	mdown: 'md',
	text: 'txt',
	plain: 'txt',
	yml: 'json',
	yaml: 'json',
	lock: 'json',
	js: 'json',
	jsx: 'json',
	ts: 'json',
	tsx: 'json',
	image: 'img',
	jpg: 'img',
	jpeg: 'img',
	png: 'img',
	gif: 'img',
	svg: 'img',
	avif: 'img',
	bmp: 'img',
	ico: 'img',
	tif: 'img',
	tiff: 'img',
	webp: 'img',
	pdf: 'pdf',
	doc: 'pdf',
	docx: 'pdf',
	canvas: 'canvas',
	'json-canvas': 'canvas',
	base: 'base',
};

/** Ext-addressable roles: a normalized extension equal to one of these IS its role. */
const EXT_ROLES: ReadonlySet<IconRole> = new Set(['md', 'txt', 'json', 'img', 'pdf', 'canvas', 'base']);

/** v12 NODE_TYPE_ICONS (icons.jsx:92-108): normalized node type -> role. */
const TYPE_ROLE_MAP: Record<string, IconRole> = {
	pdf: 'pdf',
	'application-pdf': 'pdf',
	canvas: 'canvas',
	'json-canvas': 'canvas',
	base: 'base',
	tag: 'tag',
	tags: 'tag',
	prop: 'prop',
	property: 'prop',
	properties: 'prop',
	value: 'value',
	option: 'value',
	content: 'content',
	match: 'match',
	search: 'content',
};

/**
 * ACTIVE theme map (product parity): role -> icon id AS RENDERED TODAY.
 * Every id here matches the pre-PAI-001 product output captured by the
 * characterization tests in `serviceDecorate.test.ts`. Do not "upgrade" ids here —
 * that is preset work (see `PROTO_POLISH_ROLE_ICONS`).
 */
const ACTIVE_ROLE_ICON_MAP: Record<IconRole, string> = {
	folder: 'lucide-folder',
	file: 'lucide-file',
	md: 'lucide-file',
	txt: 'lucide-file',
	json: 'lucide-file',
	img: 'lucide-image',
	code: 'lucide-file',
	sheet: 'lucide-file',
	canvas: 'lucide-file',
	base: 'lucide-file',
	pdf: 'lucide-file',
	tag: 'lucide-tag',
	prop: 'lucide-tag',
	value: 'lucide-sliders-horizontal',
	content: 'lucide-search',
	match: 'lucide-search',
};

/**
 * v12 polish theme (icons.jsx:126-143 LUCIDE_ROLE_ICONS, `lucide-` prefixed).
 * DEFINED, UNWIRED (D-VD-4 discipline): the polish/demo preset adopts this map when
 * preset theming lands; nothing reads it in PAI-001.
 */
export const PROTO_POLISH_ROLE_ICONS: Record<IconRole, string> = {
	folder: 'lucide-folder',
	file: 'lucide-file',
	md: 'lucide-file-text',
	txt: 'lucide-file-text',
	json: 'lucide-file-code',
	img: 'lucide-file-image',
	code: 'lucide-file-code',
	sheet: 'lucide-table',
	canvas: 'lucide-workflow',
	base: 'lucide-database',
	pdf: 'lucide-file-type',
	tag: 'lucide-tags',
	prop: 'lucide-sliders-horizontal',
	value: 'lucide-list-check',
	content: 'lucide-scan-text',
	match: 'lucide-search-check',
};

const FALLBACK_ICON = 'lucide-file';

function cleanToken(value: string | undefined): string {
	return String(value ?? '')
		.toLowerCase()
		.replace(/^\./, '');
}

/** v12 `normalizeIconExt` (icons.jsx:179-182): alias first, else the raw token. */
function extRoleOf(value: string | undefined): IconRole | null {
	const clean = cleanToken(value);
	if (!clean) return null;
	const candidate = EXT_ROLE_ALIASES[clean] ?? clean;
	return EXT_ROLES.has(candidate as IconRole) ? (candidate as IconRole) : null;
}

/** v12 type step: normalize like an ext, then look up NODE_TYPE_ICONS. */
function typeRoleOf(value: string | undefined): IconRole | null {
	const clean = cleanToken(value);
	if (!clean) return null;
	const normalized = EXT_ROLE_ALIASES[clean] ?? clean;
	return TYPE_ROLE_MAP[normalized] ?? TYPE_ROLE_MAP[clean] ?? null;
}

/**
 * Resolve the semantic ROLE + parity icon id through the canon priority chain
 * (v12 `resolveIconPackKey`, icons.jsx:199-212), ignoring `override` entirely.
 * `resolveIcon` (below) computes this first — the role classification always
 * runs, since an applied override REPLACES the icon id/source but must not
 * change what role the node is understood to have.
 *
 * - `folder`: `isFolder` (or a folder-aliased kind) short-circuits everything.
 * - `role`: fixed per-role icon for tag/prop/value/content/match (and their aliases).
 * - `type`: `prop` uses `propType` -> `TYPE_ICON_MAP`; files (and unknown kinds, per
 *   v12 :212) use `nodeType` -> `NODE_TYPE_ICONS`, which WINS over the extension.
 * - `ext`: extension -> ext-role (md/txt/json/img/pdf/canvas/base); unknown extensions
 *   on files stay the generic `file` role.
 * - `fallback`: unrecognized/missing kind with no usable type/ext.
 */
function resolveIconChain(input: IconResolutionInput): IconResolution {
	if (input.isFolder) {
		return { role: 'folder', source: 'folder', iconId: ACTIVE_ROLE_ICON_MAP.folder };
	}

	const kindRole = KIND_ALIASES[cleanToken(input.kind)];

	if (kindRole === 'folder') {
		return { role: 'folder', source: 'folder', iconId: ACTIVE_ROLE_ICON_MAP.folder };
	}

	if (kindRole === 'tag' || kindRole === 'value' || kindRole === 'content' || kindRole === 'match') {
		return { role: kindRole, source: 'role', iconId: ACTIVE_ROLE_ICON_MAP[kindRole] };
	}

	if (kindRole === 'prop') {
		const typeIcon = input.propType ? TYPE_ICON_MAP[input.propType] : undefined;
		if (typeIcon) {
			return { role: 'prop', source: 'type', iconId: typeIcon };
		}
		return { role: 'prop', source: 'role', iconId: ACTIVE_ROLE_ICON_MAP.prop };
	}

	// File (and unknown-kind, per v12 :212 `typeRole || … || extKey`) territory.
	const isFile = kindRole === 'file';

	const typeRole = typeRoleOf(input.nodeType);
	if (typeRole) {
		return { role: typeRole, source: 'type', iconId: ACTIVE_ROLE_ICON_MAP[typeRole] };
	}

	const extRole = extRoleOf(input.extension);
	if (extRole) {
		return { role: extRole, source: 'ext', iconId: ACTIVE_ROLE_ICON_MAP[extRole] };
	}
	if (isFile && cleanToken(input.extension)) {
		return { role: 'file', source: 'ext', iconId: ACTIVE_ROLE_ICON_MAP.file };
	}

	if (isFile) {
		return { role: 'file', source: 'role', iconId: ACTIVE_ROLE_ICON_MAP.file };
	}

	return { role: 'fallback', source: 'fallback', iconId: FALLBACK_ICON };
}

/**
 * Resolve the icon id an id for `packId` in the override to an icon id string
 * this slice knows how to render. PAI-002 scope: only `lucide` (bare id ->
 * `lucide-<id>`) and `emoji` (the iconId itself IS the glyph, rendered as-is —
 * matches v12's `EmojiPackIcon`, icons.jsx:358-372) resolve. Any other pack id
 * (remote/asset packs, PAI-005) or a manual override with no iconId returns
 * `null` so the caller falls through to the existing chain result — v12's
 * graceful degradation (icons.jsx:476 falls back to `lucideName`), never throws.
 */
function resolveOverrideIconId(spec: IconOverrideSpec): string | null {
	if (!spec.iconId) return null;
	if (spec.packId === 'emoji') return spec.iconId;
	if (spec.packId === 'lucide' || spec.packId === null) {
		return spec.iconId.startsWith('lucide-') ? spec.iconId : `lucide-${spec.iconId}`;
	}
	return null;
}

/**
 * Resolve the semantic icon for a node: the priority chain (`resolveIconChain`)
 * ALWAYS runs first to classify the role, then a normalized `override`
 * (PAI-002) is applied on top when present and resolvable — overrides are
 * EXPLICIT user intent, so they WIN over every chain step (folder/role/type/
 * ext/fallback alike), matching v12's `Icon` component where a manual override
 * short-circuits before the pack/theme lookup (icons.jsx:453-477). Iconic
 * precedence is NOT decided here — that lives in the caller (`serviceDecorate.ts`);
 * this function only decides override-vs-chain.
 *
 * `input.override` accepts either a raw v12-style string/object (normalized
 * internally via `normalizeIconOverride`) or an already-normalized
 * `IconOverrideSpec` (the shape the override store persists) — both forms are
 * structurally accepted so callers don't have to double-normalize.
 *
 * Malformed/empty overrides (unnormalizable, or normalized but missing a
 * usable iconId, or an unresolvable pack id this slice) fall through to the
 * chain result unchanged — parity with today's behavior when no override
 * applies (PAI-002 DoD: zero overrides = byte-identical output).
 */
export function resolveIcon(input: IconResolutionInput): IconResolution {
	const chainResult = resolveIconChain(input);

	if (!input.override) return chainResult;

	const spec = isIconOverrideSpec(input.override)
		? input.override
		: normalizeIconOverride(input.override as RawIconOverride);
	if (!spec) return chainResult;

	const iconId = resolveOverrideIconId(spec);
	if (!iconId) return chainResult;

	return { role: chainResult.role, source: 'override', iconId };
}

function isIconOverrideSpec(value: unknown): value is IconOverrideSpec {
	return (
		typeof value === 'object' &&
		value !== null &&
		'mode' in value &&
		('packId' in value || 'iconId' in value)
	);
}
