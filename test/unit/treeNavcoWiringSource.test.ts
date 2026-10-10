// U130 tree Navco wiring: the typed override seam, letter-jump integration,
// guarded Scope routes and per-scene effective-sort adapters are present, and
// the exact native allowlist contract is untouched.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import vaultmanFrameSource from '../../src/VaultmanFrame.ts?raw';
import allowlistSource from '../../src/logic/logicTreeKeyboardAllowlist.ts?raw';
import navigationSource from '../../src/logic/logicTreeNavigation.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';

const treeScss = readFileSync(
	new URL('../../src/styles/views/_tree.scss', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

describe('Navco port on the tree view', () => {
	it('exposes navco per TreeViewOptions with native as the default', () => {
		expect(viewTreeSource).toContain('navco?: NavcoPort');
		expect(viewTreeSource).toContain('runNavcoKeyOverrides');
	});

	it('runs overrides before native and keeps the legacy extension seam', () => {
		const keydown = viewTreeSource.match(
			/_onTreeKeyDown = [\s\S]*?return this\._onTreeLetterJump\(event, modelRows, focusedId\);/,
		)?.[0];
		expect(keydown).toBeDefined();
		expect(keydown?.indexOf('runNavcoKeyOverrides') ?? -1).toBeLessThan(
			keydown?.indexOf('handleTreeKeyboardKey') ?? Number.POSITIVE_INFINITY,
		);
		expect(viewTreeSource).toContain('this._opts.keyboardExtensions');
	});

	it('jumps letters only on name-sorted levels via the reveal path', () => {
		expect(viewTreeSource).toContain('_onTreeLetterJump');
		expect(viewTreeSource).toContain('shouldLetterJump');
		expect(viewTreeSource).toContain('nextLetterTarget');
		expect(viewTreeSource).toContain('isLetterJumpKey');
		expect(navigationSource).toContain('collectSiblingMembers');
	});

	it('resets the owner-local cursor on manual focus and member changes', () => {
		expect(viewTreeSource).toContain('_letterPrevious');
		expect(viewTreeSource).toContain('rowOrderFingerprint');
	});

	it('never mutates selection from letter navigation', () => {
		const letterJump = viewTreeSource.match(
			/_onTreeLetterJump\([\s\S]*?stopPropagation\(\);/,
		)?.[0];
		expect(letterJump).toBeDefined();
		expect(letterJump).toContain('onFocus');
		expect(letterJump).not.toContain('onRangeSelect');
		expect(letterJump).not.toContain('onAdditiveSelect');
	});
});

describe('guarded Scope routes for the BODY fallback', () => {
	it('keeps the exact native allowlist contract', () => {
		expect(allowlistSource).toContain('getNativeTreeScopeChords');
		expect(allowlistSource).toContain("{ modifiers: [], key: 'ArrowDown' }");
		expect(allowlistSource).toContain('isNativeTreeKeyboardChord');
	});

	it('adds a narrow printable route beside native, never a catch-all', () => {
		expect(allowlistSource).toContain('isTreeLetterJumpChord');
		expect(allowlistSource).toContain('getTreeLetterScopeChords');
		expect(vaultmanFrameSource).toContain('getTreeLetterScopeChords');
		expect(vaultmanFrameSource).toContain('getNativeTreeScopeChords');
	});
});

describe('per-scene effective-sort adapters', () => {
	it('files/tags/props resolve parent → level → all with group-aware ownership', () => {
		for (const source of [explorerFilesSource, explorerTagsSource, explorerPropsSource]) {
			expect(source).toContain('resolveGroupAwareScope');
			expect(source).toContain('letterJump');
			expect(source).toContain('siblingScopeSort');
		}
		expect(explorerFilesSource).toContain("siblingScopeSort('files'");
		expect(explorerTagsSource).toContain("siblingScopeSort('tags'");
		expect(explorerPropsSource).toContain("siblingScopeSort('props'");
	});

	it('snippets/plugins gate on the tree-wide effective sort', () => {
		for (const source of [explorerSnippetsSource, explorerPluginsSource]) {
			expect(source).toContain('resolveGroupAwareScope');
			expect(source).toContain('letterJump');
		}
		expect(explorerSnippetsSource).toContain("activeScopeSort('snippets'");
		expect(explorerPluginsSource).toContain("activeScopeSort('plugins'");
	});
});

describe('visible focus in both native modes', () => {
	it('rings has-focus under locked and compat bridges', () => {
		expect(treeScss).toContain('.vaultman-native-tree-locked .vaultman-tree-row.has-focus');
		expect(treeScss).toContain('.vaultman-native-tree-locked .vaultman-tree-self.has-focus');
		expect(treeScss).toContain('.vaultman-native-tree-compat .vaultman-tree-self.has-focus');
	});
});

describe('smallest typed seam (no persisted policy subsystem)', () => {
	it('exports the Navco port without inventing persistence', () => {
		expect(navigationSource).toContain('NavcoPort');
		expect(navigationSource).toContain('NavcoKeyOverrides');
		expect(navigationSource).toContain('NavcoLetterJumpPort');
		expect(navigationSource).not.toContain('persist');
		expect(navigationSource).not.toContain('SASI');
	});
});
