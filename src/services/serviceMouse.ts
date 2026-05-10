export type MouseGestureIntent = 'primary' | 'secondary' | 'tertiary' | 'ignored' | 'pending';
export type MousePrimaryTiming = 'defer' | 'immediate';
export type MouseGestureBinding = 'single-click' | 'double-click' | 'alt-click' | 'middle-click';
export type NodeMouseAction = 'select' | 'filter' | 'open' | 'node-note' | 'delete';

export interface MouseGestureConfig {
	primary?: MouseGestureBinding | readonly MouseGestureBinding[];
	secondary?: MouseGestureBinding | readonly MouseGestureBinding[];
	tertiary?: MouseGestureBinding | readonly MouseGestureBinding[];
	doubleClickMs?: number;
	primaryTiming?: MousePrimaryTiming;
}

export interface NodeMouseActionConfig {
	primary: NodeMouseAction;
	secondary: NodeMouseAction;
	tertiary: NodeMouseAction;
}

export interface MouseGestureTarget {
	key: string;
	eventTarget?: EventTarget | null;
	ignoreSelector?: string;
}

export interface MouseGestureHandlers {
	primary?: (event: MouseEvent) => void;
	secondary?: (event: MouseEvent) => void;
	tertiary?: (event: MouseEvent) => void;
}

interface NormalizedMouseGestureConfig {
	primary: readonly MouseGestureBinding[];
	secondary: readonly MouseGestureBinding[];
	tertiary: readonly MouseGestureBinding[];
	doubleClickMs: number;
	primaryTiming: MousePrimaryTiming;
}

interface PendingPrimary {
	timer: ReturnType<Window['setTimeout']>;
}

export const NODE_MOUSE_IGNORE_SELECTOR =
	'input, textarea, select, button, .vm-tree-toggle, .vm-node-grid-toggle, .vm-badge, .vm-tree-child-badge-indicator, [role="button"]';

export const DEFAULT_MOUSE_GESTURE_CONFIG: Required<MouseGestureConfig> = {
	primary: ['single-click'],
	secondary: ['double-click'],
	tertiary: ['alt-click', 'middle-click'],
	doubleClickMs: 250,
	primaryTiming: 'defer',
};

export const NODE_MOUSE_GESTURE_CONFIG: MouseGestureConfig = {
	primaryTiming: 'immediate',
};

export const COMMAND_MOUSE_GESTURE_CONFIG: MouseGestureConfig = {
	primaryTiming: 'defer',
};

export const DEFAULT_NODE_MOUSE_ACTIONS: NodeMouseActionConfig = {
	primary: 'filter',
	secondary: 'open',
	tertiary: 'delete',
};

export const LEGACY_NODE_MOUSE_ACTIONS: NodeMouseActionConfig = {
	primary: 'select',
	secondary: 'open',
	tertiary: 'delete',
};

const VALID_NODE_MOUSE_ACTIONS: ReadonlySet<NodeMouseAction> = new Set([
	'select',
	'filter',
	'open',
	'node-note',
	'delete',
]);

export class MouseGestureService {
	private pending = new Map<string, PendingPrimary>();

	handleClick(
		target: MouseGestureTarget,
		event: MouseEvent,
		handlers: MouseGestureHandlers,
		config?: MouseGestureConfig,
	): MouseGestureIntent {
		if (
			target.ignoreSelector &&
			isIgnoredMouseTarget(target.eventTarget ?? event.target, target.ignoreSelector)
		) {
			return 'ignored';
		}

		const resolved = normalizeConfig(config);
		if (matchesTertiaryClick(event, resolved)) {
			this.cancel(target.key);
			event.preventDefault();
			handlers.tertiary?.(event);
			return 'tertiary';
		}

		if (!isPrimaryButtonClick(event)) return 'ignored';
		if (!resolved.primary.includes('single-click')) return 'ignored';
		if (!resolved.secondary.includes('double-click')) {
			handlers.primary?.(event);
			return 'primary';
		}

		const existing = this.pending.get(target.key);
		if (existing) {
			this.cancel(target.key);
			handlers.secondary?.(event);
			return 'secondary';
		}

		if (resolved.primaryTiming === 'immediate') {
			handlers.primary?.(event);
			this.pending.set(target.key, {
				timer: timerWindow().setTimeout(() => {
					this.pending.delete(target.key);
				}, resolved.doubleClickMs),
			});
			return 'primary';
		}

		this.pending.set(target.key, {
			timer: timerWindow().setTimeout(() => {
				this.pending.delete(target.key);
				handlers.primary?.(event);
			}, resolved.doubleClickMs),
		});
		return 'pending';
	}

