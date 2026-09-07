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
		// Las reglas de reveal exigen hide: el servicio solo revela superficies
		// ocultas y el CSS no debe tocar superficies expandidas/abiertas.
		if (!r.selector.includes('mb-hide-sidebars')) continue;
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
		if (!r.selector.includes('mb-hide-sidebars')) continue;
		const revealTokens = [':hover', '.mb-sidebar-hovered', '.mb-sidebar-pinned'];
		if (revealTokens.some((t) => r.selector.includes(t))) continue;
		matches.push(r.selector);
	}
	if (matches.length === 0) {
		return { ok: false, reason: 'no hide rule references mod-right-split' };
	}
	return { ok: true, rules: matches };
}

/** True if any non-locked rule declares a hit-zone pseudo-element for the
 *  given sidebar side. The hit-zone is an ::after (LEFT) or ::before (RIGHT)
 *  attached to `.workspace-split.mod-…-split.is-sidedock-collapsed`. Rules
 *  under `body.mb-hover-locked` are excluded because they satisfy the guard
 *  by their own negation (they suppress the surface, not enable it). */
function sideHasHitZone(side: 'left' | 'right'): { ok: true; rules: string[] } | { ok: false; reason: string } {
	const sidebarClass = side === 'left' ? 'mod-left-split' : 'mod-right-split';
	const pseudo = side === 'left' ? '::after' : '::before';
	const matches: string[] = [];
	for (const r of rules) {
		if (!r.selector.includes(sidebarClass)) continue;
		if (!r.selector.includes(pseudo)) continue;
		if (r.selector.includes('mb-hover-locked')) continue;
		// Las hit-zones exigen hide: sin la accion de ocultar no hay zona.
		if (!r.selector.includes('mb-hide-sidebars')) continue;
		// Las reglas que DESACTIVAN la zona (con :hover / .mb-sidebar-hovered /
		// .mb-sidebar-pinned) tambien llevan el pseudo-elemento, asi que
		// satisfacen esta guarda sin que exista la zona. Comprobado: borrando la
		// definicion de la zona derecha, el test seguia en verde. Es el mismo
		// fallo que el del bloque `mb-hover-locked`, un nivel mas abajo.
		const desactivadores = [':hover', '.mb-sidebar-hovered', '.mb-sidebar-pinned'];
		if (desactivadores.some((d) => r.selector.includes(d))) continue;
		// Y la regla que DEFINE la zona es la que le da anchura: sin `width` no
		// hay superficie que pueda recibir el puntero.
		if (!/\bwidth\s*:/.test(r.body)) continue;
		matches.push(r.selector);
	}
	if (matches.length === 0) {
		return {
			ok: false,
			reason: `no hit-zone pseudo (${pseudo}) for ${sidebarClass} outside mb-hover-locked`,
		};
	}
	return { ok: true, rules: matches };
}

/** True if any rule declares a hit-zone DISABLE on the given sidebar side.
 *  The disable is signalled by the selector containing the sidebar class AND
 *  one of the expanded/pinned/hover tokens AND a hit-zone pseudo, with a body
 *  that sets `pointer-events: none` (or `display: none`). Rules under
 *  `mb-hover-locked` are excluded so the lock block cannot satisfy the
 *  guard by its own negation. */
