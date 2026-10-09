// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { ExplorerCellContributions } from '../../src/services/serviceExplorerCellContributions';
import { ExplorerCellMounts } from '../../src/services/serviceExplorerCellMounts';
import { fileExplorerCellTranslations } from '../../src/logic/logicFileExplorerCellTranslations';

const disposals: (() => void)[] = [];
afterEach(() => { for (const dispose of disposals.splice(0)) dispose(); document.body.replaceChildren(); });

function fixture() {
	document.body.innerHTML = '<div id="native" data-path="a.md" data-novel-word-count-plugin="123 words | 1 page"><div class="iconize-icon" data-icon="CustomPackIcon"><svg><path d="M1 2"/></svg></div></div><div id="vm" data-path="a.md"><div class="vaultman-tree-self"><span class="vaultman-tree-icon">default</span></div></div>';
	const native = document.getElementById('native'); const row = document.getElementById('vm');
	if (!native || !row) throw new Error('Missing fixture');
	const registry = new ExplorerCellContributions();
	const projection = { before: false, after: true };
	const mounts = new ExplorerCellMounts(registry, { row: () => native, onLayout: () => () => {}, pseudoVisible: (_row, pseudo) => projection[pseudo] }, document);
	disposals.push(() => { mounts.destroy(); registry.destroy(); });
	return { native, row, registry, mounts, projection };
}

it('translates emitted markup through optional adapters, then restores cells on unregister', () => {
	const { row, registry, mounts } = fixture();
	const offs = fileExplorerCellTranslations.map(provider => registry.register(provider));
	mounts.bind(row, true);
	expect(row.querySelector('.vaultman-tree-icon svg path')?.getAttribute('d')).toBe('M1 2');
	expect(row.querySelector('.vaultman-tree-icon')?.getAttribute('data-vaultman-contributed-icon')).toBe('true');
	expect(row.querySelector('.vaultman-tree-icon')?.getAttribute('data-icon')).toBe('CustomPackIcon');
	expect(row.querySelector('[data-cell="file-explorer-annotation"]')?.textContent).toBe('123 words | 1 page');
	for (const off of offs) off();
	expect(row.querySelector('.vaultman-explorer-cell-text')).toBeNull();
	expect(row.querySelector('.vaultman-tree-icon')?.textContent).toBe('default');
});

it('supports an unrelated public provider without a plugin-specific engine path', () => {
	const { row, registry, mounts } = fixture();
	let reviews = 7;
	const off = registry.register({ id: 'review-provider', translate: ({ path }) =>
		[{ id: 'reviews', kind: 'text', text: `${path}: ${reviews} reviews` }] });
	mounts.bind(row, true);
	const cell = row.querySelector('[data-cell="reviews"]');
	reviews = 9; registry.invalidate();
	expect(row.querySelector('[data-cell="reviews"]')).toBe(cell);
	expect(cell?.textContent).toBe('a.md: 9 reviews');
	off(); expect(row.querySelector('[data-cell="reviews"]')).toBeNull();
});

it('updates cells on native mutations without rebuilding the row or accumulating DOM', async () => {
	const { native, row, registry, mounts } = fixture();
	for (const provider of fileExplorerCellTranslations) registry.register(provider);
	mounts.bind(row, true);
	const cell = row.querySelector('[data-cell="file-explorer-annotation"]');
	native.setAttribute('data-novel-word-count-plugin', '2 words');
	await new Promise<void>(resolve => queueMicrotask(resolve));
	expect(row.querySelector('[data-cell="file-explorer-annotation"]')).toBe(cell);
	expect(cell?.textContent).toBe('2 words');
	mounts.bind(row, false); expect(row.querySelector('.vaultman-explorer-cell-text')).toBeNull();
});

it('creates only the contributed custom icon when no generic icon slot exists', () => {
	const { row, registry, mounts } = fixture();
	row.querySelector('.vaultman-tree-icon')?.remove();
	const offs = fileExplorerCellTranslations.map(provider => registry.register(provider));
	mounts.bind(row, true, { icons: true, addons: true });
	expect(row.querySelector('.vaultman-tree-icon svg')).not.toBeNull();
	for (const off of offs) off();
	expect(row.querySelector('.vaultman-tree-icon')).toBeNull();
});

it('does not convert a stale attribute into text when the native pseudo is no longer projected', () => {
	const { row, registry, mounts, projection } = fixture();
	for (const provider of fileExplorerCellTranslations) registry.register(provider);
	mounts.bind(row, true);
	projection.after = false;
	mounts.refresh();
	expect(row.querySelector('.vaultman-explorer-cell-text')).toBeNull();
});

it('lets cell_addons hide annotations without hiding the primary icon or leaving a pseudo clone', () => {
	const { row, registry, mounts } = fixture();
	for (const provider of fileExplorerCellTranslations) registry.register(provider);
	mounts.bind(row, true, { icons: true, addons: false });
	expect(row.querySelector('.vaultman-explorer-cell-text')).toBeNull();
	expect(row.querySelector('.vaultman-tree-icon svg')).not.toBeNull();
	expect(row.querySelector('.vaultman-tree-self')?.getAttribute('data-vaultman-translated-after')).toBe('true');
});
