import { describe, expect, it } from 'vitest';


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
	// U121-003 re-pointed this guard, and did not weaken it. The two date
	// renderers were merged into one that computes its type and class from the
	// kind, so the literals it used to match no longer appear in the source. The
	// contract it protects — Core's own input types and classes — is asserted
	// against the rendered DOM in `propertyValueRenderMap.test.ts`; what stays
	// here is the source-level half those DOM tests cannot see.
	it('uses Core this-file-properties widget classes and input types', () => {
		expect(rendererSource).toContain("'datetime-local'");
		expect(rendererSource).toContain('metadata-input metadata-input-text mod-');
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
describe('U121-003 shard 07 third-party decoration bridge', () => {
	// Property plugins (pretty-properties, typify) find values by querying
	// `.bases-rendered-value[data-property-type=...]`, `.value-list-element` and
	// `a.tag`. Emitting Core's Bases anatomy is the whole bridge: rendering the
	// file-properties `.multi-select-pill` instead left those values undecorated
	// in the explorer while the same plugin decorated them everywhere else.
	// U121-003 shard 9.3 re-pointed this pair, and did not weaken it: the
	// renderer now owns publishing on `propertyAttributeContainer` (the Cell
	// root for Cells, `.metadata-property-value` for the reveal anatomy), so
	// every caller publishes instead of just this one. The Props adapter still
	// has to pass the key through for the attribute to appear.
	it('publishes both attributes those plugins select on', () => {
		expect(propsExplorerSource).toContain('resolveCorePropertyWidget');
		expect(rendererSource).toContain("'data-property-type'");
		expect(rendererSource).toContain("'data-property-key'");
		expect(propsExplorerSource).toContain('propertyKey: node.meta.propName');
	});

	it('renders the Bases value anatomy, not the file-properties one', () => {
		expect(rendererSource).toContain("cls: 'value-list-container'");
		expect(rendererSource).toContain("cls: 'value-list-element'");
		expect(rendererSource).toContain("cls: 'tag'");
		expect(rendererSource).not.toContain('multi-select-pill');
		expect(rendererSource).not.toContain('multi-select-container');
	});

	it('leaves no pill variable mapping behind in the stylesheet', () => {
		// The `--pill-*` mapping belongs to the file-properties context, which
		// arrives with the reveal mode in shard 09, not to this cell.
		expect(stylesSource).not.toMatch(/--pill-[a-z-]+:/);
	});

	it('adds no box, type change or padding of its own to the cell', () => {
		const cell =
			stylesSource.match(/\.vaultman-property-value-cell \{[^}]+\}/)?.[0] ?? '';
		expect(cell).toContain('padding: 0');
		expect(cell).toContain('font-size: inherit');
		// Core's own `.bases-rendered-value` sizing is for a Bases table cell.
		expect(cell).not.toMatch(/background|border(?!-)/);
	});

	it('renders scalars without any metadata input widget', () => {
		expect(rendererSource).not.toContain('metadata-input-longtext');
		expect(rendererSource).not.toContain('metadata-input-number');
	});

	it('marks date and datetime with the attribute Core collapses on', () => {
		expect(rendererSource).toContain("disabled: 'true'");
		expect(rendererSource).not.toContain('readOnly');
	});

	it('routes value removal through the injected callback, never a vault write', () => {
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
