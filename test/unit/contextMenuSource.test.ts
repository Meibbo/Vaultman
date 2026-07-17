import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import contextMenuSource from '../../src/services/serviceContextMenu.ts?raw';

describe('ContextMenuService source guards', () => {
	it('registers a panel action to clear active filters from node context menus', () => {
		expect(contextMenuSource).toContain("id: 'filters.clear-selection'");
		expect(contextMenuSource).toContain(
			"label: translate('context_menu.clean_filters')",
		);
		expect(en['context_menu.clean_filters']).toBe('Clean filters');
		expect(es['context_menu.clean_filters']).toBe('Limpiar filtros');
		expect(contextMenuSource).toContain(
			'this.plugin.filterService?.clearFilters()',
		);
		expect(contextMenuSource).toContain(
			"nodeTypes: ['file', 'folder', 'tag', 'prop', 'value']",
		);
	});

	it('removes the native file move action from Vaultman panel menus before adding its autosuggest move action', () => {
		expect(contextMenuSource).toContain('_removeNativeFileMoveActions(menu)');
		expect(contextMenuSource).toContain('_isNativeFileMoveTitle(title)');
		expect(contextMenuSource).toContain("title.includes('move file to')");
	});

	it('routes minimal explorer apply-queue menu action to the existing queue executor', () => {
		expect(contextMenuSource).toContain('minimalStyle: boolean;');
		expect(contextMenuSource).toContain('queueService?: {');
		expect(contextMenuSource).toContain("id: 'queue.apply'");
		expect(contextMenuSource).toContain(
			"label: translate('command.apply_queue')",
		);
		expect(contextMenuSource).toContain(
			'this.plugin.settings.minimalStyle === true',
		);
		expect(contextMenuSource).toContain(
			'this.plugin.queueService?.isEmpty === false',
		);
		expect(contextMenuSource).toContain(
			'void this.plugin.queueService?.execute();',
		);
	});

	it('supports explicit separators between adjacent panel actions', () => {
		expect(contextMenuSource).toContain('def.separatorBefore');
		expect(contextMenuSource).toContain('menu.addSeparator();');
	});

	it('emits the canonical file explorer context source for third-party integrations', () => {
		expect(contextMenuSource).toContain(
			"const FILE_EXPLORER_CONTEXT_SOURCE = 'file-explorer-context-menu';",
		);
		expect(contextMenuSource).toMatch(
			/\.trigger\(\s*'file-menu',\s*menu,\s*nativeTarget,\s*FILE_EXPLORER_CONTEXT_SOURCE,?\s*\)/,
		);
		expect(contextMenuSource).not.toContain(
			".trigger('file-menu', menu, nativeTarget, 'file-explorer')",
		);
	});

	it('routes sync throws and async action rejections through one error boundary', () => {
		expect(contextMenuSource).toContain(
			'private _runAction(def: ActionDef, ctx: MenuCtx): void',
		);
		expect(contextMenuSource).toMatch(
			/Promise\.resolve\(\)\s*\.then\(\(\) => def\.run\(ctx\)\)/,
		);
		expect(contextMenuSource).toContain('.catch((error) =>');
		expect(contextMenuSource).toContain(
			'new Notice(`Vaultman: action "${def.id}" failed${detail}`)',
		);
		expect(contextMenuSource).not.toContain('void def.run(ctx);');
	});
});
