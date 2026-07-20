/**
 * BT5-019: Vaultman's own icon registry for add-on nodes (snippets/plugins).
 *
 * Iconic models files, properties, tags and ribbon items — it has no concept of
 * a CSS snippet, and reaches a plugin only indirectly through that plugin's
 * ribbon item. So Vaultman keeps its own overrides and treats Iconic purely as
 * a compatibility source: everything here works with Iconic absent, disabled or
 * uninstalled.
 *
 * This module is pure: no Obsidian imports, no persistence, no UI. The caller
 * supplies the persisted blob and the icon-existence probe.
 */

export type AddonIconKind = 'plugin' | 'snippet';

export interface AddonIconValue {
	icon?: string;
	color?: string;
}

export interface AddonIconOverride {
	icon: string;
	color?: string;
}

export interface ResolvedAddonIcon {
	icon: string;
	color?: string;
}

/** Persisted shape: canonical key -> override. */
export type AddonIconOverrides = Record<string, AddonIconOverride>;

const KINDS: readonly AddonIconKind[] = ['plugin', 'snippet'];

/**
 * Stable identity per kind.
 *
 * - plugin: the `pluginId`, which survives renames and re-installs.
 * - snippet: the canonical file name without its `.css` extension, so the same
 *   snippet reached as `theme` or `theme.css` is one identity.
 *
 * The kind is part of the key: a plugin id and a snippet name may read the
 * same and must never share an override.
 */
export function addonIconKey(
	kind: AddonIconKind,
	rawId: string,
): string | null {
	const trimmed = rawId.trim();
	// Only a trailing extension is stripped; `a.css.b` is a real name.
	const id =
		kind === 'snippet' && trimmed.toLowerCase().endsWith('.css')
			? trimmed.slice(0, -'.css'.length)
			: trimmed;
	// An empty identity would collapse to a kind-only key shared by every
	// nameless row, so it is rejected rather than stored.
	if (!id) return null;
	// Encoding keeps the `kind:id` tuple unambiguous even when the id itself
	// contains the separator.
	return `${kind}:${encodeURIComponent(id)}`;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function normalizeOverride(value: unknown): AddonIconOverride | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return null;
	}
	const candidate = value as { icon?: unknown; color?: unknown };
	if (!isNonEmptyString(candidate.icon)) return null;
	return {
		icon: candidate.icon,
		...(isNonEmptyString(candidate.color) ? { color: candidate.color } : {}),
	};
}

function isCanonicalKey(key: string): boolean {
	return KINDS.some((kind) => key.startsWith(`${kind}:`));
}

/**
 * Defensive load. Unknown keys, legacy keys and malformed rows are dropped
 * instead of throwing, so a hand-edited or future data.json still opens.
 */
export function normalizeAddonIconOverrides(
	value: unknown,
): AddonIconOverrides {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return {};
	}
	const store: AddonIconOverrides = {};
	for (const [key, raw] of Object.entries(value)) {
		if (!isCanonicalKey(key)) continue;
		const override = normalizeOverride(raw);
		if (override) store[key] = override;
	}
	return store;
}

export function getAddonIconOverride(
	store: AddonIconOverrides,
	kind: AddonIconKind,
	rawId: string,
): AddonIconOverride | null {
	const key = addonIconKey(kind, rawId);
	return key ? (store[key] ?? null) : null;
}

export function setAddonIconOverride(
	store: AddonIconOverrides,
	kind: AddonIconKind,
	rawId: string,
	override: AddonIconValue,
): AddonIconOverrides {
	const key = addonIconKey(kind, rawId);
	const normalized = normalizeOverride(override);
	if (!key || !normalized) return store;
	return { ...store, [key]: normalized };
}

/** Reset: removes ONLY the Vaultman override, never an external one. */
export function clearAddonIconOverride(
	store: AddonIconOverrides,
	kind: AddonIconKind,
	rawId: string,
): AddonIconOverrides {
	const key = addonIconKey(kind, rawId);
	if (!key || !(key in store)) return store;
	const next = { ...store };
	delete next[key];
	return next;
}

/**
 * Persistence adapter (BT5-019). Settings own the `addonIconOverrides` field;
 * this pair is the only place that touches it, so reads stay sanitized (a
 * hand-edited data.json cannot crash the panels) and writes stay
 * non-destructive.
 */
export const ADDON_ICON_OVERRIDES_FIELD = 'addonIconOverrides';

/** Narrow view of settings: this module needs no other field. */
interface AddonIconSettingsLike {
	[ADDON_ICON_OVERRIDES_FIELD]?: unknown;
}

