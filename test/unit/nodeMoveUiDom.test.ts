import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const filesSrc = readFileSync(
	new URL('../../src/components/containers/explorerFiles.ts', import.meta.url),
	'utf8',
);
const pageSrc = readFileSync(
	new URL('../../src/components/pages/pageFilters.svelte', import.meta.url),
	'utf8',
);
const sasiSrc = readFileSync(
	new URL('../../src/logic/logicSasiMoveActions.ts', import.meta.url),
	'utf8',
);
const strippedFilesSrc = filesSrc
	.split('\n')
	.filter((line) => !line.trim().startsWith('//'))
	.join('\n');

describe('U130-02 ui-dom: el legado File sale y entra el motor NodeMove', () => {
	it('FileMoveModeState ya no existe en el consumidor real', () => {
		expect(filesSrc).not.toContain('interface FileMoveModeState');
		expect(filesSrc).not.toMatch(/private fileMoveMode/);
		expect(filesSrc).not.toContain('FileMoveOwner');
	});

	it('el hack de filtros ya no se fuerza ni se restaura en el modo', () => {
		expect(filesSrc).not.toMatch(
			/nodeTypeFilterPatch\(\[\s*\.\.\.this\.nodeTypeFilters,\s*'folders-only'/,
		);
		expect(strippedFilesSrc).not.toContain('nodeTypeFilters?: string[];');
	});

	it('el consumidor usa el runtime por (instancia, Scene) y el puerto Proceed', () => {
		expect(filesSrc).toMatch(/NodeMoveSceneRuntime/);
		expect(filesSrc).toMatch(/proceedNodeMoveToQueue\(/);
		expect(filesSrc).toMatch(/isNodeMoveActiveIn\(/);
		// La validacion vive en la strategy via el motor, no duplicada
		// inline: el adaptador entra con fileMoveStrategy y selecciona
		// via selectNodeMoveDestination.
		expect(filesSrc).toMatch(/fileMoveStrategy/);
		expect(filesSrc).toMatch(/selectNodeMoveDestination\(/);
	});

	it('Proceed cuelga del id nuevo y no del valueMove', () => {
		expect(filesSrc).toContain('vaultman.nodemove.proceed');
		expect(sasiSrc).toContain('vaultman.nodemove.proceed');
		// El id de valueMove sigue para paridad, pero el consumidor files
		// no lo usa como culminacion NodeMove.
		expect(sasiSrc).toContain('vaultman.move.proceed');
		expect(filesSrc).not.toMatch(/'vaultman\.move\.proceed'/);
	});

	it('Proceed stagea sin escribir y el bypass exige consentimiento explicito', () => {
		// Stage: addBatch, sin ejecucion inmediata en ese camino.
		expect(filesSrc).toMatch(/proceedNodeMoveToQueue\(/);
		// Bypass con modal de confirmacion existente, no escritura directa.
		expect(filesSrc).toMatch(/ConfirmModal/);
		expect(filesSrc).not.toMatch(/proceedFileMove\(\)/);
	});

	it('Cancel/Proceed/teardown terminan solo su clave y restauran', () => {
		expect(filesSrc).toMatch(/\.finish\(/);
		expect(filesSrc).toMatch(/cancelNodeMoveMode/);
		expect(filesSrc).toMatch(/setInteractionMode\(restore\.interactionMode/);
	});

	it('los ActionNodes tienen callbacks reales, sin stubs ni silencios', () => {
		expect(filesSrc).toMatch(/sasiNodeMoveHandlers\(\)/);
		expect(filesSrc).toMatch(/vaultman\.nodemove\.cancel/);
		expect(filesSrc).toMatch(/toggleNodeMoveWrite\(/);
		expect(filesSrc).toMatch(/toggleNodeMoveOriginDisposition\(/);
		// Nada de atajos que callan el tipado o el fallo en el bloque SASI.
		const start = filesSrc.indexOf('sasiNodeMoveHandlers');
		const end = filesSrc.indexOf('nodeMoveProceedAvailable', start);
		const nodeMoveBlock = filesSrc.slice(start, end > start ? end : start + 2000);
		expect(nodeMoveBlock).not.toContain('as any');
		expect(filesSrc).not.toMatch(/getFileMoveSlotNodes/);
	});

	it('el host Scene proyecta la barra del motor y oculta al cambiar Scene', () => {
		expect(pageSrc).toMatch(/projectNodeMoveBar/);
		expect(pageSrc).toMatch(/vaultman\.nodemove\.proceed/);
		expect(pageSrc).not.toMatch(
			/sasiInvoke\('vaultman\.move\.proceed'.*files/,
		);
	});
});
