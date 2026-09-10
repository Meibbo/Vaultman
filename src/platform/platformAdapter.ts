// PlatformAdapter contract — ADR 0004.
//
// Every access to an Obsidian private/undocumented API, every monkey-patch, and
// every piece of DOM scraping lives behind ONE named adapter that implements this
// contract and is enumerated in the Fragility Registry (fragilityRegistry.ts).
//
// The `revert` method is the ADR 0011 `serviceUnload` contract: detachable modules
// reuse it, and the registry ties it to plugin unload. `revert` MUST be idempotent
// and leave zero residue (listeners removed, hover sources unregistered, injected
// DOM detached, monkey-patches restored).

import type { App, Plugin } from 'obsidian';

/** Result of a capability probe. Never thrown — always returned. */
export type CapabilityResult = { ok: true } | { ok: false; reason: string };

/** Whether a fragile feature works on Obsidian mobile (closes the is-phone gap). */
export type MobileSupport = 'yes' | 'no' | 'degraded' | 'unknown';

/**
 * The audit record for one fragile zone. Enumerable at runtime via
 * `PlatformAdapterRegistry.describe()` — the base of the future config-export
 * and the machine-readable half of the platform inventory.
 */
export interface FragilityRecord {
	/** Stable adapter id. Must equal the owning adapter's `id`. */
	readonly id: string;
	/** Human-facing label. */
	readonly title: string;
	/** What private surface this touches and why the feature needs it. */
	readonly summary: string;
	/**
	 * Private/undocumented Obsidian symbols this adapter depends on. The T.G
	 * shape-tests assert these still exist; a failure signals a `minAppVersion`
	 * bump is required (ADR 0004).
	 */
	readonly privateSymbols: readonly string[];
	/** DOM selectors scraped from native surfaces (the drift surface). */
	readonly selectorSources: readonly string[];
	/** Obsidian version assumptions / undocumented behaviors relied upon. */
	readonly obsidianAssumptions: readonly string[];
	/** Human description of the degraded behavior when the probe fails. */
	readonly fallback: string;
	/** Mobile behavior — required so the is-phone inventory is complete. */
	readonly mobile: {
		readonly supported: MobileSupport;
		readonly notes: string;
	};
}

/** Context handed to every adapter. `doc` defaults to the active document. */
export interface PlatformAdapterContext {
	readonly app: App;
	readonly plugin: Plugin;
	readonly doc: Document;
}

/**
 * One fragile zone behind the contract: probe -> apply -> revert, with a
 * degraded fallback and an enumerable fragility record.
 */
export interface PlatformAdapter {
	/** Stable id; equals `fragility.id`. */
	readonly id: string;
	/** The audit record for this adapter. */
	readonly fragility: FragilityRecord;
	/**
	 * Detect whether the capability is present. MUST NOT throw — return
	 * `{ ok: false, reason }` instead. Should be cheap and side-effect-free.
	 */
	probe(ctx: PlatformAdapterContext): CapabilityResult;
	/**
	 * Install the patch / listeners. Only called when `probe` returned ok.
	 * May be async.
	 */
	apply(ctx: PlatformAdapterContext): void | Promise<void>;
	/**
	 * Reverse everything `apply` did. Idempotent; called by the registry's
	 * `deactivate()` (the serviceUnload path). Safe to call even if `apply`
	 * never ran.
	 */
	revert(): void | Promise<void>;
	/**
	 * Optional degraded path when `probe` fails. The feature stays disabled;
	 * this is for wiring a no-op or a public-API substitute. MUST NOT throw.
	 */
	fallback?(ctx: PlatformAdapterContext): void;
}

/** Per-adapter activation outcome reported by the registry. */
export interface AdapterStatus {
	readonly id: string;
	readonly enabled: boolean;
	/** Present when the adapter was auto-disabled (probe failed or apply threw). */
	readonly reason?: string;
}
