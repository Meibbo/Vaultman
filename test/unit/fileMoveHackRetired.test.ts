import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(
	new URL('../../src/components/containers/explorerFiles.ts', import.meta.url),
	'utf8',
);

describe('U130-02 retirada del hack de U121-102', () => {
	it('el move mode ya no FUERZA el filtro al entrar', () => {
		// El hack: anadir 'folders-only' a los filtros del usuario al entrar.
		expect(src).not.toMatch(/nodeTypeFilterPatch\(\[\s*\.\.\.this\.nodeTypeFilters,\s*'folders-only'/);
	});

	it('restore ya no arrastra los filtros del usuario', () => {
		expect(src).not.toContain('nodeTypeFilters?: string[];');
	});

	it('la validacion la hace la strategy, y la LLAMA', () => {
		expect(src).toMatch(/fileMoveStrategy\.validate\(/);
	});

	it('el guard de ciclo inline se fue, no se quedo duplicado', () => {
		expect(src).not.toMatch(/startsWith\(origin\.path \+ '\/'\)/);
	});

	// --- Guardas de NO-REGRESION: lo que NO se puede llevar por delante ---

	it('`folders-only` SIGUE siendo un filtro del usuario', () => {
		// Es una opcion del menu de orden con sus propios tests. Borrarla seria
		// quitarle una funcion al usuario, no retirar un hack.
		expect(src).toContain("'folders-only'");
	});

	it('pinchar un fichero sigue significando "a su carpeta"', () => {
		expect(src).toContain("file instanceof TFolder ? file : file.parent");
	});

	it('FileMoveModeState SIGUE existiendo', () => {
		// Migrar ese subsistema son 34 referencias y va en otra unidad.
		expect(src).toContain('interface FileMoveModeState');
	});
});
