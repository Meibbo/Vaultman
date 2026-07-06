// typeViewConfig — the DURABLE view-addressing normal form + binding seam (lane C).
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS IS (D-C-8, spec 03-tracer-viewconfig-cascade §Aclaración dev)
// ─────────────────────────────────────────────────────────────────────────────
// `ViewConfig` is the NORMAL FORM of a view: the resolved artifact
// (engine + mode + orientation + viewScope, plus reserved placement/layerId/relations).
// It is NOT the primary key of a view and is NOT hardcoded to the proto's 3-axis
// selector. It is COMPUTED, never pre-enumerated — pre-enumerating
// engine × mode × orientation × … as rows of an index explodes combinatorially,
// loses axis composition, and cannot be validated against the capability matrix.
//
// A view is *addressed* by a `ViewBinding` (a named/aliased entry point: the 3-axis
// selector, a flat list item, `"miller"` on its own, a command, a hotkey — all of
// them produce a binding). Bindings carry a SPARSE `Partial<ViewConfig>` payload and
// merge through the D-PSS-1 scope cascade via `resolveViewConfig`. `normalizeViewConfig`
// produces a canonical key for active-state reflection (which binding lights up in the
// toolbar) and for stable dedup / `.scene` round-trip (D-PSS-4).
//
// This IS ADR 0005 applied to views: selecting a view = Action → Operation
// (`setViewConfig`); `ViewBinding` is the binding→ActionNode→Operation link for views.
// It is the reshape of ledger cluster-02 conflict #8 (proto window-globals
// `__vmSelMode`/`__vmCellOrder`/`__vmFocusedParent` + DOM hit-test as the primary
// model → registry + resolver).
//
// SCOPE OF THIS LANE (timeboxed): TYPES ONLY + pure resolve/normalize/defaults.
// The runtime registry of bindings and the multi-surface projection
// (palette / flat list / 3-axis / command / hotkey) belong to P.D
// (InputRouter + ActionNode index) + SF (WorkspaceMediator), built ON these types.
// Do not add a registry runtime here or it stops being a tracer.
//
// ─────────────────────────────────────────────────────────────────────────────
// DISAMBIGUATION — `ViewConfig` (this file) vs `view-config` (glossary cell bridge)
// ─────────────────────────────────────────────────────────────────────────────
// The glossary term `view-config` (a.k.a. `specific_view`) is the user-editable
// role→slot/order CELL-LAYOUT map and the Bases IN/OUT bridge — a DIFFERENT plane.
// `ViewConfig` here is the engine/mode/orientation/viewScope ADDRESSING normal form.
// `src/types/typeViews.ts` (`ExplorerRenderModel`, `ExplorerViewMode`) is the
// render-projection plane (rows/cells/layers). These three planes are orthogonal;
// keep them distinct.

// ─────────────────────────────────────────────────────────────────────────────
// Engine / mode / orientation / viewScope axes (glossary canon)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render engine = reusable layout-renderer family. Canon (ADR 0012 / 05-view-canon,
 * NOW-tier LOCKED grill 2026-06-17/18): **Linear / Geometry / Canvas / Charts**.
 *
 * ENGINE CANON (ledger C-12 + ADR 0012 — supersedes the earlier tracer's
 * `Linear/Geometry/Table/Canvas`, which wrongly promoted Table to an engine):
 * | Engine    | Regime      | Notes                                                      |
 * |-----------|-------------|------------------------------------------------------------|
 * | `Linear`  | slot        | 1D ordered/hierarchical stack; fixed-height; shared runtime |
 * | `Geometry`| slot        | 2D positional cells; variable-height+lanes; **Table = a    |
 * |           |             | MODE here, not an engine** (Bases column layout)           |
 * | `Canvas`  | coordinates | free spatial + edges; separate runtime — DEFERRED N4       |
 * | `Charts`  | —           | scales/axes/marks (LayerChart) — canary placeholder, N4    |
 *
 * `Table` is intentionally NOT an engine: it folded into Geometry as a mode (D-VD-2,
 * repo evidence: ViewNodeGrid/Table/Cards already share the Geometry variable runtime).
 * `Charts` is a canary placeholder (sandbox tolerates placeholder union members; stable=0;
 * no renderer until N4). Deferred axes (orientation-semantics, direction,
 * child_global_direction, viewScope-4) are NOT in this types slice — see 05-view-canon
 * §Axes; this file keeps the legacy orientation=h/v + viewScope=off/level/parent until the
 * axis-adoption slice. `matrix` remains absent (proto `matrix` = a Geometry sub-style).
 */
