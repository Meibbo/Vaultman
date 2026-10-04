// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { compile } from 'sass';
import { isEditableKeyboardTarget } from '../../src/logic/logicTreeKeyboard';

afterEach(() => { document.head.replaceChildren(); document.body.replaceChildren(); });

it('leaves focused cell buttons to their native keyboard action', () => {
	const row = document.createElement('div');
	row.setAttribute('role', 'button');
	const button = document.createElement('button');
	row.append(button);
	expect(isEditableKeyboardTarget(button, row)).toBe(true);
	expect(isEditableKeyboardTarget(row, row)).toBe(false);
});

it('keeps native container paint while excluding its intrinsic content from viewport sizing', () => {
	const style = document.createElement('style');
	style.textContent = '.nav-files-container { min-height: auto; background-color: rgb(1, 2, 3); }'
		+ compile('src/styles/residual/_virtual-scroll-compat.scss').css
		+ compile('src/styles/views/_tree.scss').css;
	document.head.append(style);
	const root = document.createElement('div');
	root.className = 'workspace-leaf-content';
	root.dataset.type = 'vaultman-frame';
	root.innerHTML = '<div class="vaultman-tree-virtual-viewport nav-files-container vaultman-native-tree-compat"><div style="height:500000px"></div></div>';
	document.body.append(root);
	const viewport = root.firstElementChild;
	if (!viewport) throw new Error('Missing test viewport');
	const computed = getComputedStyle(viewport);
	expect(computed.minHeight).toBe('0px');
	expect(computed.contain).toBe('size paint');
	expect(computed.flexBasis).toBe('0px');
	expect(computed.backgroundColor).toBe('rgb(1, 2, 3)');
});

it('qualifies the compatible slot reset above legacy host indentation and hover rules', () => {
	const css = compile('src/styles/views/_tree.scss').css;
	const reset = css.match(/([^{}]+)\{\s*padding-block: 0;\s*padding-inline-start: calc\(var\(--depth, 0\)/)?.[1];
	expect(reset).toMatch(/\.workspace-leaf-content\[data-type="?vaultman-frame"?\]/);
	expect(reset).toMatch(/\.workspace-leaf-content\[data-type="?vaultman-view"?\]/);
});

it('retains the opaque sticky base when resetting compatible slot decoration', () => {
	const css = compile('src/styles/views/_tree.scss').css;
	const reset = css.match(/[^{}]+\{\s*padding-block: 0;\s*padding-inline-start: calc\(var\(--depth, 0\)[^}]+\}/)?.[0];
	expect(reset).toContain('background-color: var(--vaultman-row-bg-base, transparent)');
});
