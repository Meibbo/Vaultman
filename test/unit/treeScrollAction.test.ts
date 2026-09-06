import { describe, expect, it } from 'vitest';

import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('tree scroll perf action', () => {
	it('records a coalesced scroll gesture, not one action per scroll event', () => {
		expect(treeSource).toContain("recordAction('tree', 'scroll'");
		// El gesto se cierra con un temporizador, no en cada callback.
		expect(treeSource).toMatch(/_scrollGestureTimer/);
	});

	it('reports the displacement and the live configs the gesture ran under', () => {
		const open = treeSource.indexOf("recordAction('tree', 'scroll', {");
		expect(open).toBeGreaterThan(-1);
		const detail = treeSource.slice(open, treeSource.indexOf('});', open));
		for (const key of ['delta', 'from', 'to', 'startedAt', 'durationMs', 'rows', 'sticky']) {
			// Una CLAVE del objeto, no una mención cualquiera: `startedAt` ya
			// aparecía dentro de `durationMs: Date.now() - startedAt`, y un
			// `toContain` suelto daba verde sin que la clave existiera.
			expect(detail).toMatch(new RegExp(`^\\t+${key}[,:]`, 'm'));
		}
	});

	it('does not record a gesture when the scroll position did not change', () => {
		expect(treeSource).toMatch(/if \(delta === 0\)/);
	});

	it('clears the gesture timer when the view is destroyed', () => {
		// El temporizador sobrevive al detach si nadie lo cancela, y dispara
		// contra un contenedor ya desmontado.
		// Anclar en la declaración del método, no en la primera llamada a un
		// `destroy()` ajeno que aparezca antes en el fichero.
		const destroy = treeSource.slice(treeSource.indexOf('\n\tdestroy(): void {'));
		expect(destroy.slice(0, 1200)).toMatch(/_scrollGestureTimer/);
	});
});
