import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	addInvokedSelection,
	shouldClearExplorerSelectionOnEscape,
} from '../../src/logic/logicSelectionTargets';

const source = (name: string): string =>
	readFileSync(new URL(`../../src/components/containers/${name}`, import.meta.url), 'utf8');

const logicSource = (name: string): string =>
	readFileSync(new URL(`../../src/logic/${name}`, import.meta.url), 'utf8');

/** Slice a `private <method>` body out of an explorer source file. */
const methodBody = (text: string, method: string): string => {
	const start = text.indexOf(`private ${method}`);
	if (start < 0) return '';
	const next = text.indexOf('\n\tprivate ', start + 1);
	return next < 0 ? text.slice(start) : text.slice(start, next);
};

describe('U130-GGC context selection', () => {
	it('preserves the axon and adds the invoked id exactly once', () => {
		const first = addInvokedSelection(new Set(['a', 'b']), 'c');
		expect([...first]).toEqual(['a', 'b', 'c']);
		const second = addInvokedSelection(first, 'c');
		expect([...second]).toEqual(['a', 'b', 'c']);
	});

	it('does not mutate the incoming selection and returns a new set', () => {
		const input = new Set(['a']);
		const next = addInvokedSelection(input, 'b');
		expect(input.has('b')).toBe(false);
		expect(next).not.toBe(input);
		expect([...next]).toEqual(['a', 'b']);
	});

	it('adds to an empty selection', () => {
		expect([...addInvokedSelection(new Set(), 'x')]).toEqual(['x']);
	});

	it('clears on bare Escape but yields to editors and menus', () => {
		const bare = { key: 'Escape', defaultPrevented: false, target: null };
		expect(shouldClearExplorerSelectionOnEscape(bare)).toBe(true);
		expect(shouldClearExplorerSelectionOnEscape({ ...bare, key: 'Enter' })).toBe(false);
		expect(shouldClearExplorerSelectionOnEscape({ ...bare, defaultPrevented: true })).toBe(false);
		expect(
			shouldClearExplorerSelectionOnEscape({
				...bare,
				target: { closest: () => ({}) } as unknown as Element,
			}),
		).toBe(false);
	});

	it('yields Escape to inputs, editors, modals, menus and dialogs', () => {
		const bare = { key: 'Escape', defaultPrevented: false, target: null };
		for (const selector of [
			'input',
			'textarea',
			'.modal-container',
			'.menu',
			'.suggestion-container',
		]) {
			expect(
				shouldClearExplorerSelectionOnEscape({
					...bare,
					target: { closest: (sel: string) => (sel.includes(selector) ? {} : null) } as unknown as Element,
				}),
				selector,
			).toBe(false);
		}
		// A plain container (closest matches nothing) keeps explorer ownership.
		expect(
			shouldClearExplorerSelectionOnEscape({
				...bare,
				target: { closest: () => null } as unknown as Element,
			}),
		).toBe(true);
	});

	it('wires context inclusion and Escape in every explorer', () => {
		for (const file of [
			'explorerFiles.ts',
			'explorerProps.ts',
			'explorerTags.ts',
			'explorerSnippets.ts',
			'explorerPlugins.ts',
		]) {
			const text = source(file);
			expect(text, file).toContain('_includeInvokedInSelection(');
			expect(text, file).toContain("addEventListener('keydown', this._handleSelectionEscape)");
			expect(text, file).toContain('shouldClearExplorerSelectionOnEscape(event)');
			expect(text, file).toContain('clearSelection()');
		}
	});

	it('includes the invoked node before building MenuCtx in every explorer', () => {
		// Props centralizes every right-click through _openNodeMenu.
		const props = source('explorerProps.ts');
		const openNodeMenu = props.slice(props.indexOf('private _openNodeMenu'));
		expect(openNodeMenu.indexOf('this._includeInvokedInSelection(node.id')).toBeGreaterThanOrEqual(0);
		expect(openNodeMenu.indexOf('this._includeInvokedInSelection(node.id')).toBeLessThan(
			openNodeMenu.indexOf('openPanelMenu('),
		);
		// Files covers table/grid via _openFileContextMenu and tree via onContextMenu.
		const files = source('explorerFiles.ts');
		const openFileMenu = files.slice(files.indexOf('private _openFileContextMenu'));
		expect(openFileMenu.indexOf('this._includeInvokedInSelection(file.path)')).toBeLessThan(
			openFileMenu.indexOf('openPanelMenu('),
		);
		// Tags/Plugins/Snippets call sites precede the menu construction.
		for (const file of ['explorerTags.ts', 'explorerPlugins.ts', 'explorerSnippets.ts']) {
			const text = source(file);
			const calls: number[] = [];
			let from = 0;
			for (;;) {
				const at = text.indexOf('this._includeInvokedInSelection(', from);
				if (at < 0) break;
				calls.push(at);
				from = at + 1;
			}
			expect(calls.length, file).toBeGreaterThan(0);
			expect(
				calls.some((at) => text.slice(at, at + 2000).includes('openPanelMenu(') || text.slice(at, at + 2000).includes('this.openMenu(')),
				file,
			).toBe(true);
		}
	});

	it('never pulls the action-only add_property row into the selection', () => {
		const props = source('explorerProps.ts');
		expect(props).toContain('if (id === PropsExplorerPanel.ADD_PROPERTY_ROW_ID) return;');
	});

	it('gates Group selected on capability/selection, never on input=select or checkbox', () => {
		for (const file of [
			'explorerFiles.ts',
			'explorerProps.ts',
			'explorerTags.ts',
			'explorerSnippets.ts',
			'explorerPlugins.ts',
		]) {
			const body = methodBody(source(file), '_groupCreationMenuCtx');
			expect(body, file).not.toBe('');
			expect(body, file).toContain('createGroupHandler');
			expect(body, file).toMatch(/selected\w*(NodeIds|FilePaths)\.size === 0/);
			expect(body, file).not.toContain('interactionMode');
			expect(body, file).not.toContain('visibleCells');
		}
		const menu = logicSource('logicGroupContextMenu.ts');
		expect(menu).toContain(
			'when: (ctx: MenuCtx) => typeof ctx.createGroupWithSelected === \'function\'',
		);
		expect(menu).toContain(
			'when: (ctx: MenuCtx) => typeof ctx.degroupSelected === \'function\'',
		);
	});

	it('hides inert group actions: delete needs handler plus custom/note owner, icon needs handler only', () => {
		const menu = logicSource('logicGroupContextMenu.ts');
		expect(menu).toContain("(isCustom(ctx) || ctx.groupOwner === 'note')");
		expect(menu).toContain('typeof ctx.deleteGroup === \'function\'');
		expect(menu).toContain(
			"typeof ctx.changeGroupIcon === 'function' || Boolean(ctx.groupId || ctx.node?.id)",
		);
		const iconBlock = menu.slice(menu.indexOf("id: 'group.icon'"), menu.indexOf("id: 'group.hide-toggle'"));
		expect(iconBlock).not.toContain("'preset'");
	});
});