export function readAddonIconOverrides(settings: unknown): AddonIconOverrides {
	if (typeof settings !== 'object' || settings === null) return {};
	return normalizeAddonIconOverrides(
		(settings as AddonIconSettingsLike)[ADDON_ICON_OVERRIDES_FIELD],
	);
}

/**
 * Persist a store without destroying rows this version does not understand:
 * the merge starts from the raw persisted object, drops only the canonical
 * keys we own, and writes a NEW map so nothing mutates in place.
 */
export function writeAddonIconOverrides(
	settings: unknown,
	store: AddonIconOverrides,
): void {
	if (typeof settings !== 'object' || settings === null) return;
	const target = settings as AddonIconSettingsLike;
	const persisted = target[ADDON_ICON_OVERRIDES_FIELD];
	const foreign: Record<string, unknown> = {};
	if (
		typeof persisted === 'object' &&
		persisted !== null &&
		!Array.isArray(persisted)
	) {
		for (const [key, value] of Object.entries(persisted)) {
			// Keys we own are replaced wholesale by `store`; anything else
			// (a future kind, another version's row) is carried through.
			if (!isCanonicalKey(key)) foreign[key] = value;
		}
	}
	target[ADDON_ICON_OVERRIDES_FIELD] = { ...foreign, ...store };
}

const LUCIDE_PREFIX = 'lucide-';

/**
 * Readable label for an icon id: the shared `lucide-` prefix is noise in a
 * list where every row carries it, and dashes read better as spaces.
 */
export function addonIconLabelFor(iconId: string): string {
	const name = iconId.toLowerCase().startsWith(LUCIDE_PREFIX)
		? iconId.slice(LUCIDE_PREFIX.length)
		: iconId;
	return name.replace(/-/g, ' ');
}

export type AddonIconChoice = { kind: 'reset' } | { kind: 'icon'; id: string };

export interface AddonIconChoicesOptions {
	/** Reset is offered only when Vaultman actually holds an override. */
	hasOverride: boolean;
}

/**
 * Ordered, deduplicated choices for the picker. Filtering/matching belongs to
 * Obsidian's fuzzy suggester; this only guarantees a stable list with Reset
 * first, so the same library always produces the same offering.
 */
export function addonIconChoices(
	iconIds: readonly string[],
	options: AddonIconChoicesOptions,
): AddonIconChoice[] {
	const choices: AddonIconChoice[] = options.hasOverride
		? [{ kind: 'reset' }]
		: [];
	for (const id of new Set(iconIds)) {
		choices.push({ kind: 'icon', id });
	}
	return choices;
}

export interface ResolveAddonIconInput {
	/** Vaultman's own override, highest precedence. */
	override?: AddonIconValue | null;
	/** Iconic's value; omit or pass null when Iconic is absent/disabled. */
	iconic?: AddonIconValue | null;
	/** Icon the add-on itself publishes (e.g. a plugin's ribbon icon). */
	emitted?: AddonIconValue | null;
	/** Last resort for the kind; always rendered. */
	fallback: string;
	/**
	 * Probe for icons the current library actually knows. It validates ONLY the
	 * persisted Vaultman override: a stored icon that disappeared degrades to
	 * the next source WITHOUT the override being purged, so re-installing the
	 * icon pack brings the choice back. Iconic and the add-on publish icons
	 * from their own registries, so they are never filtered by this probe.
	 */
	isKnownIcon?: (icon: string) => boolean;
}

/** Precedence: Vaultman > Iconic > add-on emitted > kind fallback. */
export function resolveAddonIcon(
	input: ResolveAddonIconInput,
): ResolvedAddonIcon {
	const sources: Array<{
		value: AddonIconValue | null | undefined;
		validated: boolean;
	}> = [
		{ value: input.override, validated: true },
		{ value: input.iconic, validated: false },
		{ value: input.emitted, validated: false },
	];

	// A higher-precedence source may carry only a color (Iconic does this).
	// That color still wins, tinting whichever icon ends up rendering.
	let inheritedColor: string | undefined;

	for (const { value, validated } of sources) {
		const color = isNonEmptyString(value?.color) ? value.color : undefined;
		const icon = isNonEmptyString(value?.icon) ? value.icon.trim() : null;
		const usable =
			icon !== null && (!validated || (input.isKnownIcon?.(icon) ?? true));
		if (!usable) {
			// Remember the first color offered, even by a source with no icon.
			inheritedColor ??= color;
			continue;
		}
		const resolvedColor = color ?? inheritedColor;
		return {
			icon,
			...(resolvedColor ? { color: resolvedColor } : {}),
		};
	}
	return {
		icon: input.fallback,
		...(inheritedColor ? { color: inheritedColor } : {}),
	};
}
