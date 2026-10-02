import { describe, expect, it } from 'vitest';
import { isBlankPanelSelectionTarget } from '../../src/logic/logicPanelBlankSelection';

describe('panel blank-space selection cancellation', () => {
	it('accepts blank explorer padding, including nested empty-state content', () => {
		const panel = document.createElement('div');
		panel.className = 'vaultman-page';
		panel.dataset.page = 'filters';
		const empty = panel.appendChild(document.createElement('div'));
		expect(isBlankPanelSelectionTarget(empty)).toBe(true);
	});
	it('accepts toolbar padding outside widget nodes', () => {
		const panel = document.createElement('div');
		panel.className = 'vaultman-panel-widget-host';
		expect(isBlankPanelSelectionTarget(panel)).toBe(true);
	});
	it.each(['button', 'input', 'select', 'textarea', 'a'])('leaves %s controls alone', (tag) => {
		const panel = document.createElement('div');
		panel.className = 'vaultman-panel-widget-host';
		const control = panel.appendChild(document.createElement(tag));
		expect(isBlankPanelSelectionTarget(control)).toBe(false);
	});
	it('leaves node cells and toolbar widgets alone', () => {
		const panel = document.createElement('div');
		panel.className = 'vaultman-panel-widget-host';
		const node = panel.appendChild(document.createElement('div'));
		node.dataset.panelWidgetNodeId = 'files:sort';
		const icon = node.appendChild(document.createElement('span'));
		expect(isBlankPanelSelectionTarget(icon)).toBe(false);
	});
});
