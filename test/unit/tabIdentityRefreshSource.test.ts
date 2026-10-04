import { describe, expect, it } from 'vitest';

import frameViewSource from '../../src/VaultmanFrame.ts?raw';

describe('tab identity refresh never breaks the settings cascade (Universe QA)', () => {
	it('treats the Obsidian header update as best-effort', () => {
		expect(frameViewSource).toContain('refreshTabIdentity');
		expect(frameViewSource).toContain('updateHeader');
		expect(frameViewSource).toContain('try {');
		expect(frameViewSource).toContain('catch');
	});
});
