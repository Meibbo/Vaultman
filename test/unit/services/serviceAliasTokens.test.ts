import { describe, expect, it } from 'vitest';
import {
	aliasForOutlineHeader,
	aliasForPluginId,
	aliasForProperty,
	aliasForSnippetFile,
	aliasForTag,
} from '../../../src/services/serviceAliasTokens';

describe('serviceAliasTokens', () => {
	it('aliasForTag preserves existing # and adds it when missing', () => {
		expect(aliasForTag('projects')).toBe('#projects');
		expect(aliasForTag('#projects')).toBe('#projects');
		expect(aliasForTag('  #ws  ')).toBe('#ws');
		expect(aliasForTag('')).toBe('');
	});

	it('aliasForSnippetFile strips .css suffix and prefixes $', () => {
		expect(aliasForSnippetFile('mytheme.css')).toBe('$mytheme');
		expect(aliasForSnippetFile('mytheme.CSS')).toBe('$mytheme');
		expect(aliasForSnippetFile('plain')).toBe('$plain');
		expect(aliasForSnippetFile('')).toBe('');
	});

	it('aliasForPluginId prefixes %', () => {
		expect(aliasForPluginId('vaultman')).toBe('%vaultman');
		expect(aliasForPluginId('')).toBe('');
	});

	it('aliasForProperty wraps in [] and strips existing brackets', () => {
		expect(aliasForProperty('priority')).toBe('[priority]');
		expect(aliasForProperty('[priority]')).toBe('[priority]');
		expect(aliasForProperty('')).toBe('');
	});

	it('aliasForOutlineHeader builds [[file#header]]', () => {
		expect(aliasForOutlineHeader({ basename: 'note' }, 'Top')).toBe('[[note#Top]]');
	});
});
