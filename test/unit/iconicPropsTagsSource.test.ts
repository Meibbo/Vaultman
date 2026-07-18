import { describe, expect, it } from 'vitest';

import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('Iconic Props/Tags context-menu parity source guards', () => {
	it('registers only callable Iconic picker actions for root property and tag nodes', () => {
		expect(propsSource).toContain("id: 'prop.iconic-change'");
		expect(propsSource).toContain('canChangePropertyIcon()');
		expect(propsSource).toContain('openPropertyIconPicker(');
		expect(propsSource).toContain('ctx.event,');
		expect(tagsSource).toContain("id: 'tag.iconic-change'");
		expect(tagsSource).toContain('canChangeTagIcon()');
		expect(tagsSource).toContain('openTagIconPicker(meta.tagPath, ctx.event)');
	});

	it('subscribes both panels to Iconic runtime changes with cleanup and coalescing (BT4-002)', () => {
		for (const source of [propsSource, tagsSource]) {
			expect(source).toContain(
				'this.register(iconic.onLoaded(this._scheduleIconicRender))',
			);
			expect(source).toContain(
				'this.register(iconic.onChanged(this._scheduleIconicRender))',
			);
			// Coalesced: at most one render per event burst.
			expect(source).toContain('queueMicrotask');
			// No unregistered subscriptions may remain.
			expect(source).not.toContain('iconicService?.onLoaded(() =>');
			expect(source).not.toContain('iconicService?.onChanged(() =>');
		}
	});
});
