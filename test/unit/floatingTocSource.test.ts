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
import logicNiagaraSource from '../../src/logic/logicNiagaraTrack.ts?raw';
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

	it('projects hidden-scrollbar gutter separately from the explicit lane', () => {
		expect(DEFAULT_SETTINGS.tocReservedLane).toBe(false);
		expect(settingsSource).toContain("translate('settings.toc_reserved_lane')");
		expect(settingsSource).toContain(
			"this.plugin.settings.tocHideExplorerScrollbar !== true",
		);
		expect(frameSource).toContain('resolveFloatingTocLaneLayout');
		expect(frameSource).toContain('vaultman-pages-viewport--toc-gutter-right');
		expect(frameSource).toContain('vaultman-pages-viewport--toc-gutter-left');
		expect(frameSource).toContain(
			'vaultman-pages-viewport--toc-explicit-lane-right',
		);
		expect(frameSource).toContain('vaultman-pages-viewport--toc-hide-scrollbar');
		expect(frameSource).toContain('--vaultman-toc-content-gutter');
		expect(frameSource).toContain('--vaultman-toc-rail-scrollbar-offset');
		expect(stylesSource).not.toContain('--vaultman-toc-reserved-lane-size');
		expect(stylesSource).not.toMatch(/right:\s*14px/);
		expect(stylesSource).toContain(
			'--vaultman-toc-rail-edge-offset: 2px',
		);
		expect(stylesSource).toContain(
			'--vaultman-toc-rail-edge-offset: 4px',
		);
		expect(stylesSource).toContain(
			'var(--vaultman-toc-rail-scrollbar-offset)',
		);
		expect(stylesSource).toContain(
			'padding-inline-end: var(--vaultman-toc-content-gutter)',
		);
		expect(stylesSource).toContain(
			'padding-inline-start: var(--vaultman-toc-content-gutter)',
		);
	});

	it('rejects incompatible toolbar activation before persisting the index state', () => {
		const toggleSource = frameSource.match(
			/function toggleFloatingToc\(\) \{([\s\S]*?)\r?\n\t\}\r?\n\tconst floatingTocNiagara/,
		)?.[1];
		expect(toggleSource).toBeDefined();
		expect(toggleSource).toContain('resolveFloatingTocToggle(');
		expect(toggleSource).toContain(
			"decision.rejection === 'incompatible-sort'",
		);
		expect(toggleSource).toContain(
			"new Notice(translate('floating_toc.incompatible_sort'))",
		);
		expect(toggleSource).toContain('decision.nextEnabled');
		expect(toggleSource!.indexOf('return;')).toBeLessThan(
			toggleSource!.indexOf('void plugin.saveData(plugin.settings);'),
		);
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

	it('renders kind-toggle and drill actions plus indexed buttons', () => {
		expect(floatingTocSource).toContain('vaultman-floating-toc-toggle');
		expect(floatingTocSource).toContain('vaultman-floating-toc-drill');
		expect(floatingTocSource).toContain('onToggleKind()');
		expect(floatingTocSource).toContain('onEnterPick()');
		expect(floatingTocSource).toContain('handleGroupClick(event, i)');
		expect(floatingTocSource).not.toContain('role="listitem"');
	});

	it('renders close first and uses a one-level scoped back action', () => {
		const closeIndex = floatingTocSource.indexOf('vaultman-floating-toc-close');
		const toggleIndex = floatingTocSource.indexOf(
			'vaultman-floating-toc-toggle',
		);
		expect(closeIndex).toBeGreaterThan(-1);
		expect(closeIndex).toBeLessThan(toggleIndex);
		expect(floatingTocSource).toContain('onClose()');
		expect(floatingTocSource).toContain('onBack()');
		expect(floatingTocSource).not.toContain('onResetScope');
		expect(frameSource).toContain('panel.scopeRootForNode(tocRootId)');
	});

	it('joins ordered action controls and indexed groups on one Niagara track', () => {
		expect(floatingTocSource).toContain('niagaraActionOrder({');
		expect(floatingTocSource).toContain('{#if !opts.nodes}');
		expect(floatingTocSource).toContain('{#if opts.nodes}');
		expect(floatingTocSource).toContain('groupTrackIndex(i)');
		expect(floatingTocSource).toContain('use:registerTrackEntry={trackIndex}');
		expect(floatingTocSource).toContain('niagaraNodeTransform(');
	});

	it('keeps Niagara transform and always-on glyph color as separate declarations', () => {
		expect(floatingTocSource).toContain(
			'scale(${transform.scale});`',
		);
		expect(floatingTocSource).toContain(
			"(opts.glyphColorMode ?? 'static') === 'static'",
		);
	});

	it('keeps scrubbed actions inert and navigates only when the nearest group changes', () => {
		expect(floatingTocSource).toContain("target.kind === 'group'");
		expect(floatingTocSource).toContain('groupIndex !== lastJumpedGroupIndex');
		expect(floatingTocSource).toContain('suppressNextTrackClick');
		expect(floatingTocSource).toContain('handleActionClick(');
	});

	it('threads the current rail shift through bidirectional reversal hysteresis', () => {
		expect(floatingTocSource).toMatch(
			/niagaraTrackShift\(\s*constrainedAlong,\s*firstCenter,\s*lastCenter,\s*shift,?\s*\)/,
		);
		expect(floatingTocSource).not.toContain('shiftHWM');
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

	it('centers the horizontal rail, anchors dock-off bottom, and mirrors Niagara origins', () => {
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-wrap\.pos-bottom \{[\s\S]*?justify-content:\s*center;/,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-pages-viewport--dock-off\s+\.vaultman-floating-toc-wrap\.pos-bottom \{[\s\S]*?bottom:\s*16px;/,
		);
		expect(stylesSource).toContain('transform-origin: center top;');
		expect(stylesSource).toContain('transform-origin: center bottom;');
	});

	it('applies the plain surface contract to actions and indexed nodes', () => {
		expect(stylesSource).toContain(
			'.vaultman-floating-toc.is-plain .vaultman-floating-toc-item',
		);
		expect(stylesSource).toContain(
			'.vaultman-floating-toc.is-plain .vaultman-floating-toc-close',
		);
		expect(stylesSource).toContain(
			'.vaultman-floating-toc.is-plain .vaultman-floating-toc-back',
		);
	});

	it('gives non-plain actions and indexed nodes the same compact surface', () => {
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-item \{[\s\S]*?background:\s*var\(--background-modifier-hover\);/,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-toggle,[\s\S]*?\{[\s\S]*?background:\s*var\(--background-modifier-hover\);/,
		);
	});
});

describe('niagara tap vs scrub intent (BT4-005 / D25)', () => {
	it('uses the locked intent thresholds instead of magic numbers', () => {
		expect(logicNiagaraSource).toContain(
			'export const NIAGARA_ENGAGE_HOLD_MS = 450',
		);
		expect(logicNiagaraSource).toContain(
			'export const NIAGARA_ENGAGE_MOVE_PX = 8',
		);
		expect(floatingTocSource).toContain('NIAGARA_ENGAGE_HOLD_MS');
		expect(floatingTocSource).toContain('NIAGARA_ENGAGE_MOVE_PX');
		expect(floatingTocSource).not.toMatch(/\}, 150\);/);
	});

	it('keeps a quick tap free of deformation and slide', () => {
		expect(floatingTocSource).toContain('if (engaged && index !== activeIdx)');
		expect(floatingTocSource).toContain('if (engaged) updateTrackShift');
	});
});

describe('perpendicular wall only — v13 canon (BT4-017 redo / D44-D45)', () => {
	it('caps the overdrive against the host room without re-adding the withdrawn pieces', () => {
		expect(floatingTocSource).toContain('niagaraPullSplit(');
		// The host must be the pages viewport, not the thin rail wrap whose
		// rect froze the displacement and capped the bell at the 40px floor.
		expect(floatingTocSource).toContain(
			"rail.closest<HTMLElement>('.vaultman-pages-viewport')",
		);
		expect(floatingTocSource).not.toContain('niagaraClampShiftToRoom');
		expect(floatingTocSource).not.toContain('monotonicSlide');
	});
});

describe('layouts carry the floating index (BT4-016 / D40)', () => {
	it('saves and restores enabled/kind/root scope through saved layouts', () => {
		expect(frameSource).toContain('function getFloatingTocState()');
		expect(frameSource).toContain('function applyFloatingTocState(');
		expect(frameSource).toContain('rootId: tocRootId');
	});
});
