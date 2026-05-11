import { describe, expect, it } from 'vitest';
import { AddonsIslandService } from '../../../src/services/serviceAddonsIsland.svelte';

describe('AddonsIslandService', () => {
	it('defaults to stats pane with no note path', () => {
		const svc = new AddonsIslandService();
		expect(svc.activePane).toBe('stats');
		expect(svc.notePath).toBeNull();
	});

	it('openNote switches to markdown pane', () => {
		const svc = new AddonsIslandService();
		svc.openNote('Reference.md');
		expect(svc.activePane).toBe('markdown');
		expect(svc.notePath).toBe('Reference.md');
	});

	it('showStats returns to stats pane and clears note', () => {
		const svc = new AddonsIslandService();
		svc.openNote('Note.md');
		svc.showStats();
		expect(svc.activePane).toBe('stats');
		expect(svc.notePath).toBeNull();
	});

	it('switching notes updates notePath', () => {
		const svc = new AddonsIslandService();
		svc.openNote('A.md');
		svc.openNote('B.md');
		expect(svc.notePath).toBe('B.md');
		expect(svc.activePane).toBe('markdown');
	});
});
