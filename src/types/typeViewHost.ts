import type { ThemePreset } from './typeThemePreset';

export type ViewHostMountContext = 'panel' | 'in-editor';

export type NodeElementKind = 'icon' | 'label' | 'detail' | 'media' | 'badges' | 'actions';

export interface BadgeKindMask {
	ops: boolean;
	filters: boolean;
	warnings: boolean;
	inherited: boolean;
	counts: boolean;
}

export interface NodeElementMask {
	icon: boolean;
	label: boolean;
	detail: boolean;
	media: boolean;
	badges: BadgeKindMask;
	actions: boolean;
}

export type NodeElementOverrides = Partial<{
	icon: boolean;
	label: boolean;
	detail: boolean;
	media: boolean;
	badges: Partial<BadgeKindMask>;
	actions: boolean;
}>;

export const UNIVERSAL_DND_VOCAB = {
	dragSource: 'is-being-dragged',
	dragTarget: 'is-being-dragged-over',
	dropIndicator: 'drop-indicator',
	dropIndicatorActive: 'is-active',
	bodyGrabbing: 'is-grabbing',
	ghost: 'drag-ghost',
	ghostSelf: 'drag-ghost-self',
	ghostIcon: 'drag-ghost-icon',
	ghostAction: 'drag-ghost-action',
} as const;

export type UniversalDndVocab = typeof UNIVERSAL_DND_VOCAB;

export interface NoteContextProvider {
	activeFile: () => string | null;
	activeHeadingPath: () => readonly string[];
	cursorPosition: () => { line: number; ch: number } | null;
}

export interface InEditorMountContract {
	hostElement: HTMLElement;
	preset: ThemePreset;
	initialViewMode: 'tree' | 'list' | 'table' | 'grid' | 'cards';
	noteContextProvider: NoteContextProvider;
	unmount(): void;
}
