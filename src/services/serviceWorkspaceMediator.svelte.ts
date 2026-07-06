import { resolveInteractionPolicy } from '../logic/logicInteractionPolicy';
import type {
	InteractionPolicyResolution,
	PanelDragPayload,
	PanelHandle,
	PanelId,
	SceneDefinition,
	SceneId,
	WorkspaceActiveContext,
	WorkspaceDropTarget,
	WorkspaceScope,
} from '../types/typePanelScene';

export const WORKSPACE_MEDIATOR_KEY = Symbol('vaultman.workspaceMediator');

export type WorkspaceMediatorUnregister = () => void;

export class WorkspaceMediatorService {
	private readonly scenes = new Map<SceneId, SceneDefinition>();
	private readonly panels = new Map<PanelId, PanelHandle>();
	private activeContext: WorkspaceActiveContext | null = null;

	registerScene(scene: SceneDefinition): WorkspaceMediatorUnregister {
		this.scenes.set(scene.id, scene);
		return once(() => this.unregisterScene(scene.id));
	}

	unregisterScene(sceneId: SceneId): void {
		this.scenes.delete(sceneId);
		if (this.activeContext?.sceneId === sceneId) this.activeContext = null;
	}

	getScene(sceneId: SceneId): SceneDefinition | undefined {
		return this.scenes.get(sceneId);
	}

	listScenes(): SceneDefinition[] {
		return [...this.scenes.values()];
	}

	registerPanel(handle: PanelHandle): WorkspaceMediatorUnregister {
		this.panels.set(handle.id, handle);
		return once(() => this.unregisterPanel(handle.id));
	}

	unregisterPanel(panelId: PanelId): void {
		this.panels.delete(panelId);
		if (this.activeContext?.panelId === panelId) this.activeContext = null;
	}

	getPanel(panelId: PanelId): PanelHandle | undefined {
		return this.panels.get(panelId);
	}

	listPanels(): PanelHandle[] {
		return [...this.panels.values()];
	}

	setActiveContext(context: WorkspaceActiveContext): boolean {
		if (context.sceneId && !this.scenes.has(context.sceneId)) return false;
		if (context.panelId && !this.panels.has(context.panelId)) return false;
		this.activeContext = { ...context };
		return true;
	}

	activateScene(sceneId: SceneId, panelId = this.scenes.get(sceneId)?.activePanelId): boolean {
		const scene = this.scenes.get(sceneId);
		if (!scene) return false;
		return this.setActiveContext({ surfaceId: scene.surfaceId, sceneId, panelId });
	}

	getActiveContext(): WorkspaceActiveContext | null {
		return this.activeContext ? { ...this.activeContext } : null;
	}

	getActivePanel(): PanelHandle | null {
		const panelId = this.activeContext?.panelId;
		return panelId ? (this.panels.get(panelId) ?? null) : null;
	}

	resolveScope(scope?: WorkspaceScope): WorkspaceScope {
		if (scope) return scope;
		const sceneId = this.activeContext?.sceneId;
		return sceneId ? { kind: 'focused-scene', sceneId } : { kind: 'focused' };
	}

	routeInteraction(
		payload: PanelDragPayload,
		target: WorkspaceDropTarget,
	): InteractionPolicyResolution {
		return resolveInteractionPolicy(payload, target);
	}
}

function once(fn: () => void): () => void {
	let called = false;
	return () => {
		if (called) return;
		called = true;
		fn();
	};
}
