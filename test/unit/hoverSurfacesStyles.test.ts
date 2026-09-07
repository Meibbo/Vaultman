import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCSS_PATH = fileURLToPath(
	new URL('../../src/styles/components/_hover-surfaces.scss', import.meta.url),
);
const SRC = readFileSync(SCSS_PATH, 'utf8');

/**
 * Strip SCSS comments so a regex over selectors cannot be satisfied by a
 * string that merely mentions the symbol in an explanatory comment.
 * Removes both block comments and line comments, returning the SCSS body
 * as one continuous string with comments removed.
 */
function stripComments(input: string): string {
	return input
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Split the SCSS body into top-level rules. SCSS nesting uses `{` … `}`; we
 * split on rule boundaries by tracking brace depth so a nested media query or
 * nested selector does not leak into a sibling rule.
 */
interface Rule {
	selector: string;
	body: string;
}

function parseRules(body: string): Rule[] {
	const rules: Rule[] = [];
	let i = 0;
	const n = body.length;
	while (i < n) {
		// skip whitespace
		while (i < n && /\s/.test(body[i])) i++;
		if (i >= n) break;
		// find the next '{' that opens a rule block
		const open = body.indexOf('{', i);
		if (open < 0) break;
		const selector = body.slice(i, open).trim();
		// walk braces to find the matching '}'
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

/** True if any rule selector mentions mod-right-split and the selector
 *  contains :hover or .mb-sidebar-hovered or .mb-sidebar-pinned. */
function rightHasRevealRule(): { ok: true; rules: string[] } | { ok: false; reason: string } {
	const matches: string[] = [];
	for (const r of rules) {
		if (!r.selector.includes('mod-right-split')) continue;
		// El bloque del LOCK tambien menciona mod-right-split junto a :hover,
		// pero hace lo CONTRARIO: suprime el revelado. Si cuenta como regla de
		// revelado, esta guarda queda satisfecha por su propia negacion y deja
		// pasar la asimetria que existe para detectar. Comprobado: quitando la
		// regla de retorno del lado derecho, el test seguia en verde.
		if (r.selector.includes('mb-hover-locked')) continue;
		const tokens = [':hover', '.mb-sidebar-hovered', '.mb-sidebar-pinned'];
		if (tokens.some((t) => r.selector.includes(t))) {
			matches.push(r.selector);
		}
	}
	if (matches.length === 0) {
		return { ok: false, reason: 'no reveal rule references mod-right-split' };
	}
	return { ok: true, rules: matches };
}

/** True if any rule selector mentions mod-right-split and the selector
 *  contains neither :hover nor .mb-sidebar-hovered nor .mb-sidebar-pinned
 *  (a hide / default transform rule). */
function rightHasHideRule(): { ok: true; rules: string[] } | { ok: false; reason: string } {
	const matches: string[] = [];
	for (const r of rules) {
		if (!r.selector.includes('mod-right-split')) continue;
		const revealTokens = [':hover', '.mb-sidebar-hovered', '.mb-sidebar-pinned'];
		if (revealTokens.some((t) => r.selector.includes(t))) continue;
		matches.push(r.selector);
	}
	if (matches.length === 0) {
		return { ok: false, reason: 'no hide rule references mod-right-split' };
	}
	return { ok: true, rules: matches };
}

describe('hover-surfaces SCSS — guarda negativa', () => {
	it('el SCSS NO contiene la cadena `minimal-` (no dependemos de temas de terceros)', () => {
		expect(cleaned.includes('minimal-')).toBe(false);
	});

	it('el SCSS NO usa `!important` (especificidad, no fuerza bruta)', () => {
		// Strip comments first so an explanatory note cannot satisfy the check.
		expect(cleaned.includes('!important')).toBe(false);
	});

	it('el lado derecho tiene su regla de retorno (defecto 1 del original)', () => {
		const reveal = rightHasRevealRule();
		expect(reveal.ok, JSON.stringify(reveal)).toBe(true);
	});

	it('el lado derecho tiene una regla base (no solo :hover / .mb-sidebar-hovered / .mb-sidebar-pinned)', () => {
		const hide = rightHasHideRule();
		expect(hide.ok, JSON.stringify(hide)).toBe(true);
	});
});

describe('hover-surfaces SCSS — cubre las cuatro superficies del servicio', () => {
	it('declara reglas para mb-sidebar-hovered y mb-sidebar-pinned', () => {
		expect(cleaned).toMatch(/\.mb-sidebar-hovered/);
		expect(cleaned).toMatch(/\.mb-sidebar-pinned/);
	});

	it('declara reglas para mb-ribbon-hovered', () => {
		expect(cleaned).toMatch(/\.mb-ribbon-hovered/);
	});

	it('declara reglas para mb-tabbar-hovered', () => {
		expect(cleaned).toMatch(/\.mb-tabbar-hovered/);
	});

	it('declara reglas para mb-statusbar-hovered', () => {
		expect(cleaned).toMatch(/\.mb-statusbar-hovered/);
	});

	it('declara la anulación global body.mb-hover-locked', () => {
		expect(cleaned).toMatch(/body\.mb-hover-locked/);
	});

	it('cubre los selectores de superficie que el servicio usa', () => {
		const expected = [
			'.workspace-split.mod-left-split',
			'.workspace-split.mod-right-split',
			'.workspace-ribbon.mod-left',
			'.workspace-ribbon.mod-right',
			'.workspace-tab-header-container',
			'.view-header',
			'.status-bar',
		];
		for (const sel of expected) {
			expect(cleaned.includes(sel), `selector ausente: ${sel}`).toBe(true);
		}
	});
});