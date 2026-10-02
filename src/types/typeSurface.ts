export const HOME_SURFACE_EDGES = ['start', 'end'] as const;
export type HomeSurfaceEdge = (typeof HOME_SURFACE_EDGES)[number];

export type HomeSurfaceIntent =
	| { readonly kind: 'main' }
	| { readonly kind: 'sidebar'; readonly edge: HomeSurfaceEdge };

export type UnsupportedSurfaceKind = 'island' | 'new-window';

export type SurfaceRequest =
	| HomeSurfaceIntent
	| { readonly kind: UnsupportedSurfaceKind };

export type SurfaceAddress<Leaf extends object = object> =
	| { readonly kind: 'main'; readonly leaf: Leaf }
	| {
			readonly kind: 'sidebar';
			readonly edge: HomeSurfaceEdge;
			readonly leaf: Leaf;
		};

export const DEFAULT_HOME_SURFACE: HomeSurfaceIntent = { kind: 'main' };
