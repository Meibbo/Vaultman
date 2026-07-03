/**
 * serviceIconOverrides — per-node + per-provider icon override store (PAI-002).
 *
 * Holds the mutable override state for the app session (no `window.*`, per proto
 * §29 — v12's equivalent is the global `__vmIconOverrides`, SOLO-PROTO RESHAPE per
 * Ledger 06). `main.ts` hydrates this store from `VaultmanSettings.iconOverrides`
 * on load and reads `toDocument()` back into settings before `saveSettings()`,
 * mirroring the existing `ThemeService.hydrate()` / `customPresets` round-trip
 * (`serviceTheme.svelte.ts`).
 *
 * Persisted shape: `IconOverridesDocument` (`logicIconOverride.ts`) — a
 * D-PSS-3 `config`-class document at `node` scope. Node keys MUST be D6
 * namespaced ids (`file.X`/`folder.X`/`tag.X`/`prop.X`), never raw paths
 * (issue "Reglas de traducción").
 *
 * Precedence: `resolve(nodeKey, providerId)` returns the node override when set,
 * else the provider default, else `undefined` (caller falls through to the
 * resolver chain — parity default with zero overrides stored).
 */
import {
	normalizeIconOverride,
	normalizeIconOverridesDocument,
	type IconOverrideSpec,
	type IconOverridesDocument,
	type RawIconOverride,
} from '../logic/logicIconOverride';

const NODE_KEY_PATTERN = /^(file|folder|tag|prop)\./;

export class IconOverrideStore {
	#nodes = new Map<string, IconOverrideSpec>();
	#providers = new Map<string, IconOverrideSpec>();

	/** Per-node override, keyed by a D6 namespaced id. `undefined` when unset. */
	getForNode(nodeKey: string): IconOverrideSpec | undefined {
		return this.#nodes.get(nodeKey);
	}

	/**
	 * Set (or, when `override` is falsy/unnormalizable, clear) the override for
	 * one node. `nodeKey` MUST be D6 namespaced (`file.`/`folder.`/`tag.`/`prop.`
	 * prefix) — throws otherwise, since a raw path here is a caller bug, not
	 * user input to degrade gracefully from.
	 */
	setForNode(nodeKey: string, override: RawIconOverride): void {
		assertNamespacedNodeKey(nodeKey);
		const normalized = normalizeIconOverride(override);
		if (!normalized) {
			this.#nodes.delete(nodeKey);
			return;
		}
		this.#nodes.set(nodeKey, normalized);
	}

	clearForNode(nodeKey: string): void {
		this.#nodes.delete(nodeKey);
	}

	/** Per-provider default override (e.g. all tag nodes), keyed by provider id. */
	getForProvider(providerId: string): IconOverrideSpec | undefined {
		return this.#providers.get(providerId);
	}

	setForProvider(providerId: string, override: RawIconOverride): void {
		const normalized = normalizeIconOverride(override);
		if (!normalized) {
			this.#providers.delete(providerId);
			return;
		}
		this.#providers.set(providerId, normalized);
	}

	clearForProvider(providerId: string): void {
		this.#providers.delete(providerId);
	}

	/**
	 * Resolve the effective override for a node: its own override wins, else
	 * the provider default, else `undefined` (no override applies — caller
	 * falls through to `resolveIcon`'s normal chain).
	 */
	resolve(nodeKey: string, providerId?: string): IconOverrideSpec | undefined {
		const nodeOverride = this.#nodes.get(nodeKey);
		if (nodeOverride) return nodeOverride;
		if (!providerId) return undefined;
		return this.#providers.get(providerId);
	}

	/** Replace all in-memory state from a persisted/untrusted payload (fresh load, not a merge). */
	hydrate(raw: unknown): void {
		const doc = normalizeIconOverridesDocument(raw);
		this.#nodes = new Map(Object.entries(doc.nodes));
		this.#providers = new Map(Object.entries(doc.providers));
	}

	/** Serialize current state into the PSS-shaped persisted document. */
	toDocument(): IconOverridesDocument {
		return normalizeIconOverridesDocument({
			nodes: Object.fromEntries(this.#nodes),
			providers: Object.fromEntries(this.#providers),
		});
	}
}

function assertNamespacedNodeKey(nodeKey: string): void {
	if (!NODE_KEY_PATTERN.test(nodeKey)) {
		throw new Error(
			`IconOverrideStore: node key "${nodeKey}" is not D6-namespaced (expected a ` +
				`file./folder./tag./prop. prefix, never a raw path).`,
		);
	}
}
