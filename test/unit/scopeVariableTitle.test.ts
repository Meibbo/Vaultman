import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const src = (rel: string): string =>
	readFileSync(
		join(fileURLToPath(new URL('../../src', import.meta.url)), rel),
		'utf8',
	);

describe('U130-08 §3.1: el titulo del submenu Scope varia de verdad', () => {
	// GUARDA NEGATIVA. El primer intento hacia `base.replace(/drill\s*$/i, ...)`
	// sobre la base 'Scope: variable', que NO acaba en "drill": la sustitucion
	// no coincidia nunca y el titulo jamas variaba. Compilaba y pasaba tests.
	// Ademas se rompio al renombrar 'Scope: drill' -> 'Select a parent', y en
	// espanol ('Variable') no habria coincidido jamas.
	it('no sustituye por regex sobre una palabra inglesa del label', () => {
		const nav = src('components/layout/navbarFilters.svelte');
		expect(nav).not.toContain('/drill\\s*$/i');
	});

	it('usa i18n parametrizada para el nombre del nodo', () => {
		const nav = src('components/layout/navbarFilters.svelte');
		expect(nav).toContain("translate('sort.level.variable_node', { name: short })");
	});

	it('la clave parametrizada existe en en.ts Y en es.ts, con el placeholder', () => {
		for (const f of ['i18n/en.ts', 'i18n/es.ts']) {
			const body = src(f);
			const line = body
				.split('\n')
				.find((l) => l.includes("'sort.level.variable_node'"));
			expect(line, `${f} sin la clave`).toBeTruthy();
			expect(line, `${f} sin {name}`).toContain('{name}');
		}
	});

	it('la opcion de drill es estatica: la variabilidad es del submenu', () => {
		const nav = src('components/layout/navbarFilters.svelte');
		expect(nav).not.toContain('drillScopeTitle');
	});
});
