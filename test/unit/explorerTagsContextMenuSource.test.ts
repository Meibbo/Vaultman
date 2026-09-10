import { describe, expect, it } from 'vitest';

import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';

describe('Tags explorer context-menu source guards', () => {
	it('offers clean this filter for an already active polarity', () => {
		expect(tagsExplorerSource).toContain(
			"getFilterState('tag', `#${meta.tagPath}`)",
		);
		expect(tagsExplorerSource).toContain("translate('explorer.ctx.filter_clean')");
		expect(tagsExplorerSource).toContain("=== 'included' ? 'none' : 'inclusive'");
		expect(tagsExplorerSource).toContain("=== 'excluded' ? 'none' : 'exclusive'");
	});
});
