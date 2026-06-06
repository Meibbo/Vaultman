import { describe, expect, it } from 'vitest';

import navbarPillFabSource from '../../src/components/layout/navbarPillFab.svelte?raw';

describe('minimal dock source guards', () => {
	it('does not emit native title attributes on dock FABs', () => {
		expect(navbarPillFabSource).not.toContain('title={fabLabel(leftFab)}');
		expect(navbarPillFabSource).not.toContain('title={fabLabel(rightFab)}');
	});

	it('marks queue and filters FABs active while their islands are open', () => {
		expect(navbarPillFabSource).toContain('queueIslandOpen = false');
		expect(navbarPillFabSource).toContain('filtersIslandOpen = false');
		expect(navbarPillFabSource).toContain('function fabIsActive');
		expect(navbarPillFabSource).toContain('class:is-active={fabIsActive(leftFab)}');
		expect(navbarPillFabSource).toContain(
			'class:is-active={fabIsActive(rightFab)}',
		);
	});

	it('keeps dock FAB state separate from page active state', () => {
		expect(navbarPillFabSource).toContain("fab.badge === 'queue'");
		expect(navbarPillFabSource).toContain("fab.badge === 'filters'");
	});
});
