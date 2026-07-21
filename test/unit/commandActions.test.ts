import { describe, expect, it } from 'vitest';

import {
	VAULTMAN_DEFAULT_COMMAND,
	addCommandId,
	isVaultmanDefault,
	normalizeCommandIds,
	removeCommandId,
	reorderCommandIds,
	resolveCommandAction,
	resolveCommandActions,
	type CommandDescriptor,
} from '../../src/logic/logicCommandActions';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import commandsUtilSource from '../../src/utils/obsidianCommands.ts?raw';

const registry: CommandDescriptor[] = [
	{ id: 'editor:toggle-bold', name: 'Toggle bold', icon: 'lucide-bold' },
	{ id: 'app:go-back', name: 'Navigate back' },
];

describe('BT5-023/024 command action resolver', () => {
	it('treats empty and the sentinel as the Vaultman default', () => {
		expect(isVaultmanDefault('')).toBe(true);
		expect(isVaultmanDefault(null)).toBe(true);
		expect(isVaultmanDefault(VAULTMAN_DEFAULT_COMMAND)).toBe(true);
		expect(isVaultmanDefault('editor:toggle-bold')).toBe(false);
	});

	it('resolves a live command to its registry label and icon', () => {
		const resolved = resolveCommandAction(registry, 'editor:toggle-bold');
		expect(resolved).toEqual({
			id: 'editor:toggle-bold',
			label: 'Toggle bold',
			icon: 'lucide-bold',
			available: true,
		});
	});

	it('keeps a retired command visible and repairable, never silent', () => {
		const resolved = resolveCommandAction(registry, 'gone:forever');
		expect(resolved.available).toBe(false);
		expect(resolved.id).toBe('gone:forever');
		expect(resolved.label).toBe('gone:forever');
	});

	it('dedupes, drops empties and the sentinel, and keeps first-seen order', () => {
		expect(
			normalizeCommandIds([
				'app:go-back',
				'  editor:toggle-bold  ',
				'app:go-back',
				'',
				VAULTMAN_DEFAULT_COMMAND,
			]),
		).toEqual(['app:go-back', 'editor:toggle-bold']);
		expect(normalizeCommandIds('nope')).toEqual([]);
	});

	it('adds without duplicating and removes by id', () => {
		expect(addCommandId(['app:go-back'], 'app:go-back')).toEqual(['app:go-back']);
		expect(addCommandId(['app:go-back'], 'editor:toggle-bold')).toEqual([
			'app:go-back',
			'editor:toggle-bold',
		]);
		expect(removeCommandId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
	});

	it('reorders by drag and drop without losing entries', () => {
		expect(reorderCommandIds(['a', 'b', 'c'], 'c', 'a')).toEqual([
			'c',
			'a',
			'b',
		]);
		expect(reorderCommandIds(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
	});

	it('resolves a saved list against the live registry in order', () => {
		const resolved = resolveCommandActions(registry, [
			'app:go-back',
			'gone:forever',
			'app:go-back',
		]);
		expect(resolved.map((entry) => entry.available)).toEqual([true, false]);
		expect(resolved.map((entry) => entry.id)).toEqual([
			'app:go-back',
			'gone:forever',
		]);
	});
});

describe('BT5-023 Create File command binding', () => {
	it('resolves the binding by id at invoke time with a safe fallback', () => {
		const block = explorerFilesSource.slice(
			explorerFilesSource.indexOf('async createFromSearch('),
			explorerFilesSource.indexOf('private _mountView()'),
		);
		expect(block).toContain('this.plugin.settings.createFileCommand');
		expect(block).toContain('isVaultmanDefault(binding)');
		expect(block).toContain('obsidianCommandExists(this.plugin.app, binding)');
		expect(block).toContain('executeObsidianCommand(this.plugin.app, binding)');
		// Missing command warns, then falls through to the built-in note create.
		expect(block).toContain("translate('command.missing')");
		expect(block).toContain('await this._createNote(term);');
	});

	it('offers a searchable selector with a reset-to-default in settings', () => {
		expect(settingsSource).toContain('openCommandPicker(');
		expect(settingsSource).toContain('includeDefault: true');
		expect(settingsSource).toContain('createFileCommand');
	});

	it('reads the live registry through a defensive accessor', () => {
		expect(commandsUtilSource).toContain('listCommands?.()');
		expect(commandsUtilSource).toContain('executeCommandById?.(id)');
		expect(commandsUtilSource).toContain('} catch {');
	});
});
