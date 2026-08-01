import { describe, expect, it } from 'vitest';

import rendererSource from '../../src/utils/renderPropertyValue.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

describe('U121-007 Core property value widgets', () => {
	it('uses Core this-file-properties widget classes and input types', () => {
		expect(rendererSource).toContain("type: 'date'");
		expect(rendererSource).toContain("type: 'datetime-local'");
		expect(rendererSource).toContain(
			"cls: 'metadata-input metadata-input-text mod-date'",
		);
		expect(rendererSource).toContain(
			"cls: 'metadata-input metadata-input-text mod-datetime'",
		);
		expect(rendererSource).toContain("cls: 'metadata-input-checkbox'");
		expect(rendererSource).toContain("setIcon(dailyNote, 'lucide-link')");
	});

	it('uses the concise Format label in both languages', () => {
		expect(enSource).toContain("'viewmode.pill.format': 'Format'");
		expect(esSource).toContain("'viewmode.pill.format': 'Formato'");
	});
});
