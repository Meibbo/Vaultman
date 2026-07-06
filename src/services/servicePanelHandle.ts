import type { PanelExplorerImperativeApi } from '../types/typeExplorer';
import type {
	PanelDragPayload,
	PanelHandle,
	PanelId,
	PanelSelectionPort,
	PanelProjectionPort,
	PanelExpansionPort,
	ProviderId,
	WorkspaceOperationIntent,
} from '../types/typePanelScene';

export interface PanelExplorerHandleOptions {
	id: PanelId;
	providerId?: ProviderId;
	api?: PanelExplorerImperativeApi | null;
	focus?: () => boolean | void;
	produceDragPayload?: () => PanelDragPayload;
	acceptsDrop?: (intent: WorkspaceOperationIntent) => boolean;
	revealNode?: (id: string) => void;
	selection?: PanelSelectionPort;
	projection?: PanelProjectionPort;
	expansion?: PanelExpansionPort;
}

export function createPanelExplorerHandle(options: PanelExplorerHandleOptions): PanelHandle {
	return {
		id: options.id,
		kind: 'panelExplorer',
		providerId: options.providerId,
		focus: () => options.focus?.() ?? options.api?.focusFirstNode() ?? false,
		produceDragPayload:
			options.produceDragPayload ?? (() => ({ kind: 'empty', sourcePanelId: options.id })),
		acceptsDrop: options.acceptsDrop ?? (() => false),
		revealNode: options.revealNode,
		selection: options.selection,
		projection: options.projection,
		expansion: options.expansion,
	};
}
