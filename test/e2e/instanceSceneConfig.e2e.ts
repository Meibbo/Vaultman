/// <reference types="wdio-obsidian-service" />
/**
 * Aceptación de `U121-037`: la configuración por scene tiene que sobrevivir al remontaje.
 *
 * ESTA SUITE FALLA A PROPÓSITO hasta que aterrice el corte 1 de `instance-surfaces`:
 * `.agents/docs/work/hardening/items/2026-08-10-instance-surfaces/plan/index.md`
 *
 * DÓNDE CORRE. `wdio-obsidian-service` descarga y arranca un Obsidian de ESCRITORIO
 * (`browserName: 'obsidian'`). En Termux/Android no hay tal cosa: esta suite **solo corre en el
 * PC**, con `pnpm run test:e2e`. Que no se pueda ejecutar en el móvil no es motivo para no
 * escribirla; es motivo para decir dónde se ejecuta, y queda dicho.
 *
 * QUÉ SE COMPRUEBA Y QUÉ NO. Los tres primeros escenarios se apoyan en el estado durable
 * (`workspaceInstanceId` en el estado de vista, y `settings.instanceRegistry`), que es
 * observable desde dentro de Obsidian sin tocar la UI. El cuarto necesita accionar el toolbar:
 * sus selectores están arriba, marcados, porque no se confirmaron contra la UI real.
 */
import { $, browser, expect } from '@wdio/globals';

const PLUGIN_ID = 'vaultman';

// Ojo: dentro de `executeObsidian` el callback se SERIALIZA y se ejecuta dentro de Obsidian, así
// que no puede cerrar sobre variables de este módulo. Por eso `'vaultman-frame'` aparece literal
// ahí dentro en vez de por constante: no es descuido, es la única forma que funciona.

/** TODO(e2e): confirmar contra la UI real antes de dar por bueno el escenario 4. */
const SELECTORS = {
	toolbarToggle: '[data-panel-widget-host-id] [data-action="toggle-toolbar"]',
	viewModeOption: (mode: string) => `[data-view-mode-option="${mode}"]`,
};

type AnyRecord = Record<string, unknown>;

/** Abre una hoja de Vaultman y devuelve el `workspaceInstanceId` que quedó anclado en ella. */
async function openFrameAndReadAnchor(): Promise<string | null> {
	return browser.executeObsidian(async ({ app }) => {
		const leaf = app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: 'vaultman-frame', active: true });
		const state = leaf.getViewState().state as { workspaceInstanceId?: string } | undefined;
		return state?.workspaceInstanceId ?? null;
	});
}

/** Los ids anclados en todas las hojas de Vaultman abiertas. */
async function readAllAnchors(): Promise<string[]> {
	return browser.executeObsidian(({ app }) => {
		return app.workspace.getLeavesOfType('vaultman-frame').map((leaf) => {
			const state = leaf.getViewState().state as { workspaceInstanceId?: string } | undefined;
			return state?.workspaceInstanceId ?? '';
		});
	});
}

/** El registro durable, tal y como lo tiene el plugin en memoria. */
async function readRegistry(): Promise<AnyRecord> {
	return browser.executeObsidian(({ app }) => {
		const plugin = (app as unknown as { plugins: { plugins: Record<string, AnyRecord> } })
			.plugins.plugins['vaultman'];
		return (plugin?.settings as AnyRecord)?.instanceRegistry as AnyRecord;
	});
}

describe('U121-037 — la configuración por scene sobrevive al remontaje', () => {
	it('ancla un id durable en la hoja y lo conserva al recargar Obsidian', async () => {
		const before = await openFrameAndReadAnchor();
		expect(before).toBeTruthy();

		await browser.reloadObsidian({ vault: 'test/vaults/e2e', plugins: [PLUGIN_ID] });

		const after = await readAllAnchors();
		expect(after).toContain(before);
	});

	it('da ids distintos a dos instancias abiertas a la vez, sin pisarse', async () => {
		const first = await openFrameAndReadAnchor();
		const second = await openFrameAndReadAnchor();

		expect(first).toBeTruthy();
		expect(second).toBeTruthy();
		expect(first).not.toBe(second);

		const registry = await readRegistry();
		const instances = (registry?.instances ?? {}) as AnyRecord;
		expect(Object.keys(instances)).toEqual(expect.arrayContaining([first, second]));
	});

	it('conserva la configuración de una scene al cerrar y reabrir el panel', async () => {
		const id = await openFrameAndReadAnchor();
		expect(id).toBeTruthy();

		// Se escribe por la misma vía que usa el toolbar: el registro del plugin.
		await browser.executeObsidian(async ({ app }, instanceId: string) => {
			const plugin = (app as unknown as { plugins: { plugins: Record<string, AnyRecord> } })
				.plugins.plugins['vaultman'] as AnyRecord & { saveSettings: () => Promise<void> };
			const settings = plugin.settings as AnyRecord;
			const registry = settings.instanceRegistry as AnyRecord;
			const instances = registry.instances as Record<string, AnyRecord>;
			const record = instances[instanceId];
			record.scenes = { ...(record.scenes as AnyRecord), files: { viewMode: 'table' } };
			await plugin.saveSettings();
		}, id as string);

		// Cerrar todas las hojas del plugin fuerza el desmontaje del componente.
		await browser.executeObsidian(({ app }) => {
			app.workspace.getLeavesOfType('vaultman-frame').forEach((leaf) => leaf.detach());
		});
		await openFrameAndReadAnchor();

		const registry = await readRegistry();
		const instances = (registry?.instances ?? {}) as Record<string, AnyRecord>;
		const scenes = instances[id as string]?.scenes as AnyRecord | undefined;
		expect((scenes?.files as AnyRecord)?.viewMode).toBe('table');
	});

	it('conserva el view mode al ocultar y volver a mostrar el toolbar', async () => {
		// TODO(e2e): este escenario depende de los selectores de arriba, sin confirmar contra la
		// UI real. Si fallan por selector y no por comportamiento, arregla SELECTORS, no el
		// aserto: lo que se afirma aquí -que el modo elegido sigue ahí tras el remontaje- es el
		// corazón de U121-037.
		await openFrameAndReadAnchor();

		await $(SELECTORS.viewModeOption('table')).click();
		await $(SELECTORS.toolbarToggle).click();
		await $(SELECTORS.toolbarToggle).click();

		// `expect(element).toHaveAttribute` is the one matcher whose overload
		// does not resolve in the lint program even with the wdio ambient
		// types referenced. `waitUntil` keeps the same retry semantics the
		// matcher gave us, and types cleanly.
		await browser.waitUntil(
			async () =>
				(await $(SELECTORS.viewModeOption('table')).getAttribute(
					'aria-checked',
				)) === 'true',
			{ timeoutMsg: 'the table view mode never reported aria-checked=true' },
		);
	});
});
