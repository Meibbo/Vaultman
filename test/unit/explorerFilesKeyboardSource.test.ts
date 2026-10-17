import { describe, expect, it } from 'vitest';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

describe('FilesExplorerPanel keyboard and clipboard parity', () => {
	it('keeps pending paste operations inside the existing queue policy without direct vault writes', () => {
		const paste = explorerFilesSource.split('handlePaste(event: ClipboardEvent)')[1]?.split('private _collectClipboardTargetPaths')[0] ?? '';
		expect(paste).toContain('buildNodeMoveQueueChanges');
		expect(paste).toContain('stageNodeMovePlan');
		expect(paste).not.toMatch(/vault\.(copy|rename)\(/);
	});
	it('registers with tree clipboard boundary on load', () => {
		expect(explorerFilesSource).toContain('registerTreeClipboardHandler(this.containerEl, this)');
	});

	it('implements TreeClipboardHandler interface (copy, cut, paste)', () => {
		expect(explorerFilesSource).toContain('implements TreeClipboardHandler');
		expect(explorerFilesSource).toContain('handleCopy(event: ClipboardEvent)');
		expect(explorerFilesSource).toContain('handleCut(event: ClipboardEvent)');
		expect(explorerFilesSource).toContain('handlePaste(event: ClipboardEvent)');
		expect(explorerFilesSource).toContain('OBSIDIAN_FILES_MIME');
		expect(explorerFilesSource).toContain('serializeObsidianFilesClipboard');
		expect(explorerFilesSource).toContain('parseObsidianFilesClipboard');
	});

	it('routes Mod+Enter to open file in new leaf/tab instead of toggling selection', () => {
		const activateBlock = explorerFilesSource.match(
			/onKeyboardActivate:\s*\(id:\s*string,\s*modifiers\)\s*=>\s*\{[\s\S]*?onRangeSelect:/,
		)?.[0];
		expect(activateBlock).toBeDefined();
		expect(activateBlock).toContain('modifiers.ctrl || modifiers.meta');
		expect(activateBlock).toContain("workspace.getLeaf?.('tab')");
		expect(activateBlock).toContain('workspace.setActiveLeaf');
		expect(activateBlock).not.toContain('fileSelectionGesture');
	});

	it('opens file in background on Mod+Arrow navigation without stealing focus', () => {
		expect(explorerFilesSource).toContain('onModStepOpen: (id: string) =>');
		const modStepBlock = explorerFilesSource.match(
			/onModStepOpen:\s*\(id:\s*string\)\s*=>\s*\{[\s\S]*?onDeleteRequest:/,
		)?.[0];
		expect(modStepBlock).toBeDefined();
		expect(modStepBlock).toContain('workspace.getUnpinnedLeaf');
		expect(modStepBlock).toContain('active: false');
	});

	it('provides additive Shift selection step', () => {
		expect(explorerFilesSource).toContain('onAdditiveSelect: (previousId: string, currentId: string) =>');
		const additiveBlock = explorerFilesSource.match(
			/onAdditiveSelect:\s*\(previousId:\s*string,\s*currentId:\s*string\)\s*=>\s*\{[\s\S]*?onClearSelection:/,
		)?.[0];
		expect(additiveBlock).toBeDefined();
		expect(additiveBlock).toContain('next.add(previousId)');
		expect(additiveBlock).toContain('next.add(currentId)');
	});

	it('prompts deletion via existing queue policy when Delete / Mod+Backspace is pressed', () => {
		expect(explorerFilesSource).toContain('onDeleteRequest: (id: string) =>');
		expect(explorerFilesSource).toContain('this._onDeleteKeyRequest');
		expect(explorerFilesSource).toContain('this._queueDeleteTargets(targets)');
	});

	it('exposes visual cut state for nodes via isItemCut', () => {
		expect(explorerFilesSource).toContain('isItemCut: (id: string) =>');
		expect(explorerFilesSource).toContain('this._cutPaths.has');
	});
});
