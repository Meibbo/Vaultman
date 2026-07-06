import { describe, expect, it } from 'vitest';
import {
	DEFAULT_VIEW_CONFIG,
	EMPTY_CASCADE,
	ENGINE_CAPABILITIES,
	ENGINE_DEFAULT_MODE,
	ENGINE_MODES,
	VIEW_ENGINES,
	VIEW_ORIENTATIONS,
	VIEW_SCOPES,
	capabilityOf,
	isModeForEngine,
	isViewScopeSupported,
	normalizeViewConfig,
	resolveBinding,
	resolveViewConfig,
	serializeViewConfig,
	viewConfigsEquivalent,
} from '../../../src/types/typeViewConfig';
import type {
	CascadeContext,
	ViewBinding,
	ViewConfig,
} from '../../../src/types/typeViewConfig';

describe('typeViewConfig — axes + engine-naming MAP', () => {
	it('engines are exactly the LOCKED canon (Linear/Geometry/Canvas/Charts — ADR 0012)', () => {
		expect([...VIEW_ENGINES]).toEqual(['Linear', 'Geometry', 'Canvas', 'Charts']);
	});

	it('Table is NOT an engine (folded into Geometry as a mode, D-VD-2)', () => {
		expect(VIEW_ENGINES as readonly string[]).not.toContain('Table');
	});

	it('orientation axis (legacy h/v; canon direction-split deferred to the axis slice)', () => {
		expect([...VIEW_ORIENTATIONS]).toEqual(['horizontal', 'vertical']);
	});

	it('viewScope axis = off | per-level | per-parent (canon 4-value set deferred)', () => {
		expect([...VIEW_SCOPES]).toEqual(['off', 'per-level', 'per-parent']);
	});

	it('does NOT expose a `matrix` engine (proto matrix = a Geometry sub-style)', () => {
		expect(VIEW_ENGINES as readonly string[]).not.toContain('matrix');
	});

	it('Linear modes = flat/indent/cascade/detail (canon 05; indent=tree, cascade=miller base)', () => {
		expect([...ENGINE_MODES.Linear]).toEqual(['flat', 'indent', 'cascade', 'detail']);
	});

	it('Geometry modes = grid/cards/masonry/table (group-box removed, table folded in)', () => {
		expect([...ENGINE_MODES.Geometry]).toEqual(['grid', 'cards', 'masonry', 'table']);
		expect(ENGINE_MODES.Geometry as readonly string[]).not.toContain('group-box');
	});

	it('Charts mode = chart (canary placeholder; renderer deferred N4)', () => {
		expect([...ENGINE_MODES.Charts]).toEqual(['chart']);
	});

	it('every engine has a default mode that is valid for that engine', () => {
		for (const engine of VIEW_ENGINES) {
			expect(isModeForEngine(engine, ENGINE_DEFAULT_MODE[engine])).toBe(true);
		}
	});

	it('isModeForEngine rejects a cross-engine mode', () => {
		expect(isModeForEngine('Linear', 'grid')).toBe(false);
		expect(isModeForEngine('Geometry', 'indent')).toBe(false);
	});
});

describe('typeViewConfig — centralized defaults', () => {
	it('DEFAULT_VIEW_CONFIG is the single source: Linear/indent/vertical/off', () => {
		expect(DEFAULT_VIEW_CONFIG).toEqual({
			engine: 'Linear',
			mode: 'indent',
			orientation: 'vertical',
			viewScope: 'off',
		});
	});

	it('an empty partial resolves to exactly the defaults', () => {
		expect(resolveViewConfig({})).toEqual(DEFAULT_VIEW_CONFIG);
	});

	it('resolving against an empty cascade equals resolving with no cascade', () => {
		expect(resolveViewConfig({ mode: 'cascade' }, EMPTY_CASCADE)).toEqual(
			resolveViewConfig({ mode: 'cascade' }),
		);
	});
});

