import { describe, expect, it, vi } from 'vitest';

import { FloatingTocRouter } from '../../src/services/routerFloatingToc';

describe('FloatingTocRouter', () => {
	it('reveals through the registered port and reports ok', () => {
		const router = new FloatingTocRouter();
		const revealNode = vi.fn().mockReturnValue(true);
		router.setPort({ revealNode });
		expect(router.invoke('reveal-node', 'file.md')).toEqual({ ok: true });
		expect(revealNode).toHaveBeenCalledWith('file.md');
	});

	it('forwards scroll behavior to the registered reveal port', () => {
		const router = new FloatingTocRouter();
		const revealNode = vi.fn().mockReturnValue(true);
		const options = { behavior: 'smooth' } as const;
		router.setPort({ revealNode });

		expect(router.invoke('reveal-node', 'file.md', options)).toEqual({ ok: true });
		expect(revealNode).toHaveBeenCalledWith('file.md', options);
	});

	it('reports missing-reveal-port when no port is registered', () => {
		const router = new FloatingTocRouter();
		expect(router.invoke('reveal-node', 'file.md')).toEqual({
			ok: false,
			reason: 'missing-reveal-port',
		});
	});

	it('reports reveal-rejected when the port finds no target', () => {
		const router = new FloatingTocRouter();
		router.setPort({ revealNode: () => false });
		expect(router.invoke('reveal-node', 'ghost')).toEqual({
			ok: false,
			reason: 'reveal-rejected',
		});
	});

	it('rejects an empty target id without touching the port', () => {
		const router = new FloatingTocRouter();
		const revealNode = vi.fn().mockReturnValue(true);
		router.setPort({ revealNode });
		expect(router.invoke('reveal-node', '')).toEqual({
			ok: false,
			reason: 'reveal-rejected',
		});
		expect(revealNode).not.toHaveBeenCalled();
	});

	it('does not throw and rejects after the port is cleared', () => {
		const router = new FloatingTocRouter();
		router.setPort({ revealNode: () => true });
		router.setPort(null);
		expect(router.invoke('reveal-node', 'file.md')).toEqual({
			ok: false,
			reason: 'missing-reveal-port',
		});
	});
});
