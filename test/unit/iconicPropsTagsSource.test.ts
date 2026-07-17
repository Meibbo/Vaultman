import { describe, expect, it } from 'vitest';

import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('Iconic Props/Tags context-menu parity source guards', () => {
	it('registers only callable Iconic picker actions for root property and tag nodes', () => {
		expect(propsSource).toContain("id: 'prop.iconic-change'");
		expect(propsSource).toContain('canChangePropertyIcon()');
		expect(propsSource).toContain('openPropertyIconPicker(ctx.node.label)');
		expect(tagsSource).toContain("id: 'tag.iconic-change'");
		expect(tagsSource).toContain('canChangeTagIcon()');
		expect(tagsSource).toContain('openTagIconPicker(meta.tagPath)');
	});

	it('subscribes both panels to Iconic runtime changes', () => {
		expect(propsSource).toContain('iconicService?.onChanged');
		expect(tagsSource).toContain('iconicService?.onChanged');
	});
});
