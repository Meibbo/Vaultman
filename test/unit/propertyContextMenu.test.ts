import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import {
	EDITABLE_PROP_TYPE_OPTIONS,
	normalizePropType,
} from '../../src/logic/propTypes';
import {
	availablePropertyValueConversions,
	convertPropertyValue,
	PROPERTY_VALUE_CONVERSION_OPTIONS,
	replaceMatchingPropertyValue,
} from '../../src/logic/propertyValueCoercion';
import explorerSource from '../../src/components/containers/explorerProps.ts?raw';

describe('BT5-054 property context-menu model', () => {
	it('declares every editable native type, including Date & Time', () => {
		expect(EDITABLE_PROP_TYPE_OPTIONS.map((option) => option.type)).toEqual([
			'text',
			'number',
			'checkbox',
			'date',
			'datetime',
			'list',
		]);
		expect(
			EDITABLE_PROP_TYPE_OPTIONS.find((option) => option.type === 'datetime'),
		).toEqual(
			expect.objectContaining({
				labelKey: 'prop.type.datetime',
				icon: 'lucide-calendar',
			}),
		);
	});

	it('normalizes assigned and legacy aliases to one checked type identity', () => {
		expect(normalizePropType('multitext')).toBe('list');
		expect(normalizePropType('toggle')).toBe('checkbox');
		expect(normalizePropType('boolean')).toBe('checkbox');
		expect(normalizePropType('date-time')).toBe('datetime');
		expect(normalizePropType({ widget: 'datetime' })).toBe('datetime');
	});

	it('uses exact English conversion labels and localized menu copy', () => {
		expect(
			PROPERTY_VALUE_CONVERSION_OPTIONS.map((option) => option.labelKey),
		).toEqual([
			'explorer.ctx.lowercase',
			'explorer.ctx.uppercase',
			'explorer.ctx.titlecase',
			'explorer.ctx.wikilink',
		]);
		expect(en['explorer.ctx.change_type']).toBe('Change type');
		expect(en['explorer.ctx.convert']).toBe('Convert');
		expect(en['explorer.ctx.lowercase']).toBe('lowercase');
		expect(en['explorer.ctx.uppercase']).toBe('UPPERCASE');
		expect(en['explorer.ctx.titlecase']).toBe('Titlecase');
		expect(en['explorer.ctx.wikilink']).toBe('Wikilink');
		expect(es['explorer.ctx.change_type']).toBe('Cambiar tipo');
		expect(es['explorer.ctx.convert']).toBe('Convertir');
	});

	it('offers only meaningful text/list conversions', () => {
		expect(
			availablePropertyValueConversions('text', 'release notes').map(
				(option) => option.id,
			),
		).toEqual(['uppercase', 'titlecase', 'wikilink']);
		expect(
			availablePropertyValueConversions('list', 'Release Notes').map(
				(option) => option.id,
			),
		).toEqual(['lowercase', 'uppercase', 'wikilink']);
		expect(
			availablePropertyValueConversions('multitext', 'Release Notes').map(
				(option) => option.id,
			),
		).toEqual(['lowercase', 'uppercase', 'wikilink']);
		expect(availablePropertyValueConversions('text', '[[Release]]')).toEqual(
			[],
		);
		expect(availablePropertyValueConversions('text', '')).toEqual([]);
		expect(availablePropertyValueConversions('checkbox', 'true')).toEqual([]);
		expect(availablePropertyValueConversions('text', 'Release', true)).toEqual(
			[],
		);
	});

	it('converts without malformed or redundant values', () => {
		expect(convertPropertyValue('rELEASE nOTES', 'lowercase')).toBe(
			'release notes',
		);
		expect(convertPropertyValue('rELEASE nOTES', 'uppercase')).toBe(
			'RELEASE NOTES',
		);
		expect(convertPropertyValue('rELEASE nOTES', 'titlecase')).toBe(
			'Release Notes',
		);
		expect(convertPropertyValue(' Release ', 'wikilink')).toBe('[[Release]]');
		expect(convertPropertyValue('[[Release]]', 'wikilink')).toBe('[[Release]]');
		expect(convertPropertyValue('   ', 'wikilink')).toBe('   ');
	});

	it('replaces represented scalar/list values without degrading other members', () => {
		expect(replaceMatchingPropertyValue('Draft', 'Draft', 'Published')).toEqual(
			{
				changed: true,
				value: 'Published',
			},
		);
		expect(
			replaceMatchingPropertyValue(['Draft', false, 3], 'Draft', 'Published'),
		).toEqual({ changed: true, value: ['Published', false, 3] });
		expect(replaceMatchingPropertyValue(false, 'true', true)).toEqual({
			changed: false,
			value: false,
		});
	});

	it('registers descriptors through translated submenus and the queue path', () => {
		expect(explorerSource).toContain('EDITABLE_PROP_TYPE_OPTIONS');
		expect(explorerSource).toContain('PROPERTY_VALUE_CONVERSION_OPTIONS');
		expect(explorerSource).toContain("translate('explorer.ctx.change_type')");
		expect(explorerSource).toContain("translate('explorer.ctx.convert')");
		expect(explorerSource).toContain('availablePropertyValueConversions');
		expect(explorerSource).toContain('replaceMatchingPropertyValue');
		expect(explorerSource).toContain('queueService.addOrRun');
		expect(explorerSource).toContain('oldValue');
		expect(explorerSource).toContain('value: String(newValue)');
	});
});
