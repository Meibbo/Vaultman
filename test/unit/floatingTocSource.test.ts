// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import floatingTocSource from '../../src/components/layout/floatingToc.svelte?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

const panelPrototypes = [
	['files', FilesExplorerPanel.prototype],
	['props', PropsExplorerPanel.prototype],
	['tags', TagsExplorerPanel.prototype],
] as const;

describe('Floating TOC source and panel contracts', () => {
	it.each(panelPrototypes)(
		'%s exposes the floating TOC panel port',
		(_name, prototype) => {
			expect(typeof prototype.getIndexNodes).toBe('function');
			expect(typeof prototype.isIndexableSort).toBe('function');
			expect(typeof prototype.expandNodeById).toBe('function');
			expect(typeof prototype.revealNode).toBe('function');
		},
	);

	it('keeps the rail disabled by default and gated away from Content + non-text sorts', () => {
		expect(DEFAULT_SETTINGS.floatingTocEnabled).toBe(false);
		expect(frameSource).toContain("filtersActiveTab !== 'content'");
		expect(frameSource).toContain('tocAvailable');
		expect(frameSource).toContain('panel.isIndexableSort()');
	});

	it('derives groups from the active panel at the current scope', () => {
		expect(frameSource).toContain('buildIndexGroups(');
		expect(frameSource).toContain('getIndexNodes(tocRootId)');
		expect(frameSource).toMatch(/tocKind === 'folders' \? node\.isContainer/);
	});

	it('wires the reveal router and the scope-drill pick listener', () => {
		expect(frameSource).toContain(
			"floatingTocRouter.invoke('reveal-node', targetId)",
		);
		expect(frameSource).toMatch(/floatingTocRouter\.setPort\(/);
		// Pick mode resolves the picked node's LEVEL (parent) from its data-id.
		expect(frameSource).toContain('tocPickMode');
		expect(frameSource).toContain("'[data-id]'");
		expect(frameSource).toContain('scopeRootForNode(id)');
	});

	it('renders separate kind-toggle and drill nodes plus glyph buttons', () => {
		expect(floatingTocSource).toContain('vaultman-floating-toc-toggle');
		expect(floatingTocSource).toContain('vaultman-floating-toc-drill');
		expect(floatingTocSource).toContain('onclick={onToggleKind}');
		expect(floatingTocSource).toContain('onclick={onEnterPick}');
		expect(floatingTocSource).toContain('onclick={() => onJump(group.firstId)}');
		expect(floatingTocSource).not.toContain('role="listitem"');
	});

	it('keeps pointer passthrough on the wrapper while glyphs stay interactive', () => {
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-wrap \{[\s\S]*?pointer-events:\s*none;/,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc \{[\s\S]*?pointer-events:\s*auto;/,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-item \{[\s\S]*?pointer-events:\s*auto;/,
		);
	});
});