describe('typeViewConfig — sparse merge by scope (D-PSS-1 cascade)', () => {
	it('inner cascade layer overrides outer; binding payload overrides both', () => {
		const cascade: CascadeContext = {
			layers: [
				{ orientation: 'horizontal' }, // outermost (workspace)
				{ orientation: 'vertical', mode: 'flat' }, // innermost (panel) wins on orientation
			],
		};
		const resolved = resolveViewConfig({ viewScope: 'off' }, cascade);
		// orientation: innermost layer (vertical) wins over outer (horizontal)
		expect(resolved.orientation).toBe('vertical');
		// mode: from innermost layer
		expect(resolved.mode).toBe('flat');
		// engine: nobody asserted → default
		expect(resolved.engine).toBe('Linear');
	});

	it('absent keys cascade, present keys assert (sparse semantics)', () => {
		const cascade: CascadeContext = { layers: [{ engine: 'Geometry', mode: 'cards' }] };
		// binding asserts only orientation; engine+mode inherited from cascade
		const resolved = resolveViewConfig({ orientation: 'horizontal' }, cascade);
		expect(resolved.engine).toBe('Geometry');
		expect(resolved.mode).toBe('cards');
		expect(resolved.orientation).toBe('horizontal');
	});

	it('an explicit undefined in a layer never clobbers an inherited value', () => {
		const cascade: CascadeContext = {
			layers: [{ orientation: 'horizontal' }, { orientation: undefined }],
		};
		expect(resolveViewConfig({}, cascade).orientation).toBe('horizontal');
	});

	it('repairs an incoherent inherited (engine, mode) pair to the engine default', () => {
		// cascade left a Geometry mode, but the binding switches engine to Linear
		const cascade: CascadeContext = { layers: [{ mode: 'cards' }] };
		const resolved = resolveViewConfig({ engine: 'Linear' }, cascade);
		expect(resolved.engine).toBe('Linear');
		// 'cards' is not a Linear mode → repaired to Linear's default
		expect(resolved.mode).toBe(ENGINE_DEFAULT_MODE.Linear);
		expect(isModeForEngine(resolved.engine, resolved.mode)).toBe(true);
	});
});

describe('typeViewConfig — absolute vs relative bindings ("miller")', () => {
	const cascade: CascadeContext = {
		layers: [{ engine: 'Geometry', mode: 'cards', orientation: 'horizontal' }],
	};

	it('ABSOLUTE "miller" fixes every axis, ignoring the cascade', () => {
		const millerAbsolute: ViewBinding = {
			id: 'miller-absolute',
			label: 'Miller (absolute)',
			payload: {
				engine: 'Linear',
				mode: 'cascade',
				orientation: 'horizontal',
				viewScope: 'off',
			},
			surfaces: ['command'],
		};
		const resolved = resolveBinding(millerAbsolute, cascade);
		expect(resolved).toEqual({
			engine: 'Linear',
			mode: 'cascade',
			orientation: 'horizontal',
			viewScope: 'off',
		});
	});

	it('RELATIVE "miller" fixes only mode, inheriting the rest from cascade', () => {
		const millerRelative: ViewBinding = {
			id: 'miller-relative',
			label: 'Make it miller',
			payload: { mode: 'cascade' }, // only asserts mode
			surfaces: ['hotkey'],
		};
		const resolved = resolveBinding(millerRelative, cascade);
		// mode asserted; but engine inherited Geometry → (Geometry, miller) is incoherent,
		// so the resolver repairs mode. This documents that a relative mode-only binding
		// is only coherent when the inherited engine actually owns that mode.
		expect(resolved.engine).toBe('Geometry');
		expect(resolved.mode).toBe(ENGINE_DEFAULT_MODE.Geometry);
	});

	it('RELATIVE "go horizontal" fixes one axis and inherits engine/mode', () => {
		const goHorizontal: ViewBinding = {
			id: 'orient-horizontal',
			label: 'Horizontal',
			payload: { orientation: 'horizontal' },
			surfaces: ['axis-selector'],
		};
		const verticalCascade: CascadeContext = {
			layers: [{ engine: 'Linear', mode: 'indent', orientation: 'vertical' }],
		};
		const resolved = resolveBinding(goHorizontal, verticalCascade);
		expect(resolved.engine).toBe('Linear');
		expect(resolved.mode).toBe('indent');
		expect(resolved.orientation).toBe('horizontal');
	});
});

describe('typeViewConfig — normalize round-trip (reflexive active-state key)', () => {
	it('normalize is stable regardless of property insertion order', () => {
		const a: ViewConfig = {
			engine: 'Linear',
			mode: 'cascade',
			orientation: 'horizontal',
			viewScope: 'off',
		};
		const b: ViewConfig = {
			viewScope: 'off',
			orientation: 'horizontal',
			mode: 'cascade',
			engine: 'Linear',
		} as ViewConfig;
		expect(normalizeViewConfig(a)).toBe(normalizeViewConfig(b));
	});

	it('two DIFFERENT bindings resolving to the same view normalize to the SAME key', () => {
		// b1: the 3-axis selector picks Linear + miller + horizontal explicitly
		const b1: ViewBinding = {
			id: 'axis-miller',
			label: 'Linear · miller · horizontal',
			payload: {
				engine: 'Linear',
				mode: 'cascade',
				orientation: 'horizontal',
				viewScope: 'off',
			},
			surfaces: ['axis-selector'],
		};
		// b2: a flat-list shortcut "Miller columns" that asserts the same thing but
		// reaches it via a different route + relies on the default viewScope
		const b2: ViewBinding = {
			id: 'flat-miller',
			label: 'Miller columns',
			payload: { engine: 'Linear', mode: 'cascade', orientation: 'horizontal' },
			surfaces: ['flat-list'],
		};
		const k1 = normalizeViewConfig(resolveBinding(b1));
		const k2 = normalizeViewConfig(resolveBinding(b2));
		expect(k1).toBe(k2);
		expect(viewConfigsEquivalent(resolveBinding(b1), resolveBinding(b2))).toBe(true);
	});

	it('distinct views normalize to distinct keys', () => {
		const tree = resolveViewConfig({ engine: 'Linear', mode: 'indent' });
		const grid = resolveViewConfig({ engine: 'Geometry', mode: 'grid' });
		expect(normalizeViewConfig(tree)).not.toBe(normalizeViewConfig(grid));
	});

	it('reserved fields (layerId/placement/relations) fold into the key only when present', () => {
		const plain = resolveViewConfig({ engine: 'Linear' });
		expect(normalizeViewConfig(plain)).not.toContain('layerId');

		const layered: ViewConfig = { ...plain, layerId: 'layer-2' };
		expect(normalizeViewConfig(layered)).toContain('layerId=layer-2');

		const placed: ViewConfig = {
			...plain,
			placement: { regime: 'coordinates', x: 10, y: 20, z: 1 },
		};
		expect(normalizeViewConfig(placed)).toContain('placement=coordinates:10,20,1');
	});
});

