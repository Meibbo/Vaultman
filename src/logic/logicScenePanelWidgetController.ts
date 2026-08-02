import type {
	ScenePanelWidgetEnvelope,
	ScenePanelWidgetPublication,
} from '../types/typePanelWidget';

export class ScenePanelWidgetController {
	private activeProviderId: string | null = null;
	private activeGeneration = 0;
	private activeEnvelope: ScenePanelWidgetEnvelope | null = null;
	private isDestroyed = false;

	constructor(readonly sceneInstanceId: string) {}

	/**
	 * Increments the Scene-local monotonic generation and makes `providerId`
	 * the sole current active owner.
	 */
	begin(providerId: string): number {
		if (this.isDestroyed) {
			return -1;
		}
		this.activeGeneration += 1;
		this.activeProviderId = providerId;
		this.activeEnvelope = null;
		return this.activeGeneration;
	}

	/**
	 * Accepts and stores the publication only if it matches the exact active tuple
	 * (sceneInstanceId, providerId, and activeGeneration).
	 */
	publish(
		publication: ScenePanelWidgetPublication,
	): ScenePanelWidgetEnvelope | null {
		if (this.isDestroyed) {
			return null;
		}
		if (
			publication.sceneInstanceId === this.sceneInstanceId &&
			publication.providerId === this.activeProviderId &&
			publication.generation === this.activeGeneration
		) {
			this.activeEnvelope = publication;
			return publication;
		}
		return null;
	}

	/**
	 * Clears the active publication if the caller matches the active owner tuple.
	 */
	clear(
		owner: Pick<
			ScenePanelWidgetEnvelope,
			'sceneInstanceId' | 'providerId' | 'generation'
		>,
	): boolean {
		if (this.isDestroyed) {
			return false;
		}
		if (
			owner.sceneInstanceId === this.sceneInstanceId &&
			owner.providerId === this.activeProviderId &&
			owner.generation === this.activeGeneration
		) {
			this.activeEnvelope = null;
			return true;
		}
		return false;
	}

	/**
	 * Returns the currently active envelope, or null if none is active.
	 */
	current(): ScenePanelWidgetEnvelope | null {
		if (this.isDestroyed) {
			return null;
		}
		return this.activeEnvelope;
	}

	/**
	 * Invalidates all outstanding tokens and clears active state.
	 */
	destroy(): void {
		this.isDestroyed = true;
		this.activeProviderId = null;
		this.activeGeneration = -1;
		this.activeEnvelope = null;
	}
}
