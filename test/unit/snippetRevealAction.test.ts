import { describe, expect, it, vi } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import {
	mergeFilesMenuLayout,
	type FilesMenuItem,
} from '../../src/logic/logicFilesContextMenu';
import { registerSnippetActions } from '../../src/logic/logicSnippetContextMenu';
import {
	REVEAL_IN_SYSTEM_EXPLORER_ICON,
	SNIPPET_REVEAL_ACTION_ID,
} from '../../src/logic/logicSystemExplorer';
import type { ActionDef, MenuCtx } from '../../src/types/typeCMenu';

vi.mock('../../src/modals/modalAddonIconPicker', () => ({
	openAddonIconPicker: vi.fn(),
}));

function fakePlugin(options: { canReveal?: boolean } = {}) {
	const registry: ActionDef[] = [];
	const showInFolder = vi.fn();
	const getSnippetPath = vi.fn(
		(name: string) => `.custom-config/snippets/${name}.css`,
	);
	const app = {
		customCss: { getSnippetPath },
		...(options.canReveal === false ? {} : { showInFolder }),
		vault: { adapter: { remove: vi.fn() } },
	};
	const plugin = {
		app,
		settings: {},
		contextMenuService: {
			registerAction: (def: ActionDef) => registry.push(def),
		},
		queueService: { operationMode: 'queue', addOrRun: vi.fn() },
		propertyIndex: {},
		saveSettings: vi.fn(),
	} as unknown as Parameters<typeof registerSnippetActions>[0];
	registerSnippetActions(plugin);
	return { registry, showInFolder, getSnippetPath };
}

function snippetCtx(name = 'theme'): MenuCtx {
	return {
		nodeType: 'snippet',
		node: {
			id: `snippet:${name}`,
			label: name,
			depth: 0,
			meta: { name, enabled: true },
		},
		surface: 'panel',
	};
}

describe('BT5-050 canonical Snippet Reveal action', () => {
	it('registers one localized action with the intercepted Files icon', () => {
		const { registry } = fakePlugin();
		const reveal = registry.find((def) => def.id === SNIPPET_REVEAL_ACTION_ID);

		expect(registry.filter((def) => def.id === SNIPPET_REVEAL_ACTION_ID)).toHaveLength(
			1,
		);
		expect(registry.some((def) => def.id === 'snippet.see-details')).toBe(false);
		expect(reveal?.icon).toBe(REVEAL_IN_SYSTEM_EXPLORER_ICON);
		expect(reveal?.label).toBe(en['snippet.reveal_system_explorer']);
		expect(es['snippet.reveal_system_explorer']).toBe(
			'Mostrar en el explorador del sistema',
		);
		expect(registry.some((def) => def.id === 'snippet.open-default-app')).toBe(
			true,
		);
	});

	it('resolves the configured snippet path and hides on unsupported platforms', () => {
		const supported = fakePlugin();
		const reveal = supported.registry.find(
			(def) => def.id === SNIPPET_REVEAL_ACTION_ID,
		);
		const ctx = snippetCtx();

		expect(reveal?.when?.(ctx)).toBe(true);
		void reveal?.run(ctx);
		expect(supported.getSnippetPath).toHaveBeenCalledWith('theme');
		expect(supported.showInFolder).toHaveBeenCalledWith(
			'.custom-config/snippets/theme.css',
		);

		const unsupported = fakePlugin({ canReveal: false });
		const unavailable = unsupported.registry.find(
			(def) => def.id === SNIPPET_REVEAL_ACTION_ID,
		);
		expect(unavailable?.when?.(ctx)).toBe(false);
		void unavailable?.run(ctx);
		expect(unsupported.showInFolder).not.toHaveBeenCalled();
	});

	it('migrates the retired id without losing order or visibility', () => {
		const saved: FilesMenuItem[] = [
			{ kind: 'action', id: 'snippet.toggle', visible: true },
			{ kind: 'action', id: 'snippet.see-details', visible: false },
			{ kind: 'action', id: 'snippet.rename', visible: true },
		];
		const merged = mergeFilesMenuLayout(saved, [
			'snippet.toggle',
			SNIPPET_REVEAL_ACTION_ID,
			'snippet.rename',
		]);

		expect(merged).toEqual([
			{ kind: 'action', id: 'snippet.toggle', visible: true },
			{ kind: 'action', id: SNIPPET_REVEAL_ACTION_ID, visible: false },
			{ kind: 'action', id: 'snippet.rename', visible: true },
		]);
	});
});