export const VIEW_ENGINES = ['Linear', 'Geometry', 'Canvas', 'Charts'] as const;
export type ViewEngine = (typeof VIEW_ENGINES)[number];

/**
 * Mode = selectable engine variant (glossary). Modes are namespaced by engine; a
 * `(engine, mode)` pair is what the capability matrix is keyed on.
 *
 * MODE MAP (proto v12 → canon): proto orientation values Down/Up/Side-Miller/Drill
 * and proto modes flat-list/tiles/accordion are MODES or sub-modes here, NOT
 * `orientation` (the glossary reduces orientation to horizontal|vertical).
 */
// Modes per engine (05-view-canon LOCKED). Linear: flat/indent/cascade/detail
// (indent=tree-indent · flat=flat-list · cascade=miller's column-per-level base ·
// detail=NN master-detail). Geometry: grid/cards/masonry/table (group-box REMOVED =
// a viewBuilder+viewScope composition, not a primitive; masonry + table ADDED).
// Charts: `chart` placeholder. Named views like "miller"/"tree" are BINDINGS over a
// (engine,mode) pair, not modes themselves.
export const LINEAR_MODES = ['flat', 'indent', 'cascade', 'detail'] as const;
export const GEOMETRY_MODES = ['grid', 'cards', 'masonry', 'table'] as const;
export const CANVAS_MODES = ['mindmap', 'graph'] as const;
export const CHARTS_MODES = ['chart'] as const;

export type LinearMode = (typeof LINEAR_MODES)[number];
export type GeometryMode = (typeof GEOMETRY_MODES)[number];
export type CanvasMode = (typeof CANVAS_MODES)[number];
export type ChartsMode = (typeof CHARTS_MODES)[number];

/** All modes across all engines (loose union; pair validity is enforced separately). */
export type ViewMode = LinearMode | GeometryMode | CanvasMode | ChartsMode;

/** The canonical default mode for each engine (used when a binding fixes only `engine`). */
export const ENGINE_DEFAULT_MODE: { readonly [E in ViewEngine]: ViewMode } = {
	Linear: 'indent',
	Geometry: 'grid',
	Canvas: 'mindmap',
	Charts: 'chart',
} as const;

/** Valid modes for a given engine, as a runtime-checkable set. */
export const ENGINE_MODES: { readonly [E in ViewEngine]: readonly ViewMode[] } = {
	Linear: LINEAR_MODES,
	Geometry: GEOMETRY_MODES,
	Canvas: CANVAS_MODES,
	Charts: CHARTS_MODES,
} as const;

export function isModeForEngine(engine: ViewEngine, mode: ViewMode): boolean {
	return (ENGINE_MODES[engine] as readonly string[]).includes(mode);
}

/**
 * Orientation = horizontal | vertical layout flag (glossary canon). It is a FLAG,
 * not a mode. The proto's rich orientation vocabulary (drill/accordion/radial/etc.)
 * lives in `mode`/sub-modes, never here.
 */
export const VIEW_ORIENTATIONS = ['horizontal', 'vertical'] as const;
export type ViewOrientation = (typeof VIEW_ORIENTATIONS)[number];

/**
 * viewScope = scoped-views axis (off / per-level / per-parent). `off` = one view for
 * the whole explorer (the default, always supported). per-level/per-parent are flag
 * features (pyramid N3) and are only meaningful where the engine+mode supports them
 * (see ENGINE_CAPABILITIES). The detailed `levelViews[depth]` / `parentViews[id]`
 * override maps are NOT part of this tracer (they belong to the scoped-views spec);
 * here we only carry the axis value so the resolver/UI can validate support.
 */