function sideHasHitZoneDisable(side: 'left' | 'right'): { ok: true; rules: string[] } | { ok: false; reason: string } {
	const sidebarClass = side === 'left' ? 'mod-left-split' : 'mod-right-split';
	const pseudo = side === 'left' ? '::after' : '::before';
	const expandedTokens = [':hover', '.mb-sidebar-hovered', '.mb-sidebar-pinned'];
	const matches: string[] = [];
	for (const r of rules) {
		if (!r.selector.includes(sidebarClass)) continue;
		if (!r.selector.includes(pseudo)) continue;
		if (r.selector.includes('mb-hover-locked')) continue;
		if (!r.selector.includes('mb-hide-sidebars')) continue;
		if (!expandedTokens.some((t) => r.selector.includes(t))) continue;
		const body = r.body;
		if (!/pointer-events\s*:\s*none|display\s*:\s*none/i.test(body)) continue;
		matches.push(r.selector);
	}
	if (matches.length === 0) {
		return {
			ok: false,
			reason: `no disable rule for the ${pseudo} hit-zone on ${sidebarClass} when expanded/pinned/hovered`,
		};
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

describe('hover-surfaces SCSS — hit-zones para el servicio', () => {
	it('declara un hit-zone (::after) para la sidebar izquierda colapsada', () => {
		const hit = sideHasHitZone('left');
		expect(hit.ok, JSON.stringify(hit)).toBe(true);
	});

	it('declara un hit-zone (::before) para la sidebar derecha colapsada', () => {
		const hit = sideHasHitZone('right');
		expect(hit.ok, JSON.stringify(hit)).toBe(true);
	});

	it('desactiva el hit-zone izquierdo cuando la sidebar esta expandida, pinned o bajo :hover', () => {
		const disable = sideHasHitZoneDisable('left');
		expect(disable.ok, JSON.stringify(disable)).toBe(true);
	});

	it('desactiva el hit-zone derecho cuando la sidebar esta expandida, pinned o bajo :hover', () => {
		const disable = sideHasHitZoneDisable('right');
		expect(disable.ok, JSON.stringify(disable)).toBe(true);
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

	it('declara las clases de hide por superficie en body', () => {
		for (const cls of [
			'body.mb-hide-sidebars',
			'body.mb-hide-ribbons',
			'body.mb-hide-tabbar',
			'body.mb-hide-statusbar',
		]) {
			expect(cleaned.includes(cls), `clase ausente: ${cls}`).toBe(true);
		}
	});

	it('declara la clase de nested-ribbon en body', () => {
		expect(cleaned.includes('body.mb-hide-ribbons.mb-nested-hover-ribbon')).toBe(true);
	});

	it('NINGUNA regla de ocultamiento toca superficies expandidas/abiertas: hide/reveal exigen estado colapsado o clase mb-hide-*', () => {
		// Orden del dev: con todos los paneles abiertos no pasa nada extrano.
		// Cada regla que oculta o transforma una superficie debe exigir el
		// estado colapsado nativo (.is-sidedock-collapsed) o la clase de hide
		// que solo pone la accion explicita. Una regla sobre
		// `.workspace-split` / `.workspace-ribbon` / `.status-bar` /
		// `.workspace-tab-header-container` SIN ninguno de esos dos tokens
		// tocaria superficies abiertas: highlight odioso, border-line, etc.
		const offenders: string[] = [];
		for (const r of rules) {
			const sel = r.selector;
			const mentionsSurface =
				sel.includes('.workspace-split') ||
				sel.includes('.workspace-ribbon') ||
				sel.includes('.status-bar') ||
				sel.includes('.workspace-tab-header-container') ||
				sel.includes('.view-header');
			if (!mentionsSurface) continue;
			if (sel.includes('mb-hover-locked')) continue;
			const gated =
				sel.includes('.is-sidedock-collapsed') ||
				sel.includes('.is-collapsed') ||
				sel.includes('mb-hide-sidebars') ||
				sel.includes('mb-hide-ribbons') ||
				sel.includes('mb-hide-tabbar') ||
				sel.includes('mb-hide-statusbar') ||
				sel.includes('mb-nested-hover-ribbon') ||
				sel.includes('.mb-ribbon-hovered') ||
				sel.includes('.mb-sidebar-hovered') ||
				sel.includes('.mb-sidebar-pinned') ||
				sel.includes('.mb-tabbar-hovered') ||
				sel.includes('.mb-statusbar-hovered');
			if (!gated) offenders.push(sel);
		}
		expect(offenders).toEqual([]);
	});
});