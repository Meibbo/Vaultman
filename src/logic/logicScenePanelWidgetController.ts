import type {
	ScenePanelWidgetEnvelope,
	ScenePanelWidgetPublication,
} from '../types/typePanelWidget';

/**
 * U121-003: owns which provider is allowed to publish the panelWidget for one
 * Scene instance.
 *
 * The regression this replaces was an ordering problem dressed up as a caching
 * problem: separate `$state` caches per provider, a derived winner, and a
 * `tick()` to make the writes land in the right order. Anything that arrived
 * late still won. Here a provider must present the exact tuple that is current
 * — same Scene, same provider, same generation — or its publication is dropped.
 *
 * DOM-free, Svelte-free and provider-implementation-free by contract: it holds
 * a projection it never inspects.
 */
export class ScenePanelWidgetController {
	private generation = 0;
	private ownerProviderId: string | null = null;
	private envelope: ScenePanelWidgetEnvelope | null = null;
	private destroyed = false;

	constructor(readonly sceneInstanceId: string) {}

	/**
	 * Opens a new ownership window for `providerId` and returns its generation.
	 * Re-opening the same provider still supersedes the previous window: a
	 * refresh already in flight from the last pass is as stale as one from
	 * another provider.
	 */
	begin(providerId: string): number {
		if (this.destroyed) return this.generation;
		this.generation += 1;
		this.ownerProviderId = providerId;
		return this.generation;
	}

	/** Accepts and stores the envelope, or returns null if it is not current. */
	publish(
		publication: ScenePanelWidgetPublication,
	): ScenePanelWidgetEnvelope | null {
		if (!this.isCurrentOwner(publication)) return null;
		this.envelope = {
			sceneInstanceId: publication.sceneInstanceId,
			providerId: publication.providerId,
			generation: publication.generation,
			projection: publication.projection,
		};
		return this.envelope;
	}

	/**
	 * Drops the envelope only for the owner that still holds it, so a provider
	 * page unmounting after its successor mounted cannot blank the toolbar the
	 * successor owns.
	 */
	clear(
		owner: Pick<
			ScenePanelWidgetEnvelope,
			'sceneInstanceId' | 'providerId' | 'generation'
		>,
	): boolean {
		if (!this.isCurrentOwner(owner)) return false;
		this.envelope = null;
		return true;
	}

	current(): ScenePanelWidgetEnvelope | null {
		return this.envelope;
	}

	/**
	 * Invalidates every outstanding token. A publication in flight when the
	 * Scene tears down is dropped, and it cannot be accepted by a later Scene
	 * that happens to reuse the same instance id and provider.
	 */
	destroy(): void {
		this.destroyed = true;
		this.ownerProviderId = null;
		this.envelope = null;
	}

	private isCurrentOwner(
		owner: Pick<
			ScenePanelWidgetEnvelope,
			'sceneInstanceId' | 'providerId' | 'generation'
		>,
	): boolean {
		if (this.destroyed) return false;
		if (owner.sceneInstanceId !== this.sceneInstanceId) return false;
		if (owner.providerId !== this.ownerProviderId) return false;
		return owner.generation === this.generation;
	}
}
