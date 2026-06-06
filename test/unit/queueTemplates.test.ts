import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import {
	isBulkQueueTarget,
	rehydrateQueueTemplateChange,
	resolveQueueTemplateTarget,
	serializeQueueTemplateChange,
} from '../../src/utils/queueTemplateMenu';
import type { PendingChange } from '../../src/types/typeOps';
import type { VaultmanPlugin } from '../../src/main';

function makeFile(path: string): TFile {
	return {
		basename: path.replace(/\.md$/, ''),
		extension: 'md',
		name: path,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

describe('queue templates', () => {
	it('serializes queue operations without persisting runtime logic functions', () => {
		const change: PendingChange = {
			type: 'property',
			action: 'set',
			property: 'status',
			value: 'done',
			details: 'Set status',
			files: [makeFile('one.md')],
			customLogic: true,
			logicFunc: () => ({ status: 'done' }),
		};

		const serialized = serializeQueueTemplateChange(change);

		expect(serialized).toEqual({
			type: 'property',
			action: 'set',
			property: 'status',
			value: 'done',
			oldValue: undefined,
			details: 'Set status',
		});
		expect(JSON.stringify(serialized)).not.toContain('logicFunc');
	});

	it('rehydrates a saved property operation against the current target files', () => {
		const file = makeFile('target.md');

		const change = rehydrateQueueTemplateChange(
			{
				type: 'property',
				action: 'set',
				property: 'status',
				value: 'done',
				details: 'Set status',
			},
			[file],
		);

		expect(change?.files).toEqual([file]);
		expect(change?.logicFunc(file, {})).toEqual({ status: 'done' });
	});

	it('classifies bulk queue targets using the accepted vault-size thresholds', () => {
		expect(isBulkQueueTarget({ targetCount: 70, vaultCount: 100 })).toBe(true);
		expect(isBulkQueueTarget({ targetCount: 69, vaultCount: 100 })).toBe(false);
		expect(isBulkQueueTarget({ targetCount: 501, vaultCount: 1000 })).toBe(true);
		expect(isBulkQueueTarget({ targetCount: 500, vaultCount: 1000 })).toBe(false);
		expect(isBulkQueueTarget({ targetCount: 400, vaultCount: 400 })).toBe(true);
	});

	it('resolves action preset targets from explicit selection before filters or the full vault', () => {
		const selected = makeFile('selected.md');
		const filtered = [makeFile('filtered-a.md'), makeFile('filtered-b.md')];
		const vaultFiles = [selected, ...filtered];
		const plugin = {
			filterService: {
				selectedFiles: [selected],
				filteredFiles: filtered,
				activeFilter: {
					type: 'group',
					logic: 'all',
					children: [{ type: 'rule' }],
				},
			},
			app: {
				vault: { getMarkdownFiles: () => vaultFiles },
			},
		} as unknown as VaultmanPlugin;

		const target = resolveQueueTemplateTarget(plugin);

		expect(target.source).toBe('selected');
		expect(target.files).toEqual([selected]);
		expect(target.vaultCount).toBe(3);
	});

	it('marks an unfiltered all-files action preset target as vault scope', () => {
		const vaultFiles = [makeFile('a.md'), makeFile('b.md')];
		const plugin = {
			filterService: {
				selectedFiles: [],
				filteredFiles: vaultFiles,
				activeFilter: {
					type: 'group',
					logic: 'all',
					children: [],
				},
			},
			app: {
				vault: { getMarkdownFiles: () => vaultFiles },
			},
		} as unknown as VaultmanPlugin;

		const target = resolveQueueTemplateTarget(plugin);

		expect(target.source).toBe('vault');
		expect(target.files).toEqual(vaultFiles);
		expect(isBulkQueueTarget(target)).toBe(true);
	});
});