describe('typeViewConfig — capability matrix (conflict #4: proto promises > renders)', () => {
	it('only Linear/indent resolves scoped-view overrides', () => {
		expect(capabilityOf({ engine: 'Linear', mode: 'indent' })).toEqual({
			levelViews: true,
			parentViews: true,
			renderEmbedded: true,
		});
	});

	it('Linear/flat, cascade, detail do NOT honor scoped overrides', () => {
		for (const mode of ['flat', 'cascade', 'detail'] as const) {
			expect(capabilityOf({ engine: 'Linear', mode })).toEqual({
				levelViews: false,
				parentViews: false,
				renderEmbedded: false,
			});
		}
	});

	it('no Geometry/Canvas/Charts mode honors scoped overrides', () => {
		const cases = [
			{ engine: 'Geometry', mode: 'grid' },
			{ engine: 'Geometry', mode: 'cards' },
			{ engine: 'Geometry', mode: 'masonry' },
			{ engine: 'Geometry', mode: 'table' },
			{ engine: 'Canvas', mode: 'mindmap' },
			{ engine: 'Charts', mode: 'chart' },
		] as const;
		for (const c of cases) {
			const cap = capabilityOf(c);
			expect(cap.levelViews || cap.parentViews || cap.renderEmbedded).toBe(false);
		}
	});

	it('isViewScopeSupported: off always ok; per-level/per-parent gated by capability', () => {
		const treeScoped: ViewConfig = {
			engine: 'Linear',
			mode: 'indent',
			orientation: 'vertical',
			viewScope: 'per-level',
		};
		expect(isViewScopeSupported(treeScoped)).toBe(true);

		const gridScoped: ViewConfig = {
			engine: 'Geometry',
			mode: 'grid',
			orientation: 'vertical',
			viewScope: 'per-parent',
		};
		expect(isViewScopeSupported(gridScoped)).toBe(false);

		const gridOff: ViewConfig = { ...gridScoped, viewScope: 'off' };
		expect(isViewScopeSupported(gridOff)).toBe(true);
	});

	it('every engine in the canon has a capability entry per declared mode', () => {
		for (const engine of VIEW_ENGINES) {
			for (const mode of ENGINE_MODES[engine]) {
				expect(ENGINE_CAPABILITIES[engine][mode]).toBeDefined();
			}
		}
	});
});

describe('typeViewConfig — .scene serialization parity (D-PSS-4)', () => {
	it('serializes to a plain structural object (no functions/instances)', () => {
		const cfg = resolveViewConfig({ engine: 'Geometry', mode: 'cards' });
		const serialized = serializeViewConfig(cfg);
		expect(serialized).toEqual({
			engine: 'Geometry',
			mode: 'cards',
			orientation: 'vertical',
			viewScope: 'off',
		});
		expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
	});

	it('round-trips through serialize → resolve → normalize unchanged', () => {
		const cfg = resolveViewConfig({
			engine: 'Linear',
			mode: 'cascade',
			orientation: 'horizontal',
		});
		const serialized = serializeViewConfig(cfg);
		const rehydrated = resolveViewConfig(serialized as Partial<ViewConfig>);
		expect(normalizeViewConfig(rehydrated)).toBe(normalizeViewConfig(cfg));
	});

	it('includes reserved fields in serialization only when present', () => {
		const cfg: ViewConfig = {
			...resolveViewConfig({ engine: 'Linear' }),
			layerId: 'L1',
			placement: { regime: 'coordinates', x: 1, y: 2 },
		};
		const serialized = serializeViewConfig(cfg);
		expect(serialized.layerId).toBe('L1');
		expect(serialized.placement).toEqual({ regime: 'coordinates', x: 1, y: 2 });
	});
});
