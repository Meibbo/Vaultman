import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(
	new URL('../../src/components/cells/cellAction.svelte', import.meta.url),
	'utf8',
);

describe('U130-05 cellAction', () => {
	it('resuelve etiqueta e icono por actionId, no por props duplicadas', () => {
		// Si el componente recibe label e icon sueltos, hay dos fuentes de
		// verdad y se desincronizan. La fuente es SASI.
		expect(src).toContain('actionId');
		expect(src).not.toMatch(/export let label|label:\s*string/);
		// Y lo tiene que RESOLVER, no solo recibirlo.
		expect(src).toMatch(/resolve\(actionId\)/);
	});

	it('no se cuela un acceso directo al plugin ni un casteo', () => {
		// La leccion del 06-T4: un stub silencioso satisface cualquier test que
		// solo mire lo que debe aparecer. Estas son las formas conocidas de
		// tapar un hueco sin que se note.
		expect(src).not.toContain('as any');
		expect(src).not.toContain('app.plugins');
		expect(src).not.toMatch(/\?\?\s*\{[\s\S]{0,80}\}\s*;/);
	});

	it('acepta el placement como slot, no como identidad', () => {
		// ADR 0005: el badge es un placement. La celda es la misma en los dos.
		expect(src).toContain("placement");
		expect(src).toContain("'badge'");
		expect(src).toContain("'inline'");
	});

	it('usa el selector namespaced', () => {
		// Sin namespace, temas como Minimal o AnuPpuccin pisan los estilos y el
		// usuario ve las variantes de Style Settings sin efecto y sin pista.
		expect(src).toContain('vaultman-action-cell');
	});

	it('una accion no disponible se pinta deshabilitada, no se oculta', () => {
		// Contrato de degradacion de logicCommandActions: un hueco con nombre es
		// informacion; desaparecer es irreparable.
		expect(src).toContain('disabled');
		expect(src).not.toMatch(/\{#if\s+available\}/);
	});
});
