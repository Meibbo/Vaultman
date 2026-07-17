import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('recursive expand input source guards', () => {
	it('recognizes hold on both hierarchical row renderers', () => {
		for (const source of [treeSource, nodeTableSource]) {
			expect(source).toContain('onRecursiveExpand?: (id: string) => void');
			expect(source).toContain('LongPressGesture');
			expect(source).toContain('isActivationSuppressed()');
		}
	});

	it('routes recursive expansion through every hierarchical explorer', () => {
		for (const source of [
			explorerFilesSource,
			explorerPropsSource,
			explorerTagsSource,
		]) {
			expect(source).toContain('onRecursiveExpand:');
			expect(source).toContain('collectExpandableSubtreeIds');
		}
	});
});
