import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

// U121-003 plan shard 08 task 8.1. `explorer.ctx.filter_include` read `Add as
// filter` while its counterpart already read `Exclude as filter`: the pair was
// asymmetric, and the include verb collided with the new `Add to files`
// operation, which adds a value to notes rather than to the filter set.
describe('U121-003 explorer filter menu labels', () => {
	it('states include and exclude as a symmetric pair in English', () => {
		expect(en['explorer.ctx.filter_include']).toBe('Include as filter');
		expect(en['explorer.ctx.filter_exclude']).toBe('Exclude as filter');
	});

	it('states include and exclude as a symmetric pair in Spanish', () => {
		expect(es['explorer.ctx.filter_include']).toBe('Incluir como filtro');
		expect(es['explorer.ctx.filter_exclude']).toBe('Excluir como filtro');
	});

	// The folder variants name a different action — they scope the explorer to a
	// folder rather than adding a node to the filter set — so they keep their own
	// phrasing.
	it('leaves the folder variants alone', () => {
		expect(en['folder.ctx.filter_include']).toBe('Filter to this folder');
		expect(en['folder.ctx.filter_exclude']).toBe('Exclude this folder');
		expect(es['folder.ctx.filter_include']).toBe('Filtrar a esta carpeta');
		expect(es['folder.ctx.filter_exclude']).toBe('Excluir esta carpeta');
	});

	// The key is the persistence identifier. Renaming it would be a data
	// migration, not a label fix, so only the display strings move.
	it('keeps the keys themselves', () => {
		expect(Object.keys(en)).toContain('explorer.ctx.filter_include');
		expect(Object.keys(es)).toContain('explorer.ctx.filter_include');
	});
});
