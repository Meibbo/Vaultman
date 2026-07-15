// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';
import floatingTocSource from '../../src/components/layout/floatingToc.svelte?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import gridSource from '../../src/components/layout/viewGrid.ts?raw';
import routerSource from '../../src/services/routerFloatingToc.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
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

const panelSources = [
	['files', filesExplorerSource],
	['props', propsExplorerSource],
	['tags', tagsExplorerSource],
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

	it.each(panelSources)(
		'%s reports explicit collapse events through the index callback',
		(_name, source) => {
			expect(source).toContain(
				'onIndexChanged?: (change?: FloatingTocExpansionChange) => void',
			);
			expect(source).toContain("{ type: 'collapse-node', id }");
			expect(source).toContain("{ type: 'collapse-all' }");
			expect(source).toContain(
				'_notifyExpansionChanged(change?: FloatingTocExpansionChange)',
			);
		},
	);

	it('re-exports the shared expansion event from the floating TOC router', () => {
		expect(routerSource).toContain(
			"export type { FloatingTocExpansionChange } from '../logic/logicIndexGroups'",
		);
	});

	it('carries reveal behavior through router, panels, and virtualized grids', () => {
		expect(routerSource).toContain('export interface RevealNodeOptions');
		expect(routerSource).toContain('options?: RevealNodeOptions');
		for (const [, source] of panelSources) {
			expect(source).toContain('options?: RevealNodeOptions');
			expect(source).toContain('options?.behavior');
		}
		for (const source of [gridSource, filesGridSource]) {
			expect(source).toContain("behavior: ScrollBehavior = 'auto'");
			expect(source).toContain('.scrollTo({');
			expect(source).toContain('behavior,');
		}
	});

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
			"floatingTocRouter.invoke('reveal-node', targetId, {",
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

	it('renders close first and uses a one-level scoped back action', () => {
		const closeIndex = floatingTocSource.indexOf(
			'vaultman-floating-toc-close',
		);
		const toggleIndex = floatingTocSource.indexOf(
			'vaultman-floating-toc-toggle',
		);
		expect(closeIndex).toBeGreaterThan(-1);
		expect(closeIndex).toBeLessThan(toggleIndex);
		expect(floatingTocSource).toContain('onclick={onClose}');
		expect(floatingTocSource).toContain('onclick={onBack}');
		expect(floatingTocSource).not.toContain('onResetScope');
		expect(frameSource).toContain(
			'panel.scopeRootForNode(tocRootId)',
		);
	});

	it('reconciles collapse events only for the active panel', () => {
		expect(frameSource).toContain('scopeAfterExpansionChange(');
		expect(frameSource).toContain('filtersActiveTab !== panelId');
		expect(frameSource).toContain('change?: FloatingTocExpansionChange');
	});

	it('replaces the inert Instant Jump UI with real opt-in Soft Scroll', () => {
		expect(DEFAULT_SETTINGS.tocSoftScroll).toBe(false);
		expect(settingsSource).toContain("translate('settings.toc_soft_scroll')");
		expect(settingsSource).not.toContain("translate('settings.toc_hard_jump')");
		expect(frameSource).toContain(
			"behavior: tocSoftScroll ? 'smooth' : 'auto'",
		);
		expect(floatingTocSource).not.toContain('hardJump');
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
