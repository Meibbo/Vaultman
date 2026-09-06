import { describe, it, expect, vi } from "vitest";
import { PlatformAdapterRegistry } from "../../src/platform/fragilityRegistry";
import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from "../../src/platform/platformAdapter";

const ctx = {} as PlatformAdapterContext;

function record(id: string): FragilityRecord {
	return {
		id,
		title: id,
		summary: "test",
		privateSymbols: [],
		selectorSources: [],
		obsidianAssumptions: [],
		fallback: "none",
		mobile: { supported: "unknown", notes: "" },
	};
}

/** Adapter de prueba que registra el orden real de las llamadas. */
function makeAdapter(
	id: string,
	log: string[],
	opts: { probe?: CapabilityResult; applyThrows?: boolean } = {},
): PlatformAdapter {
	return {
		id,
		fragility: record(id),
		probe: () => opts.probe ?? { ok: true },
		apply: () => {
			log.push(`apply:${id}`);
			if (opts.applyThrows) throw new Error(`apply ${id} exploto`);
		},
		revert: () => {
			log.push(`revert:${id}`);
		},
		fallback: () => {
			log.push(`fallback:${id}`);
		},
	};
}

describe("PlatformAdapterRegistry — identidad", () => {
	it("rechaza ids duplicados", () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry().add(makeAdapter("a", log));
		expect(() => reg.add(makeAdapter("a", log))).toThrow(/duplicate adapter id/);
	});

	it("rechaza un adapter cuyo id no coincide con fragility.id", () => {
		const log: string[] = [];
		const bad = { ...makeAdapter("a", log), fragility: record("otro") };
		expect(() => new PlatformAdapterRegistry().add(bad)).toThrow(/!= fragility.id/);
	});

	it("describe() enumera la ficha de cada adapter registrado", () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry().add(makeAdapter("a", log)).add(makeAdapter("b", log));
		expect(reg.size).toBe(2);
		expect(reg.describe().map((f) => f.id)).toEqual(["a", "b"]);
	});
});

describe("PlatformAdapterRegistry — aislamiento de fallos", () => {
	it("un probe en rojo desactiva SOLO ese adapter, no lanza, y NO llama a su apply", async () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry()
			.add(makeAdapter("ok", log))
			.add(makeAdapter("roto", log, { probe: { ok: false, reason: "sin soporte" } }));

		const status = await reg.activate(ctx);

		expect(status).toEqual([
			{ id: "ok", enabled: true },
			{ id: "roto", enabled: false, reason: "sin soporte" },
		]);
		// La mitad negativa: el apply del roto NO puede haber corrido.
		expect(log).toContain("apply:ok");
		expect(log).not.toContain("apply:roto");
		// Y su fallback sí.
		expect(log).toContain("fallback:roto");
	});

	it("un apply que lanza no tumba a los demas", async () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry()
			.add(makeAdapter("explota", log, { applyThrows: true }))
			.add(makeAdapter("sano", log));

		const status = await reg.activate(ctx);

		expect(status[0].enabled).toBe(false);
		expect(status[1].enabled).toBe(true);
		expect(log).toContain("apply:sano");
	});
});

describe("PlatformAdapterRegistry — revert (contrato serviceUnload, ADR 0011)", () => {
	it("revierte en orden INVERSO al de aplicacion", async () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry()
			.add(makeAdapter("primero", log))
			.add(makeAdapter("segundo", log));

		await reg.activate(ctx);
		log.length = 0;
		await reg.deactivate();

		expect(log).toEqual(["revert:segundo", "revert:primero"]);
	});

	it("no revierte lo que nunca se aplico", async () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry().add(
			makeAdapter("nunca", log, { probe: { ok: false, reason: "no" } }),
		);

		await reg.activate(ctx);
		await reg.deactivate();

		expect(log).not.toContain("revert:nunca");
	});

	it("deactivate es idempotente: dos llamadas revierten una sola vez", async () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry().add(makeAdapter("a", log));

		await reg.activate(ctx);
		await reg.deactivate();
		await reg.deactivate();

		expect(log.filter((l) => l === "revert:a")).toHaveLength(1);
		expect(reg.isActivated).toBe(false);
	});

	it("deactivate sin activate previo no lanza", async () => {
		const log: string[] = [];
		const reg = new PlatformAdapterRegistry().add(makeAdapter("a", log));
		await expect(reg.deactivate()).resolves.toBeUndefined();
		expect(log).toEqual([]);
	});

	it("un revert que lanza no impide revertir a los demas", async () => {
		const log: string[] = [];
		const malo = makeAdapter("malo", log);
		malo.revert = () => {
			throw new Error("revert exploto");
		};
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const reg = new PlatformAdapterRegistry().add(makeAdapter("bueno", log)).add(malo);

		await reg.activate(ctx);
		log.length = 0;
		await reg.deactivate();

		expect(log).toContain("revert:bueno");
		warn.mockRestore();
	});
});