	handleAuxClick(
		target: MouseGestureTarget,
		event: MouseEvent,
		handlers: MouseGestureHandlers,
		config?: MouseGestureConfig,
	): MouseGestureIntent {
		if (
			target.ignoreSelector &&
			isIgnoredMouseTarget(target.eventTarget ?? event.target, target.ignoreSelector)
		) {
			return 'ignored';
		}
		const resolved = normalizeConfig(config);
		if (!resolved.tertiary.includes('middle-click') || event.button !== 1) return 'ignored';
		this.cancel(target.key);
		event.preventDefault();
		handlers.tertiary?.(event);
		return 'tertiary';
	}

	cancel(key: string): void {
		const pending = this.pending.get(key);
		if (!pending) return;
		timerWindow().clearTimeout(pending.timer);
		this.pending.delete(key);
	}

	cancelAll(): void {
		for (const key of this.pending.keys()) this.cancel(key);
	}
}

export function createMouseGestureService(): MouseGestureService {
	return new MouseGestureService();
}

export function mergeMouseGestureConfig(
	...configs: Array<MouseGestureConfig | null | undefined>
): MouseGestureConfig {
	const merged: MouseGestureConfig = {};
	for (const config of configs) {
		if (!config) continue;
		if (config.primary !== undefined) merged.primary = config.primary;
		if (config.secondary !== undefined) merged.secondary = config.secondary;
		if (config.tertiary !== undefined) merged.tertiary = config.tertiary;
		if (config.doubleClickMs !== undefined) merged.doubleClickMs = config.doubleClickMs;
		if (config.primaryTiming !== undefined) merged.primaryTiming = config.primaryTiming;
	}
	return merged;
}

export function resolveNodeMouseActions(
	raw: Partial<NodeMouseActionConfig> | null | undefined,
	fallback: NodeMouseActionConfig = DEFAULT_NODE_MOUSE_ACTIONS,
): NodeMouseActionConfig {
	return {
		primary: normalizeNodeMouseAction(raw?.primary, fallback.primary),
		secondary: normalizeNodeMouseAction(raw?.secondary, fallback.secondary),
		tertiary: normalizeNodeMouseAction(raw?.tertiary, fallback.tertiary),
	};
}

export function isIgnoredMouseTarget(
	target: EventTarget | null | undefined,
	selector = NODE_MOUSE_IGNORE_SELECTOR,
): boolean {
	const el = target instanceof Element ? target : null;
	return Boolean(el?.closest(selector));
}

function matchesTertiaryClick(
	event: MouseEvent,
	config: NormalizedMouseGestureConfig,
): boolean {
	if (config.tertiary.includes('middle-click') && event.button === 1) return true;
	return config.tertiary.includes('alt-click') && event.altKey && event.button === 0;
}

function isPrimaryButtonClick(event: MouseEvent): boolean {
	return event.button === 0;
}

function normalizeConfig(config: MouseGestureConfig | undefined): NormalizedMouseGestureConfig {
	return {
		primary: asBindingList(config?.primary, DEFAULT_MOUSE_GESTURE_CONFIG.primary),
		secondary: asBindingList(config?.secondary, DEFAULT_MOUSE_GESTURE_CONFIG.secondary),
		tertiary: asBindingList(config?.tertiary, DEFAULT_MOUSE_GESTURE_CONFIG.tertiary),
		doubleClickMs: config?.doubleClickMs ?? DEFAULT_MOUSE_GESTURE_CONFIG.doubleClickMs,
		primaryTiming: config?.primaryTiming ?? DEFAULT_MOUSE_GESTURE_CONFIG.primaryTiming,
	};
}

function asBindingList(
	value: MouseGestureBinding | readonly MouseGestureBinding[] | undefined,
	fallback: MouseGestureBinding | readonly MouseGestureBinding[],
): readonly MouseGestureBinding[] {
	const source = value ?? fallback;
	if (Array.isArray(source)) return source as readonly MouseGestureBinding[];
	return [source as MouseGestureBinding];
}

function normalizeNodeMouseAction(
	value: unknown,
	fallback: NodeMouseAction,
): NodeMouseAction {
	return typeof value === 'string' && VALID_NODE_MOUSE_ACTIONS.has(value as NodeMouseAction)
		? (value as NodeMouseAction)
		: fallback;
}

function timerWindow(): Window {
	return typeof activeWindow === 'undefined' ? window : activeWindow;
}
