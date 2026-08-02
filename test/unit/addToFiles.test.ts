import { describe, expect, it } from 'vitest';

import {
	addToFilesAvailability,
	applyAddToFile,
	type AddToFilesTarget,
} from '../../src/logic/logicAddToFiles';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';

const tagTarget: AddToFilesTarget = {
	id: 'tag:project',
	kind: 'tag',
	tag: 'project',
};
const propTarget: AddToFilesTarget = {
	id: 'prop:lugar',
	kind: 'prop',
	property: 'lugar',
};
const valueTarget: AddToFilesTarget = {
	id: 'value:lugar:cocina',
	kind: 'value',
	property: 'lugar',
	rawValue: 'cocina',
	propType: 'text',
};

// U121-003 plan shard 08 task 8.2. `Add to files` existed only as a gesture of
// `interactionMode='add'`, and its node_value branch did not exist at all: the
// guard was `action === 'add' && !meta.isValueNode`, so invoking it on a value
// added the property with an EMPTY value instead of adding the value.
describe('U121-003 Add to files: what each target kind writes', () => {
	it('appends a tag with the existing duplicate guard', () => {
		expect(applyAddToFile(tagTarget, {})).toEqual({
			status: 'written',
			frontmatter: { tags: ['project'] },
		});
		expect(applyAddToFile(tagTarget, { tags: ['other'] })).toEqual({
			status: 'written',
			frontmatter: { tags: ['other', 'project'] },
		});
		expect(applyAddToFile(tagTarget, { tags: ['project'] }).status).toBe(
			'unchanged',
		);
	});

	it('creates a property with an empty value, unchanged from today', () => {
		expect(applyAddToFile(propTarget, {})).toEqual({
			status: 'written',
			frontmatter: { lugar: '' },
		});
		// Seeding a schema is what the empty key is for, so an existing key is
		// left exactly as it is.
		expect(applyAddToFile(propTarget, { lugar: 'cocina' }).status).toBe(
			'unchanged',
		);
	});

	it('writes the value itself when the target is a value', () => {
		expect(applyAddToFile(valueTarget, {})).toEqual({
			status: 'written',
			frontmatter: { lugar: 'cocina' },
		});
	});

	it('appends into a list-valued destination with a duplicate guard', () => {
		expect(applyAddToFile(valueTarget, { lugar: ['sala'] })).toEqual({
			status: 'written',
			frontmatter: { lugar: ['sala', 'cocina'] },
		});
		expect(applyAddToFile(valueTarget, { lugar: ['cocina'] }).status).toBe(
			'unchanged',
		);
	});

	// A scalar destination that already holds a different value is the same
	// collision problem the `Move to prop...` conflict policy solves. It is
	// reported here and resolved there; it is never silently overwritten.
	it('reports a scalar collision instead of overwriting it', () => {
		const outcome = applyAddToFile(valueTarget, { lugar: 'sala' });

		expect(outcome.status).toBe('collision');
		expect(outcome.frontmatter).toBeNull();
	});

	it('keeps the written value at the property runtime type', () => {
		const numberTarget: AddToFilesTarget = {
			id: 'value:count:42',
			kind: 'value',
			property: 'count',
			rawValue: '42',
			propType: 'number',
		};
		const checkboxTarget: AddToFilesTarget = {
			id: 'value:done:true',
			kind: 'value',
			property: 'done',
			rawValue: 'true',
			propType: 'checkbox',
		};

		expect(applyAddToFile(numberTarget, {}).frontmatter?.count).toBe(42);
		expect(applyAddToFile(checkboxTarget, {}).frontmatter?.done).toBe(true);
	});
});

describe('U121-003 Add to files: when the operation is offered', () => {
	it('states the destination count so the blast radius is visible', () => {
		const availability = addToFilesAvailability([valueTarget], 412);

		expect(availability.available).toBe(true);
		expect(availability.enabled).toBe(true);
		expect(availability.destinationCount).toBe(412);
	});

	// A missing entry reads as a bug; a disabled one states the reason.
	it('stays visible but disabled when the filter result is empty', () => {
		const availability = addToFilesAvailability([valueTarget], 0);

		expect(availability.available).toBe(true);
		expect(availability.enabled).toBe(false);
		expect(availability.destinationCount).toBe(0);
	});

	it('offers the operation for tag, prop and value target sets', () => {
		for (const target of [tagTarget, propTarget, valueTarget]) {
			expect(addToFilesAvailability([target], 3).available).toBe(true);
		}
	});

	it('carries several targets of the same kind in one invocation', () => {
		const second: AddToFilesTarget = {
			id: 'value:lugar:sala',
			kind: 'value',
			property: 'lugar',
			rawValue: 'sala',
			propType: 'text',
		};

		expect(addToFilesAvailability([valueTarget, second], 3).available).toBe(
			true,
		);
	});

	// Per the intersection rule of shard 03: add semantics differ per kind, so a
	// mixed set has no single operation to offer.
	it('is hidden when the target set mixes kinds', () => {
		const availability = addToFilesAvailability([valueTarget, propTarget], 3);

		expect(availability.available).toBe(false);
		expect(availability.kind).toBeNull();
	});

	it('is hidden for an empty target set', () => {
		expect(addToFilesAvailability([], 3).available).toBe(false);
	});
});

describe('U121-003 Add to files: how the providers offer it', () => {
	it('registers the operation on prop, value and tag nodes', () => {
		expect(propsExplorerSource).toContain("id: 'prop.add-to-files'");
		expect(propsExplorerSource).toContain("nodeTypes: ['prop', 'value']");
		expect(tagsExplorerSource).toContain("id: 'tag.add-to-files'");
	});

	// `filteredFiles` is already markdown-only: `applyFilters` intersects with
	// `getMarkdownFiles()` and keeps the non-markdown superset separately in
	// `filteredVaultFiles`. Using the right list IS the markdown-only rule.
	it('writes into filteredFiles and never into filteredVaultFiles', () => {
		for (const source of [propsExplorerSource, tagsExplorerSource]) {
			const addToFiles = source.slice(source.indexOf('_addToFiles('));
			expect(addToFiles).toContain('filterService.filteredFiles');
		}
		expect(propsExplorerSource).not.toContain('filteredVaultFiles');
		expect(tagsExplorerSource).not.toContain('filteredVaultFiles');
	});

	it('builds its target set from the shared operation target contract', () => {
		expect(propsExplorerSource).toContain('buildOperationTargetSet');
		expect(tagsExplorerSource).toContain('buildOperationTargetSet');
	});

	// The menu path is added beside the gesture, not instead of it.
	it('keeps the interactionMode add gesture', () => {
		expect(propsExplorerSource).toContain("action === 'add'");
		expect(tagsExplorerSource).toContain("action === 'add'");
	});

	it('states the destination count in both locales', () => {
		expect(en['explorer.ctx.add_to_files']).toBe('Add to {count} files');
		expect(es['explorer.ctx.add_to_files']).toBe('Agregar a {count} archivos');
		expect(en['explorer.ctx.add_to_files.empty']).toBeTruthy();
		expect(es['explorer.ctx.add_to_files.empty']).toBeTruthy();
	});
});
