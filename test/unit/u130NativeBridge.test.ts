// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { bridgeAliasForSelector, bridgeAliasesForRule } from '../../src/logic/logicNativeTreeCompat';
import {
	acquireNativeBridge,
	fingerprintPendingAliases,
	isBridgeRelevantMutation,
	NativeBridge,
	onBridgeGeometryInvalidated,
} from '../../src/services/serviceNativeBridge';

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

describe('U200 L1: no-op rebuild keeps sheets and tree geometry still', () => {
	let geometryPings = 0;
	let releaseGeometry: (() => void) | null = null;

	// jsdom shares one document across tests in this file; the bridge keeps
	// module-level geometry listeners per document, so every subscription
	// here is released explicitly.
	function listenGeometry(): void {
		releaseGeometry?.();
		geometryPings = 0;
		releaseGeometry = onBridgeGeometryInvalidated(document, () => {
			geometryPings += 1;
		});
	}

	afterEach(() => {
		releaseGeometry?.();
		releaseGeometry = null;
	});

	it('second identical rebuild touches nothing and pings no tree', () => {
		const sheet = stylesheet('.workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; }');
		const bridge = new NativeBridge(document, ['files']);
		listenGeometry();
		const first = bridge.rebuild();
		expect(first.aliasedRules).toBe(1);
		expect(first.unchanged).toBe(false);
		expect(geometryPings).toBe(1);
		expect(sheet.cssRules.length).toBe(2);
		const second = bridge.rebuild();
		expect(second.unchanged).toBe(true);
		expect(second.aliasedRules).toBe(0);
		expect(sheet.cssRules.length).toBe(2);
		expect(geometryPings).toBe(1);
		expect(typeof second.elapsedMs).toBe('number');
		bridge.clear();
	});

	it('a real selector change re-applies and pings exactly once', () => {
		stylesheet('.workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; }');
		const bridge = new NativeBridge(document, ['files']);
		listenGeometry();
		expect(bridge.rebuild().unchanged).toBe(false);
		expect(bridge.rebuild().unchanged).toBe(true);
		expect(geometryPings).toBe(1);
		stylesheet('.workspace-leaf-content[data-type="file-explorer"] .nav-file-title { color: blue; }');
		const changed = bridge.rebuild();
		expect(changed.unchanged).toBe(false);
		expect(changed.aliasedRules).toBe(2);
		expect(geometryPings).toBe(2);
		expect(bridge.rebuild().unchanged).toBe(true);
		expect(geometryPings).toBe(2);
		bridge.clear();
	});

	it('unrelated rules never break the no-op', () => {
		stylesheet('.workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; }');
		const bridge = new NativeBridge(document, ['files']);
		listenGeometry();
		bridge.rebuild();
		bridge.rebuild();
		expect(geometryPings).toBe(1);
		stylesheet('.unrelated .foo { color: green; }');
		const again = bridge.rebuild();
		expect(again.unchanged).toBe(true);
		expect(geometryPings).toBe(1);
		bridge.clear();
	});

	it('clear() forgets the applied set so the next rebuild re-applies', () => {
		const sheet = stylesheet('.workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; }');
		const bridge = new NativeBridge(document, ['files']);
		listenGeometry();
		bridge.rebuild();
		bridge.clear();
		expect(sheet.cssRules.length).toBe(1);
		const redo = bridge.rebuild();
		expect(redo.unchanged).toBe(false);
		expect(redo.aliasedRules).toBe(1);
		expect(geometryPings).toBe(2);
		bridge.clear();
	});

	it('externally removed aliases self-heal on the next rebuild', () => {
		const sheet = stylesheet('.workspace-leaf-content[data-type="file-explorer"] .tree-item-self { color: red; }');
		const bridge = new NativeBridge(document, ['files']);
		listenGeometry();
		bridge.rebuild();
		expect(bridge.rebuild().unchanged).toBe(true);
		// Simulate a same-content sheet swap: the live sheet loses the alias
		// while the scan still fingerprints identical.
		sheet.deleteRule(1);
		expect(sheet.cssRules.length).toBe(1);
		const healed = bridge.rebuild();
		expect(healed.unchanged).toBe(false);
		expect(healed.aliasedRules).toBe(1);
		expect(sheet.cssRules.length).toBe(2);
		expect(geometryPings).toBe(2);
		bridge.clear();
	});

	it('fingerprint is order-independent over the alias set', () => {
		const a = fingerprintPendingAliases([
			{ alias: '.x', declarations: 'color: red;' },
			{ alias: '.y', declarations: 'color: blue;' },
		]);
		const b = fingerprintPendingAliases([
			{ alias: '.y', declarations: 'color: blue;' },
			{ alias: '.x', declarations: 'color: red;' },
		]);
		expect(a).toBe(b);
		expect(fingerprintPendingAliases([])).not.toBe(a);
	});

	it('head prefilter ignores title swaps, keeps style/link churn', () => {
		const title = document.createElement('title');
		const text = document.createTextNode('note name');
		const style = document.createElement('style');
		const link = document.createElement('link');
		const div = document.createElement('div');
		const asRecord = (partial: object): MutationRecord =>
			partial as unknown as MutationRecord;
		// Bare title text swap: the per-focus noise that rebuilt every time.
		expect(isBridgeRelevantMutation(asRecord({
			type: 'childList', target: title, addedNodes: [text], removedNodes: [],
		}))).toBe(false);
		// Style content swap: live declarations may have changed.
		expect(isBridgeRelevantMutation(asRecord({
			type: 'childList', target: style, addedNodes: [text], removedNodes: [],
		}))).toBe(true);
		// Style/link element arrival under head.
		expect(isBridgeRelevantMutation(asRecord({
			type: 'childList', target: document.head, addedNodes: [style], removedNodes: [],
		}))).toBe(true);
		expect(isBridgeRelevantMutation(asRecord({
			type: 'childList', target: document.head, addedNodes: [], removedNodes: [link],
		}))).toBe(true);
		// Anything else under head is noise.
		expect(isBridgeRelevantMutation(asRecord({
			type: 'childList', target: document.head, addedNodes: [div], removedNodes: [],
		}))).toBe(false);
		// Non-childList records (future subscriptions) stay conservative.
		expect(isBridgeRelevantMutation(asRecord({ type: 'attributes', target: style }))).toBe(true);
	});
});
