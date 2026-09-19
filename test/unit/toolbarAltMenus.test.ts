import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import typeInstanceSource from '../../src/types/typeInstance.ts?raw';
import { resolveToolbarHiddenIds } from '../../src/logic/logicPanelWidgetProjection';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

/**
 * U130 toolbar alt-cmenus (right-click): per-instance overrides. Los
 * globales no se tocan — cada toggle escribe el config de la scene activa.
 * Esta fuente es el contrato que la rama se compromete a mantener.
 */
describe('U130 toolbar alt-cmenus', () => {
	it('expone SceneConfig per-instance para label, always-reveal y nodos ocultos', () => {
		expect(typeInstanceSource).toContain(
			"sceneLabelMode?: 'auto' | 'on' | 'off'",
		);
		expect(typeInstanceSource).toContain(
			"autoRevealMode?: 'auto' | 'on' | 'off'",
		);
		expect(typeInstanceSource).toContain('hiddenToolbarNodes?: string[]');
	});

	it('mezcla ocultos globales y per-instance antes de proyectar', () => {
		expect(navbarSource).toContain('effectivePvpuiConfig');
		expect(navbarSource).toContain('resolveToolbarHiddenIds(');
		// Sin esto, un nodo oculto seguiría ocupando medida y el condensed
		// lo contaría igual: el orden correcto es ocultar -> proyectar.
		expect(navbarSource).toContain('hiddenToolbarNodes');
	});

	it('mezcla ids completos globales con locales per-instance por provider', () => {
		expect(resolveToolbarHiddenIds(['p:view'], ['sort'], 'p')).toEqual([
			'p:view',
			'p:sort',
		]);
		expect(resolveToolbarHiddenIds(undefined, undefined, 'p')).toEqual([]);
		expect(resolveToolbarHiddenIds(['p:view'], [], 'p')).toEqual(['p:view']);
		// Mismo local id en otro provider no colisiona.
		expect(resolveToolbarHiddenIds([], ['view'], 'q')).toEqual(['q:view']);
	});

	it('cablea oncontextmenu en cada nodo y en el espacio vacío', () => {
		expect(navbarSource).toContain('openNodeAltMenu(');
		expect(navbarSource).toContain('openToolbarEmptyMenu(');
		for (const localId of [
			"'tabs'",
			"'view'",
			"'sort'",
			"'search'",
			"'reveal-active-file'",
			"'toggle-expansion'",
			"'create-file'",
			"'create-folder'",
		]) {
			expect(navbarSource).toContain(`openNodeAltMenu(${localId}, e)`);
		}
		expect(navbarSource).toContain('openNodeAltMenu(`header:${action.id}`, e)');
		expect(navbarSource).toContain(
			'openNodeAltMenu(`command:${command.id}`, e)',
		);
		// El wrap ignora el evento cuando nace en un nodo (el nodo ya abrió
		// el suyo con stopPropagation): solo el espacio vacío abre el menú
		// del toolbar.
		expect(navbarSource).toContain("closest?.('[data-panel-widget-node-id]')");
	});

	it('el menú vacío ofrece Toolbar y solo nodos provided', () => {
		expect(navbarSource).toContain("translate('viewmenu.toolbar')");
		expect(navbarSource).toContain("localId.startsWith('command:')");
	});

	it('el nodo de escena alterna su label per-instance', () => {
		expect(navbarSource).toContain('tabsButtonLabelEffective');
		expect(navbarSource).toContain('sceneLabelMode');
	});

	it('el nodo reveal alterna el always-reveal per-instance y revela ya', () => {
		expect(navbarSource).toContain("translate('toolbar.alt.reveal_now')");
		expect(navbarSource).toContain("translate('toolbar.alt.always_reveal')");
		expect(navbarSource).toContain('setAutoRevealOverride');
		expect(explorerFilesSource).toContain('setAutoRevealOverride(');
		expect(explorerFilesSource).toContain('autoRevealOverride');
	});

	it('los nodos ofrecen change icon con picker y reset per-instance', () => {
		expect(navbarSource).toContain("translate('toolbar.alt.change_icon')");
		expect(navbarSource).toContain('openAddonIconPicker(');
		expect(navbarSource).toContain('toolbarNodeIcons');
		expect(typeInstanceSource).toContain(
			'toolbarNodeIcons?: Record<string, string>',
		);
	});

	it('pinta cada nodo con el mismo override que edita el alt-cmenu', () => {
		// Normaliza espacios, apertura de paren y comas finales en AMBOS
		// lados: prettier puede envolver estas llamadas en varias lineas
		// (con trailing comma) sin cambiar su significado; el contrato es
		// la expresion, no su ajuste de linea.
		const norm = (code: string): string =>
			code
				.replace(/\s+/g, ' ')
				.replace(/\(\s+/g, '(')
				.replace(/,\s*\)/g, ')');
		const source = norm(navbarSource);
		const renderedIcons = [
			"panelWidgetNodeIcon('tabs', currentTabsIcon)",
			'panelWidgetNodeIcon(`header:${action.id}`, action.icon)',
			"panelWidgetNodeIcon('view', 'lucide-layout-list')",
			"panelWidgetNodeIcon('sort', 'lucide-arrow-up-down')",
			"panelWidgetNodeIcon('search', 'lucide-search')",
			"panelWidgetNodeIcon( 'reveal-active-file',",
			"panelWidgetNodeIcon('toggle-expansion', expansionIcon)",
			"panelWidgetNodeIcon('create-file', 'lucide-file-plus')",
			"panelWidgetNodeIcon('create-folder', 'lucide-folder-plus')",
			'panelWidgetNodeIcon( `command:${command.id}`',
		];
		for (const iconExpression of renderedIcons) {
			expect(source).toContain(norm(iconExpression));
		}
	});

	it('las cadenas del alt-cmenu existen en en.ts y en es.ts', () => {
		for (const key of [
			'toolbar.alt.scene_label',
			'toolbar.alt.show_in_toolbar',
			'toolbar.alt.reveal_now',
			'toolbar.alt.always_reveal',
			'toolbar.alt.change_icon',
		]) {
			expect(en[key], `en: ${key}`).toBeTruthy();
			expect(es[key], `es: ${key}`).toBeTruthy();
			expect(es[key], `es!=en: ${key}`).not.toBe(en[key]);
		}
	});
});
