import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCSS_PATH = fileURLToPath(
	new URL('../../src/styles/views/_tree.scss', import.meta.url),
);
const SRC = readFileSync(SCSS_PATH, 'utf8');

function stripComments(input: string): string {
	return input
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');
}

interface Rule {
	selector: string;
	body: string;
}

function parseRules(body: string): Rule[] {
	const rules: Rule[] = [];
	let i = 0;
	const n = body.length;
	while (i < n) {
		while (i < n && /\s/.test(body[i])) i++;
		if (i >= n) break;
		const open = body.indexOf('{', i);
		if (open < 0) break;
		const selector = body.slice(i, open).trim();
		let d = 0;
		let j = open;
		for (; j < n; j++) {
			if (body[j] === '{') d++;
			else if (body[j] === '}') {
				d--;
				if (d === 0) {
					j++;
					break;
				}
			}
		}
		rules.push({ selector, body: body.slice(open + 1, j - 1) });
		i = j;
	}
	return rules;
}

const cleaned = stripComments(SRC);
const rules = parseRules(cleaned);

describe('tree keyboard focus ring — inset shadow (u200-L3 S1)', () => {
	it('declara box-shadow con inset para el foco en locked mode', () => {
		const lockedRules = rules.filter((r) =>
			r.selector.includes('.vaultman-native-tree-locked .vaultman-tree-row.has-focus'),
		);
		expect(lockedRules.length > 0, 'sin regla para row.has-focus en locked').toBe(true);
		const shadowRule = lockedRules.find((r) => r.body.includes('box-shadow'));
		expect(shadowRule, 'sin box-shadow en locked').toBeDefined();
		expect(shadowRule?.body).toContain('inset 0 0 0 2px var(--background-modifier-border-focus)');
	});

	it('mantiene el gate de hoja activa y no-phone', () => {
		const lockedRules = rules.filter((r) =>
			r.selector.includes('.vaultman-native-tree-locked .vaultman-tree-row.has-focus'),
		);
		for (const r of lockedRules) {
			expect(r.selector).toContain('mod-active');
			expect(r.selector).toContain('body:not(.is-phone)');
		}
	});

	it('preserva el anillo de foco en compatible mode', () => {
		const compatRules = rules.filter((r) =>
			r.selector.includes('.vaultman-native-tree-compat .vaultman-tree-self.has-focus'),
		);
		expect(compatRules.length > 0).toBe(true);
		expect(compatRules[0].body).toContain('box-shadow: 0 0 0 2px var(--background-modifier-border-focus)');
	});
});
