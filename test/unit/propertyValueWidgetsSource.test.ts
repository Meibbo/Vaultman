import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';

import rendererSource from '../../src/utils/renderPropertyValue.ts?raw';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

// `styles.css?raw` resolves to an empty string under the CSS pipeline, so the
// stylesheet is read from disk like the other stylesheet guards in this suite.
const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

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

// U121-003 shard 07. Core does not put tag colour on the pill: `app.css:11535`
// scopes it to `.metadata-property-value[data-property-type="tags"]`. Without
// that ancestor attribute a pill renders grey, so publishing the attribute is
// part of the anatomy, not a styling convenience.
describe('U121-003 shard 07 Core pill variable mapping', () => {
	it('publishes the resolved Core type on the value cell', () => {
		expect(propsExplorerSource).toContain('resolveCorePropertyWidget');
		expect(propsExplorerSource).toContain("'data-property-type'");
	});

	it('scopes the pill styling by that attribute inside Vaultman only', () => {
		expect(stylesSource).toContain(
			".vaultman-property-value-cell[data-property-type='tags']",
		);
		expect(stylesSource).toContain(
			".vaultman-property-value-cell[data-property-type='aliases']",
		);
		expect(stylesSource).toContain(
			".vaultman-property-value-cell[data-property-type='multitext']",
		);
	});

	it('maps Core variables instead of copying Core declarations', () => {
		// Every pill token must be assigned from a Core variable. A literal
		// colour, radius or weight here would be a copy of Core's stylesheet
		// and would stop following the active theme.
		const pillAssignments =
			stylesSource.match(/--pill-[a-z-]+:\s*[^;]+;/g) ?? [];
		expect(pillAssignments.length).toBeGreaterThan(0);
		for (const assignment of pillAssignments) {
			expect(assignment).toMatch(/var\(--|:\s*0;/);
		}
	});

	it('routes pill removal through the injected callback, never a vault write', () => {
		// The renderer receives a callback; the Props adapter decides that it is
		// the existing `value.delete` action. A direct import here would be a
		// second deletion path outside the queue.
		expect(rendererSource).not.toMatch(
			/from 'obsidian'.*\bVault\b|queueService|processFrontMatter|_deleteValue/,
		);
		expect(rendererSource).toContain('onRemoveValue');
		expect(propsExplorerSource).toContain("'value.delete'");
	});

	it('never restyles Core property panels outside Vaultman', () => {
		const unscoped = stylesSource.match(
			/^\.metadata-property-value[^\n]*\{/gm,
		);
		expect(unscoped).toBeNull();
	});
});
