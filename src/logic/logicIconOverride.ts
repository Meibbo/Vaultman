/**
 * logicIconOverride — PURE normalizer for icon overrides + their PSS-shaped
 * persisted document (PAI-002).
 *
 * Canon: proto v12 `icons.jsx` (`C:/Users/vic_A/Downloads/vaultman/proto-v12/icons.jsx`)
 * — `normalizeIconOverride` (:236-257), `EMPTY_AUTO_ICON_OVERRIDE` /
 * `EMPTY_MANUAL_ICON_OVERRIDE` (:176-177). Per issue
 * `.agents/docs/work/hardening/issues/proto-absorption-icons/002-override-model-persistence.md`.
 *
 * Translation rules (proto §29, PAI-001 precedent):
 *  - NO `window.*` — v12 exposes `window.normalizeIconOverride` (:514); this module
 *    is a plain, side-effect-free function set. State (the store) lives in the
 *    caller (`serviceIconOverrides.ts`), never on a global.
 *  - v12's `adw:` shortcut (:240) targets the LOCAL adwaita pack (`adwaita-v10`,
 *    icons.jsx:124 `LOCAL_ICON_PACKS`) — normalized here to the explicit pack form
 *    `{ packId: 'adwaita-v10', ... }` per the issue's translation rule ("v12 uses
 *    adw: as an adwaita shortcut — normalize it to the pack form").
 *  - `emoji:<char>` / bare-id -> lucide / generic `packId:iconId` all mirror v12
 *    exactly (:238-245); the generic branch splits on the FIRST colon only
 *    (`/:(.*)/s` at v12 :242), so an iconId may itself contain colons.
 *
 * Resolution note: which packs actually RESOLVE to an icon id (vs. fall through)
 * is a `resolveIcon` concern (PAI-002 slice: only `lucide`/`emoji`) — this module
 * only normalizes the SHAPE, it does not gate by pack.
 */

/** Normalized override mode: `auto` = pack-wide follow, `manual` = pinned icon. */
export type IconOverrideMode = 'auto' | 'manual';

/**
 * Typed port of v12's normalized override shape (icons.jsx :176-177, :236-257).
 * `packId`/`iconId` are `null` when unset (parity with v12's `EMPTY_*` sentinels).
 */
export interface IconOverrideSpec {
	mode: IconOverrideMode;
	packId: string | null;
	iconId: string | null;
}

/** v12 EMPTY_AUTO_ICON_OVERRIDE (icons.jsx:176). */
export const EMPTY_AUTO_ICON_OVERRIDE: IconOverrideSpec = {
	mode: 'auto',
	packId: null,
	iconId: null,
};

/** v12 EMPTY_MANUAL_ICON_OVERRIDE (icons.jsx:177). */
export const EMPTY_MANUAL_ICON_OVERRIDE: IconOverrideSpec = {
	mode: 'manual',
	packId: 'lucide',
	iconId: null,
};

/** Loosely-typed raw override input, matching what v12 accepts (string | object). */
export type RawIconOverride =
	| string
	| {
			mode?: unknown;
			packId?: unknown;
			pack?: unknown;
			iconId?: unknown;
			icon?: unknown;
			name?: unknown;
	  }
	| null
	| undefined;

/** v12 `adw:` shortcut (icons.jsx:240) targets the local adwaita pack by id. */
const ADWAITA_SHORTCUT_PACK_ID = 'adwaita-v10';

/**
 * Normalize a raw override value (string shorthand or object form) into a typed
 * `IconOverrideSpec`, or `null` when the input is falsy/unusable.
 *
 * Port of v12 `normalizeIconOverride` (icons.jsx:236-257):
 *  - falsy -> `null` (:237)
 *  - string forms (:238-245): `emoji:<id>` -> emoji pack · `adw:<id>` -> adwaita
 *    pack (normalized to pack form, translation rule) · `<packId>:<iconId>`
 *    (first colon splits, rest is the id) · bare id -> lucide pack
 *  - object form (:247-255): `mode` defaults to `auto` unless exactly `'manual'`;
 *    `packId`/`pack` and `iconId`/`icon`/`name` aliases; missing fields fall back
 *    to the EMPTY_* sentinel for that mode (:249-251)
 *  - anything else (number/boolean/etc.) -> `null` (:256)
 */
