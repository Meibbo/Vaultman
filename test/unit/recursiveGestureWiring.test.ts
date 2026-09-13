import { describe, expect, it } from 'vitest';

import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import fabSource from '../../src/components/layout/navbarPillFab.svelte?raw';
import nodeSelectionSource from '../../src/logic/logicNodeSelection.ts?raw';
import typeUISource from '../../src/types/typeUI.ts?raw';
import burstSource from '../../src/utils/clickBurstGesture.ts?raw';

const explorers = [filesSource, propsSource, tagsSource];

describe('U130 recursive gesture wiring', () => {
	it('routes hold and double click through the recursive action resolver', () => {
		for (const source of explorers) {
			expect(source).toContain(
				'resolveRecursiveInteractionAction(this.interactionMode)',
			);
			expect(source).toContain("'select-descendants'");
			expect(source).toContain('this._toggleDescendantSelection(id)');
		}
	});

	it('keeps the previous expand routing for inputs other than select', () => {
		for (const source of explorers) {
			expect(source).toContain('this._expandSubtree(id');
		}
	});

	it('exposes checkbox-hold descendant selection on the tree views', () => {
		expect(propsSource).toContain('onRecursiveSelect');
		expect(tagsSource).toContain('onRecursiveSelect');
		expect(filesSource).toContain('onRecursiveSelect');
	});

	it('keeps descendant selection a pure selection rewrite, never a file operation', () => {
		expect(nodeSelectionSource).toContain('toggleDescendantSelection');
		expect(nodeSelectionSource).not.toContain('queueService');
		expect(nodeSelectionSource).not.toContain('openFile');
		expect(nodeSelectionSource).not.toContain('openLinkText');
	});

	it('cancels pending burst primaries on teardown without late callbacks', () => {
		expect(burstSource).toContain('clearTimeout');
		expect(burstSource).toContain('dispose()');
		expect(burstSource).toContain('secondary()');
	});

	it('routes the real launcher double click through the shared burst coordinator', () => {
		expect(frameSource).toContain('ClickBurstGesture');
		expect(frameSource).toContain('launcherBursts.click(');
		expect(frameSource).not.toContain('launcherTimers[key] = window.setTimeout');
	});

	it('fires exactly one secondary per burst: no native dblclick shadow path', () => {
		expect(fabSource).not.toContain('ondblclick');
		expect(fabSource).not.toContain('triggerFabDoubleClick');
		expect(fabSource).not.toContain('doubleClickAction');
		expect(fabSource).toContain('onclick');
		expect(frameSource).not.toContain('doubleClickAction');
		expect(typeUISource).not.toContain('doubleClickAction');
	});
});
