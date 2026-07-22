import { describe, expect, it, vi } from 'vitest';

import {
	contentMenuNode,
	registerContentActions,
} from '../../src/logic/logicContentContextMenu';
import type { ActionDef, MenuCtx } from '../../src/types/typeCMenu';
import mainSource from '../../src/main.ts?raw';
import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

function fakePlugin() {
	const registry: ActionDef[] = [];
	const promptForFileRename = vi.fn();
	const promptForFileDeletion = vi.fn();
	const plugin = {
		contextMenuService: {
			registerAction: (def: ActionDef) => registry.push(def),
		},
		app: { fileManager: { promptForFileRename, promptForFileDeletion } },
	} as unknown as Parameters<typeof registerContentActions>[0];
	return { plugin, registry, promptForFileRename, promptForFileDeletion };
}

function ctxFor(path: string): MenuCtx {
	const file = { path, basename: path.replace(/\.md$/, '') } as never;
	return {
		nodeType: 'content',
		node: contentMenuNode(file),
		surface: 'panel',
		file,
	};
}

describe('BT5-036 content node actions', () => {
	it('registers Rename and Delete for content nodes', () => {
		const { plugin, registry } = fakePlugin();
		registerContentActions(plugin);
		const ids = registry.map((d) => d.id);
		expect(ids).toContain('content.rename');
		expect(ids).toContain('content.delete');
		for (const def of registry) {
			expect(def.nodeTypes).toEqual(['content']);
			expect(def.surfaces).toEqual(['panel']);
		}
	});

	it('opens the rich queued rename flow while keeping native deletion', () => {
		const { plugin, registry, promptForFileRename, promptForFileDeletion } =
			fakePlugin();
		const openRename = vi.fn();
		registerContentActions(plugin, openRename);
		const ctx = ctxFor('Notes/Alpha.md');
		void registry.find((d) => d.id === 'content.rename')?.run(ctx);
		void registry.find((d) => d.id === 'content.delete')?.run(ctx);
		expect(openRename).toHaveBeenCalledWith(plugin, [ctx.file]);
		expect(promptForFileRename).not.toHaveBeenCalled();
		expect(promptForFileDeletion).toHaveBeenCalledWith(ctx.file);
	});

	it('is a no-op without a file on the ctx', () => {
		const { plugin, registry, promptForFileDeletion } = fakePlugin();
		registerContentActions(plugin);
		const del = registry.find((d) => d.id === 'content.delete');
		expect(del?.when?.({ ...ctxFor('x.md'), file: undefined })).toBe(false);
		void del?.run({ ...ctxFor('x.md'), file: undefined });
		expect(promptForFileDeletion).not.toHaveBeenCalled();
	});

	it('wires the content menu from tab through the page and plugin load', () => {
		// Content header opens the configurable menu.
		expect(tabContentSource).toContain('onContentContextMenu');
		expect(tabContentSource).toContain('oncontextmenu');
		// The page routes it through the per-kind panel menu as a content node.
		expect(pageFiltersSource).toContain('openContentContextMenu');
		expect(pageFiltersSource).toContain("nodeType: 'content'");
		// Actions are registered once at plugin load.
		expect(mainSource).toContain('registerContentActions(this)');
		expect(pageFiltersSource).toContain('queuedRenameBadgeForPath');
		expect(tabContentSource).toContain('queuedRenameBadge');
		expect(tabContentSource).toContain('cancelQueuedRename');
	});
});
