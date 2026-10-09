// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

const stylesSource = readFileSync('styles.css', 'utf8').replace(/\r\n/g, '\n');

const activationSelector = stylesSource.match(
	/(?:^|\n)([^{}\n]*\.vaultman-tree-row--activation-order)\s*\{[\s\S]*?overflow:\s*hidden;/,
)?.[1]?.trim();

function mountActivationRow(): HTMLElement {
	const row = document.createElement('div');
	row.className = 'vaultman-tree-row vaultman-tree-row--activation-order';
	row.innerHTML = [
		'<div class="vaultman-tree-self">',
		'<span class="vaultman-tree-label vaultman-tree-flat-label">',
		'<span class="vaultman-tree-flat-parent">deep/parent</span>',
		'<span class="vaultman-tree-flat-separator">/</span>',
		'<span class="vaultman-tree-label">note.md</span>',
		'</span>',
		'<span class="vaultman-tree-count">9</span>',
		'</div>',
	].join('');
	document.body.append(row);
	return row;
}

function installStyles(): HTMLStyleElement {
	const style = document.createElement('style');
	style.textContent = stylesSource;
	document.head.append(style);
	return style;
}

afterEach(() => {
	document.head.replaceChildren();
	document.body.replaceChildren();
});

describe('activation-order tree cell layout', () => {
	it('matches the activation-order row without requiring an icon sibling', () => {
		if (!activationSelector) throw new Error('Activation-order selector is missing');
		installStyles();
		const row = mountActivationRow();

		expect(row.matches(activationSelector)).toBe(true);
	});

	it('keeps the path cell flexible while trailing cells remain fixed and clipped', () => {
		installStyles();
		const row = mountActivationRow();
		const self = row.querySelector<HTMLElement>('.vaultman-tree-self');
		const pathCell = row.querySelector<HTMLElement>('.vaultman-tree-flat-label');
		const countCell = row.querySelector<HTMLElement>('.vaultman-tree-count');
		if (!self || !pathCell || !countCell) throw new Error('Activation row fixture is incomplete');

		const pathStyle = getComputedStyle(pathCell);
		const countStyle = getComputedStyle(countCell);
		expect(getComputedStyle(row).overflow).toBe('hidden');
		expect(getComputedStyle(self).minWidth).toBe('0px');
		expect(pathStyle.flexGrow).toBe('1');
		expect(pathStyle.flexShrink).toBe('1');
		expect(pathStyle.minWidth).toBe('0px');
		expect(pathStyle.overflow).toBe('hidden');
		expect(pathStyle.textOverflow).toBe('ellipsis');
		expect(countStyle.flexShrink).toBe('0');
	});
});
