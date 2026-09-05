// Fragility Registry — ADR 0004.
//
// Central enumeration of every PlatformAdapter. On activate, probes run; a failed
// probe auto-disables that feature WITHOUT crashing the plugin (failures are
// isolated per-adapter). On deactivate (the serviceUnload path, ADR 0011), every
// activated adapter is reverted in reverse order.
//
// The registry extends Obsidian's Component so `plugin.addChild(registry)` ties
// `deactivate()` to plugin unload automatically.

import { Component } from 'obsidian';
import type {
	AdapterStatus,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from './platformAdapter';

interface ActivationRecord {
	readonly adapter: PlatformAdapter;
	enabled: boolean;
	reason?: string;
	/** True once `apply` ran, so we only `revert` what was actually applied. */
	applied: boolean;
}

export class PlatformAdapterRegistry extends Component {
	private readonly records: ActivationRecord[] = [];
	private activated = false;

	/**
	 * Register an adapter. Ids must be unique; a duplicate id throws (boot-time bug).
	 * Named `add` (not `register`) to avoid clashing with `Component.register`.
	 */
	add(adapter: PlatformAdapter): this {
		if (this.records.some((r) => r.adapter.id === adapter.id)) {
			throw new Error(`PlatformAdapterRegistry: duplicate adapter id "${adapter.id}"`);
		}
		if (adapter.id !== adapter.fragility.id) {
			throw new Error(
				`PlatformAdapterRegistry: adapter id "${adapter.id}" != fragility.id "${adapter.fragility.id}"`,
			);
		}
		this.records.push({ adapter, enabled: false, applied: false });
		return this;
	}

	/**
	 * Probe + apply every registered adapter. Failures are isolated: a thrown
	 * probe/apply (or a failed probe) auto-disables only that adapter and runs
	 * its optional fallback. Returns the per-adapter status list.
	 */
	async activate(ctx: PlatformAdapterContext): Promise<AdapterStatus[]> {
		this.activated = true;
		for (const record of this.records) {
			await this.activateOne(record, ctx);
		}
		return this.status();
	}

	private async activateOne(
		record: ActivationRecord,
		ctx: PlatformAdapterContext,
	): Promise<void> {
		const { adapter } = record;
		let result;
		try {
			result = adapter.probe(ctx);
		} catch (error) {
			this.disable(record, `probe threw: ${errorMessage(error)}`, ctx);
			return;
		}
		if (!result.ok) {
			this.disable(record, result.reason, ctx);
			return;
		}
		try {
			await adapter.apply(ctx);
			record.applied = true;
			record.enabled = true;
			record.reason = undefined;
		} catch (error) {
			// apply may have partially run; attempt a defensive revert so a
			// half-applied adapter does not leave residue.
			record.applied = true;
			await this.safeRevert(record);
			this.disable(record, `apply threw: ${errorMessage(error)}`, ctx);
		}
	}

	private disable(record: ActivationRecord, reason: string, ctx: PlatformAdapterContext): void {
		record.enabled = false;
		record.reason = reason;
		console.warn(`[vaultman] platform adapter "${record.adapter.id}" disabled: ${reason}`);
		try {
			record.adapter.fallback?.(ctx);
		} catch (error) {
			console.warn(
				`[vaultman] platform adapter "${record.adapter.id}" fallback threw: ${errorMessage(error)}`,
			);
		}
	}

	/**
	 * Revert every applied adapter in reverse order. Idempotent — safe to call
	 * when nothing was activated, and safe to call twice. This is the
	 * serviceUnload-revert path (ADR 0011).
	 */
	async deactivate(): Promise<void> {
		for (let i = this.records.length - 1; i >= 0; i--) {
			await this.safeRevert(this.records[i]);
		}
		this.activated = false;
	}

	private async safeRevert(record: ActivationRecord): Promise<void> {
		if (!record.applied) return;
		try {
			await record.adapter.revert();
		} catch (error) {
			console.warn(
				`[vaultman] platform adapter "${record.adapter.id}" revert threw: ${errorMessage(error)}`,
			);
		} finally {
			record.applied = false;
			record.enabled = false;
		}
	}

	/** Component unload -> serviceUnload revert. */
	onunload(): void {
		void this.deactivate();
	}

	/** Runtime-enumerable fragility audit (base of config-export). */
	describe(): FragilityRecord[] {
		return this.records.map((r) => r.adapter.fragility);
	}

	/** Per-adapter enabled/disabled status (after `activate`). */
	status(): AdapterStatus[] {
		return this.records.map((r) => ({
			id: r.adapter.id,
			enabled: r.enabled,
			...(r.reason !== undefined ? { reason: r.reason } : {}),
		}));
	}

	/** True after `activate` and before `deactivate`. */
	get isActivated(): boolean {
		return this.activated;
	}

	/** Number of registered adapters. */
	get size(): number {
		return this.records.length;
	}
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
