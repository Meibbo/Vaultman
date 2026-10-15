// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
	clearNativeVirtualState,
	extractNativeRootNthExpressions,
	getNativeRootNthExpressions,
	getNativeRootNthTokens,
	normalizeNativeNthExpression,
	setNativeRootNthExpressions,
	virtualAliasesForRule,
} from '../../src/logic/logicNativeVirtualSelectors';
import { acquireNativeBridge, NativeBridge, rebuildNativeBridge } from '../../src/services/serviceNativeBridge';

afterEach(() => {
	document.head.replaceChildren(); document.body.replaceChildren();
	Reflect.deleteProperty(document, 'styleSheets');
	clearNativeVirtualState(document);
});

function stylesheet(css: string): CSSStyleSheet {
	const style = document.createElement('style');
	style.textContent = css;
	document.head.append(style);
	if (!style.sheet) throw new Error('Test stylesheet did not mount');
	return style.sheet;
}

/** Split a selector list only at depth-zero commas (gates contain commas). */
function splitSelectorList(text: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let start = 0;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (char === '(') depth += 1;
		else if (char === ')') depth -= 1;
		else if (char === ',' && depth === 0) {
			out.push(text.slice(start, index).trim());
			start = index + 1;
		}
	}
	out.push(text.slice(start).trim());
	return out.filter(Boolean);
}

/** Flat virtual tree mirroring the mounted row anatomy (no theme keys). */
function mountVirtualTree(locked = false): void {
	const container = document.createElement('div');
	container.className = `nav-files-container vaultman-native-tree-${locked ? 'locked' : 'compat'}`;
	container.dataset.vaultmanNativeScene = 'files';
	container.innerHTML = '<div class="vaultman-tree-virtual-spacer"><div class="vaultman-tree-virtual-content">'
		+ '<div class="tree-item nav-folder" data-vaultman-native-root="true" data-vaultman-native-root-nth="10n+1">'
		+ '<div class="tree-item-self nav-folder-title"><span class="tree-item-inner nav-folder-title-content">Root</span></div></div>'
		+ '<div class="tree-item nav-file" data-vaultman-native-root-nth="10n+1">'
		+ '<div class="tree-item-self nav-file-title"></div></div>'
		+ '<div class="tree-item nav-folder" data-vaultman-native-root-nth="10n+1">'
		+ '<div class="tree-item-self nav-folder-title"></div></div>'
		+ '</div></div>';
	document.body.append(container);
}

describe('U130 virtual bridge: nth normalization', () => {
	it('normalizes integers, an+b, odd/even and rejects the rest', () => {
		expect(normalizeNativeNthExpression('10n+1')).toBe('10n+1');
		expect(normalizeNativeNthExpression('  2N + 1 ')).toBe('2n+1');
		expect(normalizeNativeNthExpression('ODD')).toBe('odd');
		expect(normalizeNativeNthExpression('Even')).toBe('even');
		expect(normalizeNativeNthExpression('5')).toBe('5');
		expect(normalizeNativeNthExpression('-n+3')).toBe('-n+3');
		expect(normalizeNativeNthExpression('n')).toBe('n');
		expect(normalizeNativeNthExpression('')).toBe(null);
		expect(normalizeNativeNthExpression('banana')).toBe(null);
		expect(normalizeNativeNthExpression('2n of .nav-folder')).toBe(null);
		expect(normalizeNativeNthExpression('n+')).toBe(null);
	});
});

describe('U130 virtual bridge: logical root tokens', () => {
	it('matches 1-based ordinals against stored formulas only', () => {
		setNativeRootNthExpressions(document, ['10n+1', 'odd', '3']);
		expect(getNativeRootNthTokens(document, 1).split(' ').sort()).toEqual(['10n+1', 'odd'].sort());
		expect(getNativeRootNthTokens(document, 11).split(' ').sort()).toEqual(['10n+1', 'odd'].sort());
		expect(getNativeRootNthTokens(document, 3).split(' ').sort()).toEqual(['3', 'odd'].sort());
		expect(getNativeRootNthTokens(document, 2)).toBe('');
		expect(getNativeRootNthTokens(document, 0)).toBe('');
		expect(getNativeRootNthTokens(document, -1)).toBe('');
		expect(getNativeRootNthTokens(document, 1.5)).toBe('');
		expect([...getNativeRootNthExpressions(document)].sort()).toEqual(['10n+1', '3', 'odd'].sort());
		clearNativeVirtualState(document);
		expect(getNativeRootNthTokens(document, 1)).toBe('');
		expect(getNativeRootNthExpressions(document)).toEqual([]);
	});
});

