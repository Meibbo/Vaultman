import { describe, expect, it } from 'vitest';

import filesLogicSource from '../../src/logic/logicsFiles.ts?raw';
import propsLogicSource from '../../src/logic/logicProps.ts?raw';
import tagsLogicSource from '../../src/logic/logicTags.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import treeTypesSource from '../../src/types/typeTree.ts?raw';

describe('mobile core row source guards', () => {
	it('carries native row classes in the shared tree node contract', () => {
		expect(treeTypesSource).toContain('coreCls?: string');
		expect(treeSource).toContain('node.coreCls');
		expect(treeSource).toContain('applyCoreRowClasses');
	});

	it('marks file, tag and property nodes with Obsidian core row classes', () => {
		expect(filesLogicSource).toContain(
			'tree-item-self nav-folder-title is-clickable',
		);
		expect(filesLogicSource).toContain(
			'tree-item-self nav-file-title tappable is-clickable',
		);
		expect(tagsLogicSource).toContain(
			'tree-item-self tag-pane-tag is-clickable',
		);
		expect(propsLogicSource).toContain('tree-item-self tappable is-clickable');
	});
});
