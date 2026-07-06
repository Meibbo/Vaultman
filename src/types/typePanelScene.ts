export type PanelId = string;
export type SceneId = string;
export type SurfaceId = string;
export type TileId = string;
export type ProviderId = string;

export const PANEL_KINDS = ['panelExplorer', 'panelData', 'panelContent', 'custom-panel'] as const;

export type PanelKind = (typeof PANEL_KINDS)[number];

export type PanelSelectionCommand =
	| { kind: 'replace'; ids: readonly string[]; focusedId?: string }
	| { kind: 'add'; ids: readonly string[] }
	| { kind: 'remove'; ids: readonly string[] }
	| { kind: 'toggle'; ids: readonly string[] };

export interface PanelSelectionPort {
	read(): ReadonlySet<string>;
	select(command: PanelSelectionCommand): void;
	clear(): void;
}

export interface PanelProjectionPort {
	readVisibleIds(): readonly string[];
	readFocusedId?(): string | null;
}

export interface PanelExpansionPort {
	read(): ReadonlySet<string>;
	expand?(id: string): void;
	collapse?(id: string): void;
	toggle(id: string): void;
}

export type PanelDragPayload = EmptyPanelDragPayload | NodePanelDragPayload | TextPanelDragPayload;

export interface EmptyPanelDragPayload {
	kind: 'empty';
	sourcePanelId: PanelId;
}

export interface NodePanelDragPayload {
	kind: 'nodes';
	sourcePanelId: PanelId;
	nodeIds: readonly string[];
	providerId?: ProviderId;
	nodeKind?: string;
	label?: string;
	text?: string;
}

export interface TextPanelDragPayload {
	kind: 'text';
	sourcePanelId: PanelId;
	text: string;
	providerId?: ProviderId;
}

export interface PanelHandle {
	id: PanelId;
	kind: PanelKind;
	providerId?: ProviderId;
	focus(): boolean | void;
	produceDragPayload(): PanelDragPayload;
	acceptsDrop(intent: WorkspaceOperationIntent): boolean;
	revealNode?(id: string): void;
	selection?: PanelSelectionPort;
	projection?: PanelProjectionPort;
	expansion?: PanelExpansionPort;
}

export type SceneTile = ScenePanelTile | SceneSplitTile | SceneStackTile;

export interface ScenePanelTile {
	id: TileId;
	kind: 'panel';
	panelId: PanelId;
}

export interface SceneSplitTile {
	id: TileId;
	kind: 'split';
	axis: 'horizontal' | 'vertical';
	children: readonly SceneTile[];
	activeTileId?: TileId;
}

export interface SceneStackTile {
	id: TileId;
	kind: 'stack';
	children: readonly SceneTile[];
	activePanelId?: PanelId;
}

export interface SceneDefinition {
	id: SceneId;
	surfaceId: SurfaceId;
	rootTile: SceneTile;
	activePanelId?: PanelId;
	title?: string;
}

export interface WorkspaceActiveContext {
	surfaceId?: SurfaceId;
	sceneId?: SceneId;
	panelId?: PanelId;
}

export type WorkspaceScope =
	| { kind: 'focused' }
	| { kind: 'focused-scene'; sceneId: SceneId }
	| { kind: 'selected-scenes'; sceneIds: readonly SceneId[] }
	| { kind: 'all' };

export type WorkspaceDropTarget = PanelDropTarget | EditorCaretDropTarget | LeafDropTarget | UnknownDropTarget;

export interface PanelDropTarget {
	kind: 'panel';
	panelId: PanelId;
	panelKind: PanelKind;
	providerId?: ProviderId;
}

export interface EditorCaretDropTarget {
	kind: 'editor-caret';
	filePath?: string;
	position?: { line: number; ch: number };
}

export interface LeafDropTarget {
	kind: 'leaf';
	surfaceId?: SurfaceId;
}

export interface UnknownDropTarget {
	kind: 'unknown';
	reason?: string;
}

export type WorkspaceOperationIntent =
	| PanelDropIntent
	| EditorInsertTagIntent
	| OpenNodesInLeafIntent;

export interface PanelDropIntent {
	kind: 'panel-drop';
	sourcePanelId: PanelId;
	targetPanelId: PanelId;
	payload: PanelDragPayload;
}

export interface EditorInsertTagIntent {
	kind: 'editor-insert-tag';
	sourcePanelId: PanelId;
	target: EditorCaretDropTarget;
	tag: string;
	nodeIds?: readonly string[];
}

export interface OpenNodesInLeafIntent {
	kind: 'open-nodes-in-leaf';
	sourcePanelId: PanelId;
	target: LeafDropTarget;
	nodeIds: readonly string[];
}

export type InteractionPolicyResolution = WorkspaceOperationIntent | WorkspaceInteractionReject;

export type InteractionRejectReason =
	| 'empty-payload'
	| 'unsupported-payload'
	| 'unsupported-target';

export interface WorkspaceInteractionReject {
	kind: 'reject';
	reason: InteractionRejectReason;
	payload: PanelDragPayload;
	target: WorkspaceDropTarget;
}

export function isPanelKind(value: string): value is PanelKind {
	return (PANEL_KINDS as readonly string[]).includes(value);
}