export function normalizeIconOverride(override: RawIconOverride): IconOverrideSpec | null {
	if (!override) return null;

	if (typeof override === 'string') {
		if (override.startsWith('emoji:')) {
			return { mode: 'manual', packId: 'emoji', iconId: override.slice('emoji:'.length) };
		}
		if (override.startsWith('adw:')) {
			return {
				mode: 'manual',
				packId: ADWAITA_SHORTCUT_PACK_ID,
				iconId: override.slice('adw:'.length),
			};
		}
		if (override.includes(':')) {
			const sepIndex = override.indexOf(':');
			const packId = override.slice(0, sepIndex);
			const iconId = override.slice(sepIndex + 1);
			return { mode: 'manual', packId, iconId };
		}
		return { mode: 'manual', packId: 'lucide', iconId: override };
	}

	if (typeof override === 'object') {
		const mode: IconOverrideMode = override.mode === 'manual' ? 'manual' : 'auto';
		const base = mode === 'manual' ? EMPTY_MANUAL_ICON_OVERRIDE : EMPTY_AUTO_ICON_OVERRIDE;
		const packId = firstString(override.packId, override.pack) ?? base.packId;
		const iconId = firstString(override.iconId, override.icon, override.name) ?? base.iconId;
		return { mode, packId, iconId };
	}

	return null;
}

function firstString(...candidates: unknown[]): string | null {
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.length > 0) return candidate;
	}
	return null;
}

// ─────────────────────────────────────────────────────────
// PSS-shaped persisted document
// ─────────────────────────────────────────────────────────

/**
 * D-PSS-3 storage classes are Presets/Profiles · Library items · Marks · Session.
 * A per-node/per-provider icon override is small, structured user config
 * scoped to nodes (not vault content, not a saved layout preset) — it is shaped
 * as a `config`-class document at `node` scope so a future move into PSS core
 * (N1) only relocates the envelope, it does not reshape the payload
 * ("build the contract shape once", per issue + user's canonical-shape rule).
 */
export type IconOverridesStorageClass = 'config';
export type IconOverridesScope = 'node' | 'panel';

/** D6 namespaced node-key kinds this slice persists overrides for. */
export type IconOverrideNodeKind = 'file' | 'folder' | 'tag' | 'prop';

const NODE_KEY_PATTERN = /^(file|folder|tag|prop)\./;

/**
 * PSS-shaped persisted payload for icon overrides.
 *  - `nodes`: per-node overrides, keyed by D6 namespaced id (`file.X`/`folder.X`/
 *    `tag.X`/`prop.X` — NEVER a raw path, per issue "Reglas de traducción").
 *  - `providers`: optional per-provider default override (e.g. all tags), keyed
 *    by provider id (`tags`/`props`/`files`/…).
 */
export interface IconOverridesDocument {
	pssVersion: 1;
	storageClass: IconOverridesStorageClass;
	scope: IconOverridesScope;
	nodes: Record<string, IconOverrideSpec>;
	providers: Record<string, IconOverrideSpec>;
}

export const EMPTY_ICON_OVERRIDES_DOCUMENT: IconOverridesDocument = {
	pssVersion: 1,
	storageClass: 'config',
	scope: 'node',
	nodes: {},
	providers: {},
};

/**
 * Normalize a raw (persisted or untrusted) value into a well-formed
 * `IconOverridesDocument`. Envelope fields (`pssVersion`/`storageClass`/`scope`)
 * are PINNED to their current values regardless of what was stored — this slice
 * defines exactly one version/class/scope, so tampered or stale envelopes never
 * propagate. Malformed entries (unnormalizable override values, non-namespaced
 * node keys) are dropped rather than throwing, so a corrupt settings blob
 * degrades to "no overrides" instead of crashing plugin load.
 */
export function normalizeIconOverridesDocument(raw: unknown): IconOverridesDocument {
	const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

	const nodes: Record<string, IconOverrideSpec> = {};
	const rawNodes = source.nodes;
	if (rawNodes && typeof rawNodes === 'object') {
		for (const [key, value] of Object.entries(rawNodes as Record<string, unknown>)) {
			if (!NODE_KEY_PATTERN.test(key)) continue;
			const normalized = normalizeIconOverride(value as RawIconOverride);
			if (normalized) nodes[key] = normalized;
		}
	}

	const providers: Record<string, IconOverrideSpec> = {};
	const rawProviders = source.providers;
	if (rawProviders && typeof rawProviders === 'object') {
		for (const [key, value] of Object.entries(rawProviders as Record<string, unknown>)) {
			const normalized = normalizeIconOverride(value as RawIconOverride);
			if (normalized) providers[key] = normalized;
		}
	}

	return {
		pssVersion: 1,
		storageClass: 'config',
		scope: 'node',
		nodes,
		providers,
	};
}
