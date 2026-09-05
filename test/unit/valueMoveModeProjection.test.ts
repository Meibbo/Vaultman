import { describe, expect, it } from 'vitest';

import {
	PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER,
	resolveExclusiveSlotNodes,
	resolvePanelWidgetProjection,
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

describe('U130-05b: el searchbox sigue teniendo UN decorador, no un bar', () => {
	it('el decorador es uno y es el slot de Core', () => {
		// Se cuenta el ATRIBUTO, no la mencion: el comentario de arriba explica
		// por que se usa el slot de Core y tambien contiene el nombre.
		const decorators = searchControlSource.match(
			/class="input-right-decorator/g,
		);
		expect(decorators).toHaveLength(1);
	});

	it('los ids viejos del reparto no sobreviven en ningun punto del arbol', () => {
		// `resolveValueMoveToggleNodes` emitia `props.move-to-prop.write|origin`
		// mientras el plan 01 registraba los mismos dos controles en SASI como
		// `vaultman.move.toggleWrite|toggleOriginDisposition`. Eran dos catalogos
		// para los mismos dos botones, con iconos que ni coincidian.
		for (const source of [
			searchControlSource,
			navbarSource,
			filtersPageSource,
			panelWidgetTypeSource,
		]) {
			expect(source).not.toContain('props.move-to-prop.write');
			expect(source).not.toContain('props.move-to-prop.origin');
			expect(source).not.toContain('resolveValueMoveToggleNodes');
		}
	});

	it('el searchbox recibe ids, no nodos ya pintados', () => {
		expect(navbarSource).toContain('{trailingActionIds}');
		expect(panelWidgetTypeSource).toContain('searchMoveToggles?:');
		expect(filtersPageSource).toContain('searchMoveToggles');
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
