// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { syncNativeTreeIndentation } from '../../src/logic/logicNativeTreeGeometry';
import { virtualAliasesForRule } from '../../src/logic/logicNativeVirtualSelectors';

afterEach(() => { document.head.replaceChildren(); document.body.replaceChildren(); });

it('uses native full-width self padding and ancestry pitch without moving the slot', () => {
	const style = document.createElement('style');
	style.textContent = '.nav-folder-title { padding-inline-start: 24px; } .tree-item-children { margin-inline-start: 12px; padding-inline-start: 4px; border-inline-start-width: 1px; border-inline-start-style: solid; }';
	document.head.append(style);
	document.body.innerHTML = '<div class="nav-files-container"><div><div class="nav-folder"><div class="nav-folder-title"></div><div class="tree-item-children"></div></div></div></div><div id="vm"></div>';
	const vm = document.getElementById('vm');
	if (!vm) throw new Error('Missing fixture');
	syncNativeTreeIndentation(vm, true);
	expect(vm.style.getPropertyValue('--vaultman-tree-indent-unit')).toBe('17px');
	expect(vm.style.getPropertyValue('--vaultman-tree-guide-start')).toBe('12px');
	expect(vm.style.getPropertyValue('--vaultman-native-self-padding-start')).toBe('24px');
	syncNativeTreeIndentation(vm, false);
	expect(vm.style.getPropertyValue('--vaultman-tree-indent-unit')).toBe('');
});

it('matches a sticky copy by logical root tokens, not its first-child DOM position', () => {
	document.body.innerHTML = '<div class="nav-files-container vaultman-native-tree-compat" data-vaultman-native-scene="files"><div class="vaultman-tree-sticky-layer"><div class="tree-item nav-folder" data-vaultman-native-root="true" data-vaultman-native-root-nth="10n+6"></div></div></div>';
	const matching = virtualAliasesForRule('.nav-files-container > div > .nav-folder:nth-child(10n+6)', 'files', true);
	const other = virtualAliasesForRule('.nav-files-container > div > .nav-folder:nth-child(10n+1)', 'files', true);
	if (!matching || !other) throw new Error('Missing alias');
	expect(document.querySelectorAll(matching)).toHaveLength(1);
	expect(document.querySelectorAll(other)).toHaveLength(0);
});

it('keeps geometry available while the native folder children are detached', () => {
	document.body.innerHTML = '<div class="nav-files-container"><div><div class="nav-folder"><div class="nav-folder-title" style="padding-inline-start:24px;--nav-item-children-margin-start:12px;--nav-item-children-padding-start:4px;--nav-indentation-guide-width:1px"></div></div></div></div><div id="vm"></div>';
	const vm = document.getElementById('vm'); if (!vm) throw new Error('Missing fixture');
	syncNativeTreeIndentation(vm, true);
	expect(vm.style.getPropertyValue('--vaultman-tree-indent-unit')).toBe('17px');
	expect(vm.style.getPropertyValue('--vaultman-native-self-padding-start')).toBe('24px');
});