describe('U130 virtual bridge: root nth custom-property rules', () => {
	const RULE = '.nav-files-container > div > .nav-folder:nth-child(10n+1) { --folder-color: red; }';

	it('emits root-only plus descendant-slot aliases with preserved specificity shape', () => {
		const alias = virtualAliasesForRule(RULE.split('{')[0] ?? '', 'files', true);
		if (!alias) throw new Error('Expected virtual aliases');
		const [rootAlias, slotAlias] = splitSelectorList(alias);
		expect(rootAlias).toContain('.nav-files-container > div > :where(.vaultman-tree-virtual-content) > ');
		expect(rootAlias).toContain(':where(.tree-item).nav-folder[data-vaultman-native-root-nth~="10n+1"]');
		expect(rootAlias).toContain(':where([data-vaultman-native-root="true"])');
		expect(rootAlias).not.toContain('.tree-item.nav-folder');
		expect(slotAlias).toContain('> .tree-item[data-vaultman-native-root-nth~="10n+1"]');
		expect(slotAlias).toContain(':where(');
	});

	it('rebuild inserts adjacent aliases that reach roots and descendants, off when locked', () => {
		const sheet = stylesheet(RULE);
		const bridge = new NativeBridge(document, ['files']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		expect(sheet.cssRules.length).toBe(2);
		expect(getNativeRootNthExpressions(document)).toEqual(['10n+1']);
		expect(getNativeRootNthTokens(document, 1)).toBe('10n+1');
		expect(getNativeRootNthTokens(document, 2)).toBe('');

		mountVirtualTree();
		const inserted = sheet.cssRules[1] as CSSStyleRule;
		const [rootAlias, slotAlias] = splitSelectorList(inserted.selectorText);
		if (!rootAlias || !slotAlias) throw new Error('Expected two inserted aliases');
		expect(document.querySelectorAll(rootAlias).length).toBe(1);
		expect(document.querySelectorAll(slotAlias).length).toBe(3);

		document.body.replaceChildren();
		mountVirtualTree(true);
		expect(document.querySelectorAll(rootAlias).length).toBe(0);
		expect(document.querySelectorAll(slotAlias).length).toBe(0);
		bridge.clear();
		expect(sheet.cssRules.length).toBe(1);
		expect(getNativeRootNthExpressions(document)).toEqual([]);
	});

	it('never copies non-custom declarations to descendant slots', () => {
		const sheet = stylesheet(
			'.nav-files-container > div > .nav-folder:nth-child(10n+1) { --folder-color: red; color: red; }',
		);
		const bridge = new NativeBridge(document, ['files']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		const inserted = sheet.cssRules[1] as CSSStyleRule;
		expect(splitSelectorList(inserted.selectorText).length).toBe(2);
		mountVirtualTree();
		expect(document.querySelectorAll(inserted.selectorText).length).toBe(1);
		bridge.clear();
	});
});

describe('U130 virtual bridge: descendant title rules', () => {
	it('reaches every folder row title without ordinal tokens', () => {
		const sheet = stylesheet(
			'.nav-files-container > div > .nav-folder .nav-folder-title { color: red; --nav-item-color-hover: blue; }',
		);
		const bridge = new NativeBridge(document, ['files']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		const inserted = sheet.cssRules[1] as CSSStyleRule;
		expect(inserted.selectorText).toContain(':where(.tree-item).nav-folder :where(.tree-item-self).nav-folder-title');
		expect(inserted.selectorText).not.toContain('data-vaultman-native-root');
		expect(splitSelectorList(inserted.selectorText).length).toBe(2);
		mountVirtualTree();
		// Both folder rows own a title; the file row never matches a folder-title rule.
		expect(document.querySelectorAll(inserted.selectorText).length).toBe(2);
		bridge.clear();
	});
});

describe('U130 virtual bridge: conditions and rebuild hygiene', () => {
	it('keeps aliases inside the original media condition', () => {
		const sheet = stylesheet(
			'@media (min-width: 1px) { .nav-files-container > div > .nav-folder:nth-child(10n+1) { --folder-color: red; } }',
		);
		const group = sheet.cssRules[0];
		if (!group || !('cssRules' in group)) throw new Error('Test media group missing');
		const bridge = new NativeBridge(document, ['files']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		expect(group.cssText).toContain('data-vaultman-native-root-nth');
		expect(sheet.cssRules.length).toBe(1);
		bridge.clear();
	});

	it('skips already-inserted aliases across one-shot rebuilds and clears state on release', () => {
		const sheet = stylesheet('.nav-files-container > div > .nav-folder:nth-child(2n+1) { --folder-color: red; }');
		expect(rebuildNativeBridge(document, ['files']).aliasedRules).toBe(1);
		// A fresh one-shot bridge cannot clear another instance's work, but it
		// re-alias the original — never the previous alias (still 1, not 2).
		expect(rebuildNativeBridge(document, ['files']).aliasedRules).toBe(1);
		expect(sheet.cssRules.length).toBe(3);
		expect(getNativeRootNthTokens(document, 3)).toBe('2n+1');

		// The shared bridge path no-ops when the scan is unchanged: no
		// clear()+reinsert churn, stable rule count, no geometry ping
		// (U200 L1 — the old re-apply flashed every compatible tree).
		document.head.replaceChildren();
		const owned = stylesheet('.nav-files-container > div > .nav-folder:nth-child(2n+1) { --folder-color: red; }');
		const bridge = new NativeBridge(document, ['files']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		const noop = bridge.rebuild();
		expect(noop.aliasedRules).toBe(0);
		expect(noop.unchanged).toBe(true);
		expect(owned.cssRules.length).toBe(2);
		bridge.clear();

		const release = acquireNativeBridge(document, () => () => undefined);
		expect(getNativeRootNthTokens(document, 3)).toBe('2n+1');
		release();
		expect(getNativeRootNthTokens(document, 3)).toBe('');
		expect(owned.cssRules.length).toBe(1);
	});
});

describe('U130 virtual bridge: explicit limitations', () => {
	it('declines unsupported shapes and non-files scenes', () => {
		expect(virtualAliasesForRule('.nav-files-container > div > .nav-folder:nth-child(2n of .x) { }', 'files', true)).toBe(null);
		expect(virtualAliasesForRule('.nav-files-container > div > .nav-folder:hover { }', 'files', true)).toBe(null);
		expect(virtualAliasesForRule('.nav-files-container > div > .nav-folder > .nav-folder-title { }', 'files', true)).toBe(null);
		expect(virtualAliasesForRule('.nav-files-container > div > .nav-folder:nth-child(2n+1) { }', 'tags', true)).toBe(null);
		expect(extractNativeRootNthExpressions('.nav-files-container > div > .nav-folder:nth-child(2n+1), .other')).toEqual(['2n+1']);
	});
});
