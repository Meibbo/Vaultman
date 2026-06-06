import { describe, expect, it } from 'vitest';

import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('explorer setter source guards', () => {
	it('keeps repeated Files explorer setter calls from re-rendering', () => {
		expect(filesSource).toContain('function sameStringSet');
		expect(filesSource).toContain('if (this.viewMode === mode) return;');
		expect(filesSource).toContain('if (sameStringSet(this.visibleCells, cells)) return;');
		expect(filesSource).toContain(
			'const normalizedSortBy = normalizeExplorerSortBy(sortBy);',
		);
		expect(filesSource).toContain(
			'if (this.sortBy === normalizedSortBy && this.sortDir === direction) return;',
		);
		expect(filesSource).toContain(
			'if (this.searchName === name && this.searchFolder === folder) return;',
		);
	});

	it('keeps repeated Props explorer setter calls from re-rendering', () => {
		expect(propsSource).toContain('function sameStringSet');
		expect(propsSource).toContain(
			'if (this.searchTerm === term && this.searchMode === mode) return;',
		);
		expect(propsSource).toContain('if (this.viewMode === mode) return;');
		expect(propsSource).toContain('if (sameStringSet(this.visibleCells, cells)) return;');
		expect(propsSource).toContain('this.sortChildLevel === childLevel');
		expect(propsSource).toContain('this.nodeTypeFilter === nodeTypeFilter');
	});

	it('keeps repeated Tags explorer setter calls from re-rendering', () => {
		expect(tagsSource).toContain('function sameStringSet');
		expect(tagsSource).toContain(
			'if (this.searchTerm === term && this.searchMode === mode) return;',
		);
		expect(tagsSource).toContain('if (this.viewMode === mode) return;');
		expect(tagsSource).toContain('if (sameStringSet(this.visibleCells, cells)) return;');
		expect(tagsSource).toContain('this.sortChildLevel === childLevel');
		expect(tagsSource).toContain('this.nodeTypeFilter === nodeTypeFilter');
	});
});
