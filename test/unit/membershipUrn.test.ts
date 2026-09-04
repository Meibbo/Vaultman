import { describe, expect, it } from 'vitest';

import {
	formatMembershipUrn,
	parseMembershipUrn,
	rewriteCanonicalId,
} from '../../src/logic/logicMembershipUrn';

describe('U130-03 URN de pertenencia', () => {
	it('formatea y parsea el ida y vuelta', () => {
		const urn = formatMembershipUrn({
			providerId: 'files',
			kind: 'file',
			canonicalId: 'proyectos/alfa.md',
			displayLabel: 'alfa.md',
		});
		expect(urn).toBe('files:file:proyectos/alfa.md|alfa.md');
		expect(parseMembershipUrn(urn)).toEqual({
			providerId: 'files',
			kind: 'file',
			canonicalId: 'proyectos/alfa.md',
			displayLabel: 'alfa.md',
		});
	});

	it('admite dos puntos dentro del canonicalId', () => {
		// Una ruta puede llevar `:`. El corte son los DOS primeros separadores,
		// no un split entero, o `a:b` en un nombre de fichero rompe el parseo.
		const urn = 'files:file:notas/a:b.md|a:b.md';
		expect(parseMembershipUrn(urn)?.canonicalId).toBe('notas/a:b.md');
	});

	it('admite una barra vertical dentro del label', () => {
		// El label es lo ULTIMO: se corta por la PRIMERA barra, y el resto es
		// label. Asi un titulo con `|` no corrompe la URN.
		const parsed = parseMembershipUrn('files:file:x.md|a|b');
		expect(parsed?.displayLabel).toBe('a|b');
	});

	it('una URN mal formada devuelve null, no revienta', () => {
		expect(parseMembershipUrn('basura')).toBeNull();
		expect(parseMembershipUrn('files:file:sin-label')).toBeNull();
	});

	it('el rename reescribe el canonicalId y conserva el label', () => {
		const urn = 'files:file:viejo/a.md|a.md';
		expect(rewriteCanonicalId(urn, 'nuevo/a.md')).toBe(
			'files:file:nuevo/a.md|a.md',
		);
	});

	it('distingue el mismo path en kinds distintos', () => {
		// El prefijo providerId:kind es lo que impide que una ruta que coincide
		// entre kinds empareje por accidente.
		expect(parseMembershipUrn('tags:tag:proyecto|proyecto')).not.toEqual(
			parseMembershipUrn('files:folder:proyecto|proyecto'),
		);
	});
});
