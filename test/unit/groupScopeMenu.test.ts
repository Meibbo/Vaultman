import { describe, expect, it } from 'vitest';
import { parse } from 'svelte/compiler';
import { sortScopeOptions, supportsByLevel } from '../../src/logic/logicSortMenu';
import { scopesForTab } from '../../src/logic/logicScopedSort';
import type { ExplorerTabId } from '../../src/types/typeUI';
import popupSortSource from '../../src/components/layout/popupSort.svelte?raw';

const TABS: readonly ExplorerTabId[] = [
	'props',
	'files',
	'tags',
	'snippets',
	'plugins',
];

describe('U130-03: el scope groups esta en los TRES sitios', () => {
	it('el menu ofrece exactamente los scopes que la tab declara', () => {
		// La puerta contra U121-079: un nivel de scope a medias ordena mal y
		// callado. Derivar el menu de SCOPES_BY_TAB hace que no pueda volver a
		// desincronizarse.
		for (const tab of TABS) {
			expect(sortScopeOptions(tab).map((option) => option.scope)).toEqual([
				...scopesForTab(tab),
			]);
		}
	});

	it('groups sale en las cinco tabs', () => {
		for (const tab of TABS) {
			expect(sortScopeOptions(tab).map((o) => o.scope)).toContain('groups');
		}
	});

	it('cada opcion trae icono y clave de etiqueta', () => {
		for (const tab of TABS) {
			for (const option of sortScopeOptions(tab)) {
				expect(option.icon).toBeTruthy();
				expect(option.labelKey).toBeTruthy();
			}
		}
	});

	it('supportsByLevel concuerda con los scopes que la tab declara', () => {
		// La puerta real de U130-003: derivar la LISTA no sirve de nada si la
		// condicion que decide si se dibuja sigue escrita a mano.
		for (const tab of TABS) {
			expect(supportsByLevel(tab)).toBe(scopesForTab(tab).length > 1);
		}
	});

	it('snippets y plugins ofrecen el selector de scope', () => {
		for (const tab of ['snippets', 'plugins'] as const) {
			expect(supportsByLevel(tab)).toBe(true);
		}
	});

	it('la condicion del popup para By-level coincide con supportsByLevel para las cinco tabs', () => {
		// U130-003: el popup no decide por su cuenta que tabs ofrecen By-level.
		// La condicion que envuelve vertcol debe coincidir con supportsByLevel(tab)
		// para todas las tabs declaradas.
		interface AstNode {
			type?: string;
			start: number;
			end: number;
			expression?: AstNode;
			callee?: AstNode;
			arguments?: AstNode[];
			name?: string;
			[key: string]: unknown;
		}

		function findVertColIf(node: unknown): AstNode | null {
			if (!node || typeof node !== 'object') return null;
			const candidate = node as AstNode;
			if (candidate.type === 'IfBlock' && candidate.expression) {
				const text = popupSortSource.slice(candidate.start, candidate.end);
				if (text.includes('vaultman-sort-vertcol')) return candidate;
			}
			for (const key of Object.keys(candidate)) {
				if (key === 'parent') continue;
				const val = candidate[key];
				if (Array.isArray(val)) {
					for (const item of val) {
						const found = findVertColIf(item);
						if (found) return found;
					}
				} else if (val && typeof val === 'object') {
					const found = findVertColIf(val);
					if (found) return found;
				}
			}
			return null;
		}

		const ast = parse(popupSortSource);
		const ifNode = findVertColIf(ast.html);
		expect(ifNode).not.toBeNull();
		const expression = ifNode?.expression;
		const conditionExpression = popupSortSource.slice(
			expression?.start ?? 0,
			expression?.end ?? 0,
		);

		expect(conditionExpression.trim()).toBe('supportsByLevel(activeTab)');
		expect(expression?.type).toBe('CallExpression');
		expect(expression?.callee?.type).toBe('Identifier');
		expect(expression?.callee?.name).toBe('supportsByLevel');
		expect(expression?.arguments).toHaveLength(1);
		expect(expression?.arguments?.[0]?.type).toBe('Identifier');
		expect(expression?.arguments?.[0]?.name).toBe('activeTab');
	});
});
