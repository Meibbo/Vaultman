import { describe, expect, it } from 'vitest';

import {
	DERIVED_PROP_TYPE_OPTIONS,
	EDITABLE_PROP_TYPE_OPTIONS,
} from '../../src/logic/propTypes';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';

// U121-003 plan shard 08 task 8.3. The submenu already existed when this task
// was planned — `prop.type-*` over `EDITABLE_PROP_TYPE_OPTIONS`, queued through
// `NATIVE_SET_PROP_TYPE`. These are the locks the spec asks for, so the
// behaviour cannot drift back, plus the one gap it did have: a property whose
// type is a derived kind showed nothing about what its type actually is.
describe('U121-003 Property type submenu', () => {
	it('offers exactly Core assignable types', () => {
		expect(EDITABLE_PROP_TYPE_OPTIONS.map((option) => option.type)).toEqual([
			'text',
			'number',
			'checkbox',
			'date',
			'datetime',
			'list',
		]);
	});

	// Core does not let you assign the derived kinds, so neither do we.
	it('never offers the derived kinds as assignable', () => {
		const assignable = EDITABLE_PROP_TYPE_OPTIONS.map((option) => option.type);

		for (const derived of ['tags', 'aliases', 'cssclasses']) {
			expect(assignable).not.toContain(derived);
		}
	});

	it('registers on node_prop and never on node_value', () => {
		const registration = propsExplorerSource.slice(
			propsExplorerSource.indexOf('for (const option of EDITABLE_PROP_TYPE_OPTIONS)'),
		);
		const block = registration.slice(0, registration.indexOf('// Value actions'));

		expect(block).toContain("nodeTypes: ['prop']");
		expect(block).toContain('!(ctx.node.meta as PropMeta).isValueNode');
	});

	// Calling `PropertyTypeService.setType` from the menu would bypass the queue
	// and, with bypass mode on, the confirmation that goes with it.
	it('reaches types.json only through a queued change_type operation', () => {
		const changeType = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private async _changePropType('),
		);
		const body = changeType.slice(0, changeType.indexOf('private async _renameProp('));

		expect(body).toContain("action: 'change_type'");
		expect(body).toContain('NATIVE_SET_PROP_TYPE');
		expect(body).not.toContain('setType(');
	});

	// Convert transforms a value's text; Property type changes how Obsidian
	// interprets the key. Neither replaces the other.
	it('leaves the Convert submenu on value nodes', () => {
		expect(propsExplorerSource).toContain('availablePropertyValueConversions');
		expect(propsExplorerSource).toContain('PROPERTY_VALUE_CONVERSION_OPTIONS');
	});

	// A property typed `tags` used to show a submenu where nothing was marked,
	// so the menu said nothing about what the type currently is. Core shows the
	// derived kind as the current type without offering it, and so do we.
	it('shows a derived kind as the current type, inert', () => {
		expect(DERIVED_PROP_TYPE_OPTIONS.map((option) => option.type)).toEqual([
			'tags',
			'aliases',
			'cssclasses',
		]);

		for (const option of DERIVED_PROP_TYPE_OPTIONS) {
			expect(en[option.labelKey]).toBeTruthy();
			expect(es[option.labelKey]).toBeTruthy();
		}

		expect(propsExplorerSource).toContain('DERIVED_PROP_TYPE_OPTIONS');
		expect(propsExplorerSource).toContain("id: `prop.type-current-");
	});
});
