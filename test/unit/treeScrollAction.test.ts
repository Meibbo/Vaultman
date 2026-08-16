import { describe, expect, it } from 'vitest';

import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('tree scroll perf action', () => {
	it('records a coalesced scroll gesture, not one action per scroll event', () => {
		expect(treeSource).toContain("recordAction('tree', 'scroll'");
		// El gesto se cierra con un temporizador, no en cada callback.
		expect(treeSource).toMatch(/_scrollGestureTimer/);
	});

	it('reports the displacement and the live configs the gesture ran under', () => {
		const call = treeSource.slice(treeSource.indexOf("recordAction('tree', 'scroll'"));
		for (const key of ['delta', 'from', 'to', 'durationMs', 'rows', 'sticky']) {
			expect(call.slice(0, 400)).toContain(key);
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
