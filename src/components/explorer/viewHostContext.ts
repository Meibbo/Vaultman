import type { ViewHostService } from '../../services/serviceViewHost.svelte';
import type { ThemePreset } from '../../types/typeThemePreset';
import type { NodeElementMask } from '../../types/typeViewHost';

export const VIEW_HOST_KEY: unique symbol = Symbol('view.host');
export const NODE_ELEMENT_MASK_KEY: unique symbol = Symbol('view.node-element-mask');
export const PRESET_KEY: unique symbol = Symbol('view.preset');

export type ViewHostContextValue = ViewHostService;
export type NodeElementMaskContextValue = { value: () => NodeElementMask };
export type PresetContextValue = { value: () => ThemePreset };
