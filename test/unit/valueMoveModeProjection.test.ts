import { describe, expect, it } from 'vitest';

import {
	PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
	resolveExclusiveSlotNodes,
	resolvePanelWidgetProjection,
	resolveValueMoveToggleNodes,
} from '../../src/logic/logicPanelWidgetProjection';
import type { PanelWidgetNode } from '../../src/types/typePanelWidget';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import panelWidgetTypeSource from '../../src/types/typePanelWidget.ts?raw';
import searchControlSource from '../../src/components/layout/searchControl.svelte?raw';

function node(id: string, label: string, order: number): PanelWidgetNode {
	return {
		id,
		nodeKind: 'action',
		cellKind: 'action',
		presentation: 'button',
		label,
		icon: 'lucide-box',
		order,
		available: true,
		action: { id: `${id}.exec` },
	};
}

const reveal = node(
	'props.reveal-this-file',
	'Reveal this file',
	PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
);
const proceed = node(
	'props.move-to-prop.proceed',
	'Proceed with selected',
	PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
);
const cancel = node(
	'props.move-to-prop.cancel',
	'Cancel',
	PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER + 1,
);

describe('the move mode toggles in the SearchControl', () => {
	const labels = {
		append: 'Append to the destination',
		replace: 'Replace the destination',
		move: 'Remove the original value',
		copy: 'Keep the original value',
	};

	it('publishes exactly two toggles, one per axis', () => {
		const nodes = resolveValueMoveToggleNodes({
			write: 'append',
			originDisposition: 'move',
			labels,
		});
		expect(nodes).toHaveLength(2);
		expect(nodes.map((toggle) => toggle.id)).toEqual([
			'props.move-to-prop.write',
			'props.move-to-prop.origin',
		]);
		expect(nodes.every((toggle) => toggle.presentation === 'toggle')).toBe(true);
	});

	it('labels each toggle with the state it is in, not the state it would go to', () => {
		const appended = resolveValueMoveToggleNodes({
			write: 'append',
			originDisposition: 'move',
			labels,
		});
		expect(appended[0].label).toBe(labels.append);
		expect(appended[1].label).toBe(labels.move);

		const replaced = resolveValueMoveToggleNodes({
			write: 'replace',
			originDisposition: 'copy',
			labels,
		});
		expect(replaced[0].label).toBe(labels.replace);
		expect(replaced[1].label).toBe(labels.copy);
	});

	it('rides the existing trailing-action contract instead of a new bar', () => {
		// searchControl already renders `trailingActions`; the mode feeds that
		// prop rather than introducing a second row of controls.
		expect(searchControlSource).toContain('trailingActions');
		expect(navbarSource).toContain('trailingActions={searchTrailingActions}');
		expect(panelWidgetTypeSource).toContain('searchTrailingActions?:');
		expect(filtersPageSource).toContain('searchTrailingActions');
		expect(filtersPageSource).toContain('resolveValueMoveToggleNodes');
	});
});

describe('the exclusive props toolbar slot', () => {
	it('holds its idle occupant while no operation mode is active', () => {
		expect(
			resolveExclusiveSlotNodes({ idleNode: reveal, moveMode: null }),
		).toEqual([reveal]);
	});

	it('holds nothing when there is no idle occupant and no mode', () => {
		expect(resolveExclusiveSlotNodes({ idleNode: null, moveMode: null })).toEqual(
			[],
		);
	});

	it('yields the slot to the move mode while it is active', () => {
		expect(
			resolveExclusiveSlotNodes({
				idleNode: reveal,
				moveMode: { proceed, cancel },
			}),
		).toEqual([proceed, cancel]);
	});

	it('never produces the idle occupant and the mode controls together', () => {
		for (const idleNode of [reveal, null]) {
			const nodes = resolveExclusiveSlotNodes({
				idleNode,
				moveMode: { proceed, cancel },
			});
			expect(nodes.map((slotNode) => slotNode.id)).not.toContain(reveal.id);
			expect(nodes.map((slotNode) => slotNode.id)).toContain(proceed.id);
		}
	});

	it('returns the slot to its previous occupant on exit', () => {
		const active = resolveExclusiveSlotNodes({
			idleNode: reveal,
			moveMode: { proceed, cancel },
		});
		const exited = resolveExclusiveSlotNodes({
			idleNode: reveal,
			moveMode: null,
		});
		expect(active).not.toEqual(exited);
		expect(exited).toEqual([reveal]);
	});

	it('sits between search and collapse in the resolved projection', () => {
		const search = node('props.search', 'Search', 10);
		const collapse = node('props.collapse', 'Collapse all', 30);
		const projection = resolvePanelWidgetProjection({
			providerId: 'props',
			nodes: [
				search,
				...resolveExclusiveSlotNodes({ idleNode: reveal, moveMode: null }),
				collapse,
			],
			config: {},
		});
		expect(projection.nodes.map((slotNode) => slotNode.id)).toEqual([
			'props.search',
			'props.reveal-this-file',
			'props.collapse',
		]);
	});

	it('keeps the mode controls in the same place the idle occupant held', () => {
		const search = node('props.search', 'Search', 10);
		const collapse = node('props.collapse', 'Collapse all', 30);
		const projection = resolvePanelWidgetProjection({
			providerId: 'props',
			nodes: [
				search,
				...resolveExclusiveSlotNodes({
					idleNode: reveal,
					moveMode: { proceed, cancel },
				}),
				collapse,
			],
			config: {},
		});
		expect(projection.nodes.map((slotNode) => slotNode.id)).toEqual([
			'props.search',
			'props.move-to-prop.proceed',
			'props.move-to-prop.cancel',
			'props.collapse',
		]);
	});
});
