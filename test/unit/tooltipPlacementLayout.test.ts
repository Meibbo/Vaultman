// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveTooltipPlacement } from '../../src/logic/logicCellTooltip';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.replaceChildren();
});

describe('tooltip placement without render-time layout', () => {
	it('does not measure a row while resolving its lateral tooltip', () => {
		// Given a row mounted in the left sidebar.
		const sidebar = document.createElement('div');
		sidebar.classList.add('mod-left-split');
		const row = sidebar.appendChild(document.createElement('div'));
		document.body.appendChild(sidebar);
		const geometry = vi.spyOn(row, 'getBoundingClientRect');

		// When every recycled row resolves its tooltip during scrolling.
		const placement = resolveTooltipPlacement('side', row);

		// Then placement is structural and cannot flush pending layout writes.
		expect(placement).toBe('right');
		expect(geometry).not.toHaveBeenCalled();
	});

	it.each(['mod-right-split', 'surface-position'])('flips right-sidebar tooltips for %s', (kind) => {
		// Given either native or Vaultman surface ownership.
		const sidebar = document.createElement('div');
		if (kind === 'mod-right-split') sidebar.classList.add(kind);
		else sidebar.dataset.surfacePosition = 'right-sidebar';
		const row = sidebar.appendChild(document.createElement('div'));
		document.body.appendChild(sidebar);

		// When resolving the lateral tooltip.
		const placement = resolveTooltipPlacement('right', row);

		// Then it opens inward without measuring the row.
		expect(placement).toBe('left');
	});

	it.each(['top', 'bottom', 'left'] as const)('preserves explicit %s placement', (placement) => {
		// Given a right-sidebar row with an explicit non-right placement.
		const sidebar = document.createElement('div');
		sidebar.classList.add('mod-right-split');
		const row = sidebar.appendChild(document.createElement('div'));

		// When resolving the chosen placement.
		const resolved = resolveTooltipPlacement(placement, row);

		// Then the explicit direction wins.
		expect(resolved).toBe(placement);
	});
});
