import { describe, expect, it } from 'vitest';

import type { NodeNotePrefixes } from '../../src/services/serviceNodeBinding';
import { planAliasPrefixMigration } from '../../src/logic/logicNodeNotePrefixMigration';

const OLD: NodeNotePrefixes = {
	tagPrefix: '#',
	tagSuffix: '',
	snippetPrefix: '$',
	snippetSuffix: '',
	pluginPrefix: '%',
	pluginSuffix: '',
	propPrefix: '[',
	propSuffix: ']',
};

const NEW: NodeNotePrefixes = {
	tagPrefix: '@',
	tagSuffix: '',
	snippetPrefix: '~',
	snippetSuffix: '',
	pluginPrefix: '&',
	pluginSuffix: '',
	propPrefix: '<',
	propSuffix: '>',
};

describe('planAliasPrefixMigration', () => {
	it('reescribe solo aliases con afijos viejos', () => {
		const plans = planAliasPrefixMigration(
		 [
				{
					path: 'Notes/A.md',
					aliases: ['[status]', '#a/b', '$snip', '%pid', 'pelado', 'x'],
				},
			],
			OLD,
			NEW,
		);
		expect(plans).toEqual([
			{ filePath: 'Notes/A.md', oldAlias: '[status]', newAlias: '<status>' },
			{ filePath: 'Notes/A.md', oldAlias: '#a/b', newAlias: '@a/b' },
			{ filePath: 'Notes/A.md', oldAlias: '$snip', newAlias: '~snip' },
			{ filePath: 'Notes/A.md', oldAlias: '%pid', newAlias: '&pid' },
		]);
	});

	it('omite pelados, vacios funcionales y kinds sin cambio', () => {
		const sameTag: NodeNotePrefixes = { ...NEW, tagPrefix: '#' };
		const plans = planAliasPrefixMigration(
			[{ path: 'N.md', aliases: ['pelado', '#tag', '[]', '#'] }],
			{ ...OLD, tagPrefix: '#' },
			{ ...sameTag, tagPrefix: '#' },
		);
		expect(plans).toEqual([]);
	});

	it('deduplica aliases repetidos por archivo', () => {
		const plans = planAliasPrefixMigration(
			[{ path: 'N.md', aliases: ['#a', '#a'] }],
			OLD,
			NEW,
		);
		expect(plans).toEqual([{ filePath: 'N.md', oldAlias: '#a', newAlias: '@a' }]);
	});
});
