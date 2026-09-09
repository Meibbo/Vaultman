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

	it('la validacion la hace la strategy via el motor, sin guard duplicado', () => {
		// ui-dom migra el adaptador al motor: la strategy entra en
		// enterNodeMoveMode y la seleccion pasa por
		// selectNodeMoveDestination. Llamarla en crudo aqui seria duplicar
		// el gesto "fichero significa su carpeta" que el adaptador resuelve
		// antes de validar.
		expect(src).toMatch(/fileMoveStrategy/);
		expect(src).toMatch(/selectNodeMoveDestination\(/);
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

	it('FileMoveModeState YA NO existe: migrado al motor NodeMove (U130-02 ui-dom)', () => {
		// T5 lo dejo vivo a proposito ("va en su propia unidad cuando
		// nodeMoveMode pueda sustituirlo"). Esta unidad es esa: el adaptador
		// es NodeMoveSceneRuntime + proceedNodeMoveToQueue.
		expect(src).not.toContain('interface FileMoveModeState');
		expect(src).not.toMatch(/private fileMoveMode/);
	});
});
