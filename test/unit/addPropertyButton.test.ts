import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';

/**
 * U121-029 — the reveal projection copies Core's `metadata-add-button`, but the
 * button is appended to the container the view does not own, so it survives the
 * view's re-render. Every render left another copy behind and the copies
 * outlived reveal itself: turning the mode off stopped new ones being made and
 * never removed the old ones, so the panel accumulated dead buttons.
 */
describe('U121-029 reveal add-property button', () => {
	const body = propsExplorerSource.slice(
		propsExplorerSource.indexOf('private _renderAddPropertyButtonIfNeeded()'),
		propsExplorerSource.indexOf('private _renderPropertyValueLabel('),
	);

	it('sweeps its own copies before deciding whether to render one', () => {
		expect(body).not.toBe('');
		const sweep = body.indexOf('.metadata-add-button');
		const gate = body.indexOf('if (!this.isRevealingActiveFile()) return;');
		expect(sweep).toBeGreaterThan(-1);
		expect(gate).toBeGreaterThan(-1);
		// The sweep has to run before the early return, or leaving reveal keeps
		// whatever was already on screen.
		expect(sweep).toBeLessThan(gate);
		expect(body).toContain('stale.remove()');
	});

	it('does not claim a Core command that does not exist', () => {
		// Core drives its button from `addProperty()` on the metadata editor — an
		// internal method, not a command — so no id can be invoked for it.
		expect(propsExplorerSource).not.toContain('file-explorer:add-property');
		// The call, not the word: the comment above the handler names it.
		expect(propsExplorerSource).not.toContain('executeObsidianCommand(');
	});

	it('localizes the button and its current limitation', () => {
		for (const key of ['ops.add_property', 'ops.add_property.unavailable']) {
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
			expect(es[key]).not.toBe(en[key]);
		}
	});
});
