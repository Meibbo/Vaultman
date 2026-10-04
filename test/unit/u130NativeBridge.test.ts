// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { bridgeAliasForSelector, bridgeAliasesForRule } from '../../src/logic/logicNativeTreeCompat';
import { acquireNativeBridge, NativeBridge } from '../../src/services/serviceNativeBridge';

afterEach(() => {
	document.head.replaceChildren(); document.body.replaceChildren();
	Reflect.deleteProperty(document, 'styleSheets');
});

function stylesheet(css: string): CSSStyleSheet {
	const style = document.createElement('style');
	style.textContent = css;
	document.head.append(style);
	if (!style.sheet) throw new Error('Test stylesheet did not mount');
	return style.sheet;
}

describe('U130 native polish: host-selector bridge', () => {
	it('counts inaccessible sheets and still aliases readable sheets', () => {
		const good = stylesheet('.workspace-leaf-content[data-type="file-explorer"] .nav-file-title { color: red; }');
		const blocked = new Proxy(good, {
			get(target, key) {
				if (key === 'cssRules') throw new DOMException('Cross-origin stylesheet', 'SecurityError');
				return Reflect.get(target, key, target);
			},
		});
		Object.defineProperty(document, 'styleSheets', { configurable: true, value: [blocked, good] });
		const bridge = new NativeBridge(document, ['files']);
		const report = bridge.rebuild();
		expect(report.skippedSheets).toBe(1);
		expect(report.aliasedRules).toBe(1);
		bridge.clear();
	});
	it('retains native ancestry and prefixes without changing actual view identity', () => {
		const alias = bridgeAliasForSelector(
			'body.is-focused .workspace-leaf-content[data-type="file-explorer"] .nav-files-container > div .tree-item-self.is-active::before', 'files',
		);
		expect(alias?.aliasSelector).toContain('body.is-focused');
		expect(alias?.aliasSelector).toContain('.nav-files-container > div .tree-item-self.is-active');
		expect(alias?.aliasSelector).toContain('[data-vaultman-native-type="file-explorer"]');
		expect(alias?.aliasSelector).not.toContain('[data-type="vaultman-frame"]');
		expect(alias?.aliasSelector).toContain(':where(');
		expect(alias?.aliasSelector).toMatch(/::before$/);
	});

	it('aliases list members only for their actual homologous scene', () => {
		const alias = bridgeAliasesForRule('.workspace-leaf-content[data-type="file-explorer"] .a, .unrelated .b', 'files');
		expect(alias).toContain('.a');
		expect(alias).not.toContain('.unrelated');
		expect(bridgeAliasesForRule('.workspace-leaf-content[data-type="x"] .a', 'files')).toBe(null);
		expect(bridgeAliasesForRule('.workspace-leaf-content[data-type="file-explorer"] .a', 'snippets')).toBe(null);
	});

	it('inserts adjacent aliases within the original media condition and cleans them up', () => {
		const original = '@media (min-width: 1px) { .workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; } } .unrelated { color: blue; }';
		const sheet = stylesheet(original);
		const group = sheet.cssRules[0];
		if (!group || !('cssRules' in group)) throw new Error('Test media group missing');
		const bridge = new NativeBridge(document, ['files']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		expect(group.cssText).toContain('data-vaultman-native-type');
		expect(sheet.cssRules.length).toBe(2);
		bridge.clear();
		expect(group.cssText).not.toContain('data-vaultman-native-type');
		expect(sheet.cssRules[1]?.cssText).toContain('color: blue');
	});

	it('bridges both Settings scenes rather than stopping after the first scene', () => {
		const sheet = stylesheet('.modal.mod-settings .setting-item-name { color: red; }');
		const bridge = new NativeBridge(document, ['snippets', 'plugins']);
		expect(bridge.rebuild().aliasedRules).toBe(1);
		expect(sheet.cssRules[1]?.cssText).toContain('data-vaultman-native-scene="snippets"');
		expect(sheet.cssRules[1]?.cssText).toContain('data-vaultman-native-scene="plugins"');
		bridge.clear();
	});

	it('shares document aliases until the last frame releases its ownership', () => {
		const sheet = stylesheet('.workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; }');
		let watchers = 0;
		const watch = () => { watchers += 1; return () => { watchers -= 1; }; };
		const releaseFirst = acquireNativeBridge(document, watch);
		const releaseSecond = acquireNativeBridge(document, watch);
		expect(sheet.cssRules.length).toBe(2);
		expect(watchers).toBe(1);
		releaseFirst();
		expect(sheet.cssRules.length).toBe(2);
		releaseSecond();
		expect(sheet.cssRules.length).toBe(1);
		expect(watchers).toBe(0);
	});

	it('matches only the compatible boundary and explicitly owning scene', () => {
		const host = document.createElement('div');
		host.className = 'workspace-leaf-content';
		host.dataset.type = 'vaultman-frame';
		host.dataset.vaultmanNativeType = 'file-explorer';
		host.innerHTML = '<div data-vaultman-native-scene="files" class="vaultman-native-tree-compat"><span class="nav-file-title"></span></div><div data-vaultman-native-scene="files" class="vaultman-native-tree-locked"><span class="nav-file-title"></span></div>';
		document.body.append(host);
		const selector = bridgeAliasesForRule('.workspace-leaf-content[data-type="file-explorer"] .nav-file-title', 'files');
		if (!selector) throw new Error('Expected Files alias');
		expect(document.querySelectorAll(selector).length).toBe(1);
		expect(host.dataset.type).toBe('vaultman-frame');
	});
});
