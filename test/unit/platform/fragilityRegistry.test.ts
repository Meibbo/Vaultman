import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import { PlatformAdapterRegistry } from '../../../src/platform/fragilityRegistry';
import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../../../src/platform/platformAdapter';

function fragility(id: string, over: Partial<FragilityRecord> = {}): FragilityRecord {
	return {
		id,
		title: id,
		summary: 's',
		privateSymbols: [],
		selectorSources: [],
		obsidianAssumptions: [],
		fallback: 'fb',
		mobile: { supported: 'unknown', notes: '' },
		...over,
	};
}

interface FakeAdapterOptions {
	id: string;
	probeResult?: CapabilityResult;
	probeThrows?: boolean;
	applyThrows?: boolean;
}

function fakeAdapter(opts: FakeAdapterOptions) {
	const calls = { probe: 0, apply: 0, revert: 0, fallback: 0 };
	const adapter: PlatformAdapter = {
		id: opts.id,
		fragility: fragility(opts.id),
		probe() {
			calls.probe++;
			if (opts.probeThrows) throw new Error('boom-probe');
			return opts.probeResult ?? { ok: true };
		},
		apply() {
			calls.apply++;
			if (opts.applyThrows) throw new Error('boom-apply');
		},
		revert() {
			calls.revert++;
		},
		fallback() {
			calls.fallback++;
		},
	};
	return { adapter, calls };
}

function makeCtx(): PlatformAdapterContext {
	return {
		app: {} as App,
		plugin: {} as Plugin,
		doc: {} as Document,
	};
}

describe('PlatformAdapterRegistry', () => {
	let warn: ReturnType<typeof vi.spyOn>;
	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		warn.mockRestore();
	});

	it('probes then applies an adapter that reports capable', async () => {
		const registry = new PlatformAdapterRegistry();
		const { adapter, calls } = fakeAdapter({ id: 'a' });
		registry.add(adapter);

		const status = await registry.activate(makeCtx());

		expect(calls.probe).toBe(1);
		expect(calls.apply).toBe(1);
		expect(calls.fallback).toBe(0);
		expect(status).toEqual([{ id: 'a', enabled: true }]);
	});

	it('auto-disables a feature when its probe fails — without crashing — and runs fallback', async () => {
		const registry = new PlatformAdapterRegistry();
		const bad = fakeAdapter({ id: 'bad', probeResult: { ok: false, reason: 'no api' } });
		const good = fakeAdapter({ id: 'good' });
		registry.add(bad.adapter).add(good.adapter);

		const status = await registry.activate(makeCtx());

		// failed probe -> not applied, fallback ran
		expect(bad.calls.apply).toBe(0);
		expect(bad.calls.fallback).toBe(1);
		// the rest of the registry still loads clean
		expect(good.calls.apply).toBe(1);
		expect(status).toEqual([
			{ id: 'bad', enabled: false, reason: 'no api' },
			{ id: 'good', enabled: true },
		]);
	});

	it('isolates a throwing probe so one bad adapter cannot crash load', async () => {
		const registry = new PlatformAdapterRegistry();
		const boom = fakeAdapter({ id: 'boom', probeThrows: true });
		const ok = fakeAdapter({ id: 'ok' });
		registry.add(boom.adapter).add(ok.adapter);

		const status = await registry.activate(makeCtx());

		expect(status[0].enabled).toBe(false);
		expect(status[0].reason).toContain('probe threw');
		expect(ok.calls.apply).toBe(1);
	});

	it('defensively reverts a half-applied adapter when apply throws', async () => {
		const registry = new PlatformAdapterRegistry();
		const { adapter, calls } = fakeAdapter({ id: 'half', applyThrows: true });
		registry.add(adapter);

		const status = await registry.activate(makeCtx());

		expect(calls.apply).toBe(1);
		expect(calls.revert).toBe(1); // defensive revert
		expect(status[0].enabled).toBe(false);
		expect(status[0].reason).toContain('apply threw');
	});

	it('reverts applied adapters in reverse order on deactivate (serviceUnload path)', async () => {
		const registry = new PlatformAdapterRegistry();
		const order: string[] = [];
		const make = (id: string): PlatformAdapter => ({
			id,
			fragility: fragility(id),
			probe: () => ({ ok: true }),
			apply: () => {},
			revert: () => {
				order.push(id);
			},
		});
		registry.add(make('first')).add(make('second')).add(make('third'));

		await registry.activate(makeCtx());
		await registry.deactivate();

		expect(order).toEqual(['third', 'second', 'first']);
	});

	it('does not revert adapters that never applied', async () => {
		const registry = new PlatformAdapterRegistry();
		const disabled = fakeAdapter({ id: 'd', probeResult: { ok: false, reason: 'x' } });
		registry.add(disabled.adapter);

		await registry.activate(makeCtx());
		await registry.deactivate();

		expect(disabled.calls.revert).toBe(0);
	});

	it('deactivate is idempotent', async () => {
		const registry = new PlatformAdapterRegistry();
		const { adapter, calls } = fakeAdapter({ id: 'idem' });
		registry.add(adapter);

		await registry.activate(makeCtx());
		await registry.deactivate();
		await registry.deactivate();

		expect(calls.revert).toBe(1);
		expect(registry.isActivated).toBe(false);
	});

	it('ties deactivate to Component unload (addChild path)', async () => {
		const registry = new PlatformAdapterRegistry();
		const { adapter, calls } = fakeAdapter({ id: 'unload' });
		registry.add(adapter);
		await registry.activate(makeCtx());

		registry.unload();

		expect(calls.revert).toBe(1);
	});

	it('rejects duplicate ids and id/fragility mismatch', () => {
		const registry = new PlatformAdapterRegistry();
		const { adapter } = fakeAdapter({ id: 'dup' });
		registry.add(adapter);
		expect(() => registry.add(fakeAdapter({ id: 'dup' }).adapter)).toThrow(/duplicate/);

		const mismatched: PlatformAdapter = {
			id: 'x',
			fragility: fragility('y'),
			probe: () => ({ ok: true }),
			apply: () => {},
			revert: () => {},
		};
		expect(() => registry.add(mismatched)).toThrow(/!=/);
	});

	it('describe() is runtime-enumerable with full ADR fields incl. mobile', () => {
		const registry = new PlatformAdapterRegistry();
		registry.add({
			id: 'rich',
			fragility: fragility('rich', {
				privateSymbols: ['app.foo'],
				selectorSources: ['.bar'],
				obsidianAssumptions: ['baz'],
				mobile: { supported: 'no', notes: 'desktop only' },
			}),
			probe: () => ({ ok: true }),
			apply: () => {},
			revert: () => {},
		});

		const [record] = registry.describe();
		expect(record.privateSymbols).toEqual(['app.foo']);
		expect(record.selectorSources).toEqual(['.bar']);
		expect(record.obsidianAssumptions).toEqual(['baz']);
		expect(record.mobile).toEqual({ supported: 'no', notes: 'desktop only' });
	});
});
