import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import filesLogicSource from '../../src/logic/logicsFiles.ts?raw';
import propsLogicSource from '../../src/logic/logicProps.ts?raw';
import tagsLogicSource from '../../src/logic/logicTags.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import treeTypesSource from '../../src/types/typeTree.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

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

	it('keeps mobile drawer row geometry scoped and aligned with desktop tree variables', () => {
		const mobileRowBlock =
			stylesSource.match(
				/\.is-phone \.workspace-drawer \.workspace-leaf-content\[data-type="vaultman-frame"\] \.vaultman-tree-row\.tree-item-self\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		// U121-081: la sangria pasa a `.vaultman-tree-indent` para que el
		// cell_checkbox tenga columna. La fila conserva su padding base, y lo que
		// este guard sigue vigilando es que el movil use las variables del arbol
		// de escritorio y no un `calc` propio con numeros a mano.
		expect(mobileRowBlock).toContain(
			'padding-inline-start: var(--vaultman-tree-row-padding-start)',
		);
		expect(mobileRowBlock).not.toContain('var(--depth');
		expect(mobileRowBlock).not.toContain('calc(24px + var(--depth, 0) * 16px)');
		expect(stylesSource).not.toContain(
			'.tree-item-icon.collapse-icon svg {\n  width: 12px;',
		);
	});
});