export const VIEW_SCOPES = ['off', 'per-level', 'per-parent'] as const;
export type ViewScope = (typeof VIEW_SCOPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Reserved (designed-for, not implemented) — D7 whiteboard node distribution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Placement regime (slot vs coordinates). Reserved field: the schema reserves room
 * for xyz/floating placement (whiteboard design-input) without implementing it.
 * `slot` = the rigid default; `coordinates` = flag N3 (impl deferred).
 */
export interface ViewPlacement {
	regime: 'slot' | 'coordinates';
	/** xyz reserved; z = layer ordering (Krita model). Untyped beyond optional numbers. */
	x?: number;
	y?: number;
	z?: number;
}

/**
 * Relation hints (reserved). The whiteboard model wants relations between nodes
 * (edges/links) to be addressable by view-config; reserved here as an opaque,
 * forward-compatible field. Not implemented this lane.
 */
export interface ViewRelations {
	/** Opaque relation descriptors; shape decided by the Symbiont Explorer relations spec. */
	readonly hints?: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewConfig — the NORMAL FORM (resolved artifact)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The resolved view artifact. Produced by `resolveViewConfig`, never pre-enumerated.
 * Reserved fields (`placement`/`layerId`/`relations`) are designed-for per D7; they
 * are optional and default to undefined / slot so today's resolver ignores them.
 */
export interface ViewConfig {
	engine: ViewEngine;
	mode: ViewMode;
	orientation: ViewOrientation;
	viewScope: ViewScope;
	/** Reserved (D7): placement regime. Defaults to slot when present. */
	placement?: ViewPlacement;
	/** Reserved (D7): explorer-layer id this view binds to. */
	layerId?: string;
	/** Reserved (D7): relation hints. */
	relations?: ViewRelations;
}

/**
 * THE ONE PLACE defaults live. Avoids the proto split-brain (DEFAULT_VIEW vs app.jsx,
 * umbrella shard 04). Any binding/scope that does not assert an axis inherits from
 * here (after any scope-cascade contributions). Linear tree-indent vertical, scope off
 * = the native baseline view.
 */
export const DEFAULT_VIEW_CONFIG: ViewConfig = {
	engine: 'Linear',
	mode: 'indent',
	orientation: 'vertical',
	viewScope: 'off',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Capability matrix (ledger cluster-02 conflict #4)
// ─────────────────────────────────────────────────────────────────────────────
//
// The proto UI offers levelViews/parentViews/renderEmbedded on every renderer but
// only Linear tree-indent actually resolves them. Encoding support per (engine, mode)
// lets the resolver/UI validate instead of silently lying ("the proto promises more
// than it renders"). VERIFIED reality: only Linear/tree-indent = all true today.

export interface EngineModeCapability {
	/** per-level scoped override (levelViews[depth]) is honored. */
	readonly levelViews: boolean;
	/** per-parent scoped override (parentViews[id]) is honored. */
	readonly parentViews: boolean;
	/** a non-linear child view can be embedded inside this renderer. */
	readonly renderEmbedded: boolean;
}

const NO_SCOPED_SUPPORT: EngineModeCapability = {
	levelViews: false,
	parentViews: false,
	renderEmbedded: false,
} as const;

const FULL_SCOPED_SUPPORT: EngineModeCapability = {
	levelViews: true,
	parentViews: true,
	renderEmbedded: true,
} as const;

/**
 * Capability matrix keyed by engine then mode. Only Linear/`indent` (tree) resolves
 * scoped-view overrides today (verified against the proto: flat/cascade/detail do NOT
 * apply overrides). Everything else = no scoped support. This is the type-level
 * expression of conflict #4 — the resolver/UI consults it before exposing scope controls.
 */
export const ENGINE_CAPABILITIES: {
	readonly [E in ViewEngine]: { readonly [m: string]: EngineModeCapability };
} = {
	Linear: {
		indent: FULL_SCOPED_SUPPORT,
		flat: NO_SCOPED_SUPPORT,
		cascade: NO_SCOPED_SUPPORT,
		detail: NO_SCOPED_SUPPORT,
	},
	Geometry: {
		grid: NO_SCOPED_SUPPORT,
		cards: NO_SCOPED_SUPPORT,
		masonry: NO_SCOPED_SUPPORT,
		table: NO_SCOPED_SUPPORT,
	},
	Canvas: {
		mindmap: NO_SCOPED_SUPPORT,
		graph: NO_SCOPED_SUPPORT,
	},
	Charts: {
		chart: NO_SCOPED_SUPPORT,
	},
} as const;

/** Look up the capability of a resolved config's (engine, mode). Unknown pairs = no support. */
export function capabilityOf(cfg: Pick<ViewConfig, 'engine' | 'mode'>): EngineModeCapability {
	return ENGINE_CAPABILITIES[cfg.engine][cfg.mode] ?? NO_SCOPED_SUPPORT;
}

/**
 * Whether a resolved config's requested viewScope is actually supported by its
 * engine+mode. `off` is always supported; per-level needs `levelViews`; per-parent
 * needs `parentViews`. The resolver uses this to refuse "the proto UI lies" states.
 */
export function isViewScopeSupported(cfg: ViewConfig): boolean {
	if (cfg.viewScope === 'off') return true;
	const cap = capabilityOf(cfg);
	if (cfg.viewScope === 'per-level') return cap.levelViews;
	return cap.parentViews;
}

// ─────────────────────────────────────────────────────────────────────────────
// Binding seam (D-C-8) — ViewBinding / cascade / resolve / normalize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The surfaces a binding can be projected onto. A single binding may appear on
 * several surfaces; projection is P.D/SF's job — this is only the descriptor the
 * registry will read so a new binding shows up on all its surfaces from ONE source.
 */
export const VIEW_BINDING_SURFACES = [
	'axis-selector', // the proto's 3-axis engine/mode/orientation selector
	'flat-list', // a flat list of named views
	'command', // command palette
	'hotkey', // keyboard shortcut
	'menu', // a view menu / overlay entry
] as const;
export type ViewBindingSurface = (typeof VIEW_BINDING_SURFACES)[number];

/**
 * A named/aliased entry point to a view (ADR 0005 link binding→ActionNode→Operation
 * `setViewConfig`). `payload` is SPARSE: the keys present = what the binding ASSERTS;
 * absent keys CASCADE (inherited from scope, then defaults). This is what lets
 * `"miller"` be either ABSOLUTE (payload fixes every axis) or RELATIVE (payload fixes
 * only `mode: 'miller'`, inheriting engine/orientation/scope from context).
 */
export interface ViewBinding {
	id: string;
	label: string;
	/** Sparse assertion. Present keys win over scope/defaults; absent keys cascade. */
	payload: Partial<ViewConfig>;
	/** Where this binding is projected. */
	surfaces: readonly ViewBindingSurface[];
}

/**
 * The scope cascade context (D-PSS-1: facets × scopes, "C inside B"). Each layer is a
 * sparse `Partial<ViewConfig>` — the same sparse-merge model as the `.scene` payload
 * (D-PSS-4). Layers are ordered OUTERMOST → INNERMOST (e.g. workspace → scene → panel);
 * inner layers override outer ones, and the binding payload overrides them all.
 *
 * NOTE: this is the *view facet* of the PSS cascade only. The full PSS resolver
 * (all facets, profiles, storage) is D-PSS scope, not this tracer; we model just the
 * layered sparse-merge the view facet needs so resolve/normalize can be tested.
 */
export interface CascadeContext {
	/** Sparse view-config layers, outermost first. */
	readonly layers: readonly Partial<ViewConfig>[];
}

/** An empty cascade — resolution falls straight back to DEFAULT_VIEW_CONFIG. */
export const EMPTY_CASCADE: CascadeContext = { layers: [] } as const;

/**
 * Sparse-merge a list of partials left→right (later wins), dropping undefined values
 * so an explicitly-absent key never clobbers an inherited one. Same shape as the
 * `.scene` sparse merge.
 */
function mergeSparse(partials: readonly Partial<ViewConfig>[]): Partial<ViewConfig> {
	const out: Partial<ViewConfig> = {};
	for (const p of partials) {
		for (const k of Object.keys(p) as (keyof ViewConfig)[]) {
			const v = p[k];
			if (v !== undefined) {
				// Index-erased assignment: keys are validated by the ViewConfig type at the
				// call boundary; the merge itself is shape-generic.
				(out as Record<string, unknown>)[k] = v;
			}
		}
	}
	return out;
}

/**
 * Resolve a (possibly sparse) binding payload against the scope cascade into the
 * NORMAL FORM. Precedence (lowest→highest): DEFAULT_VIEW_CONFIG → cascade layers
 * (outermost→innermost) → the binding payload. After merge, if the resolved
 * (engine, mode) pair is invalid (e.g. inherited a Geometry mode under Linear), the
 * mode is repaired to the engine's default so the artifact is always well-formed.
 *
 * This is the single function every addressing producer (3-axis selector, flat list,
 * `"miller"`, command, hotkey) funnels through, so the same input always yields the
 * same artifact regardless of route — and an ABSOLUTE binding ignores the cascade for
 * the axes it fixes while a RELATIVE binding inherits the rest.
 */
export function resolveViewConfig(
	partial: Partial<ViewConfig>,
	cascadeContext: CascadeContext = EMPTY_CASCADE,
): ViewConfig {
	const merged = mergeSparse([
		DEFAULT_VIEW_CONFIG,
		...cascadeContext.layers,
		partial,
	]);

	const engine = (merged.engine ?? DEFAULT_VIEW_CONFIG.engine);
	let mode = (merged.mode ?? ENGINE_DEFAULT_MODE[engine]);
	// Repair an incoherent inherited pair: if the cascade handed us a mode that does
	// not belong to the resolved engine, fall back to that engine's default mode.
	if (!isModeForEngine(engine, mode)) {
		mode = ENGINE_DEFAULT_MODE[engine];
	}

	const resolved: ViewConfig = {
		engine,
		mode,
		orientation: (merged.orientation ?? DEFAULT_VIEW_CONFIG.orientation),
		viewScope: (merged.viewScope ?? DEFAULT_VIEW_CONFIG.viewScope),
	};
	if (merged.placement !== undefined) resolved.placement = merged.placement;
	if (merged.layerId !== undefined) resolved.layerId = merged.layerId;
	if (merged.relations !== undefined) resolved.relations = merged.relations;
	return resolved;
}

/** Convenience: resolve a whole ViewBinding (its payload) against a cascade. */
export function resolveBinding(
	binding: ViewBinding,
	cascadeContext: CascadeContext = EMPTY_CASCADE,
): ViewConfig {
	return resolveViewConfig(binding.payload, cascadeContext);
}

/**
 * Canonical string key for a resolved ViewConfig. Used to (a) reflect active state —
 * which binding(s) "light up" in the toolbar when a view is mounted — and (b) provide
 * stable dedup / `.scene` round-trip. Two different bindings that resolve to the same
 * view MUST normalize to the same key; that is the property `normalize(resolve(b1)) ===
 * normalize(resolve(b2-equivalent))` tested in the suite.
 *
 * The key is deterministic and stable across object-key ordering. Reserved fields are
 * folded in only when present, so today's scope-off slot views round-trip to a short key.
 */
export function normalizeViewConfig(cfg: ViewConfig): string {
	const parts = [
		`engine=${cfg.engine}`,
		`mode=${cfg.mode}`,
		`orientation=${cfg.orientation}`,
		`viewScope=${cfg.viewScope}`,
	];
	if (cfg.layerId !== undefined) parts.push(`layerId=${cfg.layerId}`);
	if (cfg.placement !== undefined) {
		const p = cfg.placement;
		parts.push(
			`placement=${p.regime}:${p.x ?? ''},${p.y ?? ''},${p.z ?? ''}`,
		);
	}
	if (cfg.relations?.hints?.length) {
		parts.push(`relations=${[...cfg.relations.hints].sort().join('|')}`);
	}
	return parts.join(';');
}

/** Two configs are equivalent iff they normalize to the same key. */
export function viewConfigsEquivalent(a: ViewConfig, b: ViewConfig): boolean {
	return normalizeViewConfig(a) === normalizeViewConfig(b);
}

/**
 * Serialize a resolved ViewConfig to the plain object that nests inside the `.scene`
 * view facet (D-PSS-4, `vm-scene: 1`). It is intentionally just the structural fields
 * (no functions, no class instances) so it round-trips clean through layered YAML.
 * Provided so V.D/PSS can prove serialization parity against this normal form.
 */
export function serializeViewConfig(cfg: ViewConfig): Record<string, unknown> {
	const out: Record<string, unknown> = {
		engine: cfg.engine,
		mode: cfg.mode,
		orientation: cfg.orientation,
		viewScope: cfg.viewScope,
	};
	if (cfg.placement !== undefined) out.placement = { ...cfg.placement };
	if (cfg.layerId !== undefined) out.layerId = cfg.layerId;
	if (cfg.relations !== undefined) out.relations = { ...cfg.relations };
	return out;
}
