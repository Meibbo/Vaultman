import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { expansionActionAvailable } from '../../src/logic/logicTreeExpansion';

describe('BT5-006 contextual expand/collapse availability', () => {
	it.each([
		['files', ['name', 'nested'], true],
		['props', ['icon', 'nested'], true],
		['tags', ['count', 'nested'], true],
		['files', ['name'], false],
		['props', ['icon'], false],
		['tags', ['count'], false],
		// A07b-1: B-groups2 doto a los explorers de addons de la misma
		// maquinaria de expansion que files/props/tags (cabeceras de grupo
		// como unicos nodos expandibles), asi que con `nested` visible
		// tambien ofrecen la accion. Antes pineaba el comportamiento viejo.
		['snippets', ['nested'], true],
		['plugins', ['nested'], true],
	] as const)('tab=%s cells=%j => %s', (tab, cells, expected) => {
		expect(expansionActionAvailable(tab, cells)).toBe(expected);
	});

	/**
	 * U130-t33 (L-PNODE) guarda negativa: con agrupacion encendida y
	 * anidacion apagada, un grupo sigue siendo un p-node plegable — el
	 * toggle NO puede quedar muerto solo porque `nested` este fuera de
	 * `visibleCells`. Antes de la correccion el navbar llamaba a
	 * `expansionActionAvailable` sin el tercer argumento (defecto `false`),
	 * asi que este caso exacto (agrupacion si, anidacion no) devolvia
	 * `false` aunque hubiera cabeceras con hijos en pantalla.
	 */
	it.each([
		['files', [], true, true],
		['props', [], true, true],
		['tags', [], true, true],
		['files', [], false, false],
		['props', [], false, false],
		['tags', [], false, false],
		// A07b-1: la agrupacion SI crea el toggle en addons desde que
		// exponen `hasExpandedNodes`/`expandAll`/`collapseAll` (B-groups2):
		// sin preset no hay nada que plegar, con preset el boton aparece.
		['snippets', [], true, true],
		['plugins', [], true, true],
		['snippets', [], false, false],
		['plugins', [], false, false],
	] as const)(
		'tab=%s cells=%j groupingActive=%s => %s',
		(tab, cells, groupingActive, expected) => {
			expect(expansionActionAvailable(tab, cells, groupingActive)).toBe(
				expected,
			);
		},
	);

	it('el navbar pasa groupingActive (groupPreset distinto de none) a expansionActionAvailable', () => {
		// Guarda negativa a nivel de fuente: si alguien vuelve a llamar a
		// expansionActionAvailable con solo (tab, visibleCells), el defecto
		// `false` del parametro deja muerto el toggle exactamente en el caso
		// de arriba, y esta aserción lo detecta sin montar el navbar entero.
		const callStart = navbarSource.indexOf(
			'expansionActionAvailable(\n\t\t\tactiveTab,',
		);
		expect(callStart).toBeGreaterThanOrEqual(0);
		const callEnd = navbarSource.indexOf(');', callStart);
		const callSource = navbarSource.slice(callStart, callEnd);
		// Spec 08 §3.1.bis: el interruptor es el preset seleccionado, no el
		// scope de orden; el scope `groups` no puede volver a serlo.
		expect(callSource).toContain(".groupPreset.kind !== 'none'");
		expect(callSource).not.toContain("activeScope === 'groups'");
	});

	it('keeps reveal in the generic Tools projection while gating only expansion', () => {
		expect(navbarSource).toContain('expansionActionAvailable(');
		expect(navbarSource).toContain('visibleCellsByTab[activeTab]');

		const toolsStart = navbarSource.indexOf(
			'function openToolsMenu(event: MouseEvent)',
		);
		const toolsEnd = navbarSource.indexOf('\n\tfunction ', toolsStart + 1);
		const toolsSource = navbarSource.slice(toolsStart, toolsEnd);
		expect(toolsSource).toContain(
			'for (const node of panelWidgetProjection.nodes)',
		);
		expect(toolsSource).toContain(
			'if (!forcedOverflowIds.includes(node.id)) continue;',
		);
		expect(toolsSource).not.toContain('expansionActionAvailableForActiveTab');
		// Formatting-tolerant: what matters is which branch appends which node,
		// not how Prettier happened to wrap the argument list. The exact-string
		// form of these two silently broke the moment the calls went multi-line.
		expect(navbarSource).toMatch(
			/if \(activeTab === 'files'\) \{\s*append\(\s*'reveal-active-file'/,
		);
		expect(navbarSource).toMatch(
			/if \(expansionActionAvailableForActiveTab\) \{\s*append\(\s*'toggle-expansion'/,
		);

		expect(navbarSource).toContain('{#if compactPanelWidgetTools}');
		expect(navbarSource).toContain(
			"{#if expansionActionAvailableForActiveTab && toolbarNodeVisible('toggle-expansion')}",
		);
	});
});
