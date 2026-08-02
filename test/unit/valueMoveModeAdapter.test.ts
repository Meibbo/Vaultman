import { describe, expect, it } from 'vitest';

import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import queueDetailsSource from '../../src/modals/modalQueueDetails.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

/**
 * The adapter owns the machine instance and nothing else: every decision it
 * makes must come from the pure modules, so these guards name them.
 */
describe('the Move to prop... adapter in the Props explorer', () => {
	it('enters from a value node and never from a property node', () => {
		const entry = propsExplorerSource.slice(
			propsExplorerSource.indexOf("id: 'prop.move-to-prop'"),
			propsExplorerSource.indexOf("id: 'prop.move-to-prop.proceed'"),
		);
		expect(entry).not.toBe('');
		expect(entry).toContain("nodeTypes: ['value']");
		expect(entry).toContain("translate('explorer.ctx.move_to_prop')");
	});

	it('offers Proceed in the node_prop menu under the same guard as the toolbar', () => {
		const proceed = propsExplorerSource.slice(
			propsExplorerSource.indexOf("id: 'prop.move-to-prop.proceed'"),
		);
		expect(proceed).toContain("nodeTypes: ['prop']");
		expect(proceed).toContain('_valueMoveProceedAvailable()');
	});

	it('drives its lifecycle through the pure reducer', () => {
		for (const symbol of [
			'enterValueMoveMode',
			'exitValueMoveMode',
			'selectValueMoveDestination',
			'toggleValueMoveWrite',
			'toggleValueMoveOriginDisposition',
			'buildValueMoveOperations',
			'proceedEnabled',
			'reconcileValueMoveOwner',
		]) {
			expect(propsExplorerSource).toContain(symbol);
		}
	});

	it('forces select on enter and restores what it captured on exit', () => {
		const enter = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _enterValueMoveMode('),
			propsExplorerSource.indexOf('private _exitValueMoveMode('),
		);
		expect(enter).not.toBe('');
		expect(enter).toContain("this.interactionMode = 'select'");

		const exit = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _exitValueMoveMode('),
		);
		expect(exit).toContain('exitValueMoveMode');
		expect(exit).toContain('restore.interactionMode');
	});

	it('dies with its owner and with the explorer', () => {
		// A pending invisible operation in another provider cannot be reasoned
		// about, so the mode does not survive a provider or generation change.
		expect(propsExplorerSource).toContain('reconcileValueMoveOwner');
		const unload = propsExplorerSource.slice(
			propsExplorerSource.indexOf('onunload(): void {'),
			propsExplorerSource.indexOf('private interactionMode'),
		);
		expect(unload).toContain('_exitValueMoveMode');
	});

	it('registers destinations through selection, not a second picker', () => {
		expect(propsExplorerSource).not.toContain('MoveToPropModal');
		expect(propsExplorerSource).not.toContain('destinationPicker');
		const selection = propsExplorerSource.slice(
			propsExplorerSource.indexOf("if (action === 'select')"),
		);
		expect(selection.slice(0, 600)).toContain('_registerValueMoveDestination');
	});

	it('decides every destination through the conflict policy', () => {
		expect(propsExplorerSource).toContain('decidePropMoveConflict');
		expect(propsExplorerSource).toContain('normalizePropMoveTypeConflict');
		expect(propsExplorerSource).toContain('applyValueMove');
	});

	it('stages through the queue and never writes the type itself', () => {
		const proceed = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _proceedValueMove('),
		);
		expect(proceed).toContain('queueService.addOrRun');
		expect(proceed).not.toContain('propertyTypeService.setType');
		expect(propsExplorerSource).toContain('NATIVE_SET_PROP_TYPE');
	});

	it('requires an explicit summary before bypass executes a composed move', () => {
		const proceed = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _proceedValueMove('),
		);
		// Bypass runs immediately and has no queue to review, so the summary is
		// the only place the consequences can be read before they happen.
		expect(proceed).toContain("operationMode === 'bypass'");
		expect(proceed).toContain('OperationSummaryModal');
	});

	it('queues the declared coercion so it reaches types.json', () => {
		// A summary that declares `buscar: date -> list` and then does not change
		// the type would be a lie the user cannot see.
		const proceed = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _proceedValueMove('),
		);
		expect(proceed).toContain('planValueMoveTypeChanges');
		expect(proceed).toContain("action: 'change_type'");
		expect(proceed).toContain('NATIVE_SET_PROP_TYPE');
		expect(proceed).toContain('toNativePropType');
	});

	it('lets the queue review switch bypass from where the consequences are read', () => {
		expect(queueDetailsSource).toContain('setOperationMode');
		expect(queueDetailsSource).toContain("translate('settings.bypass_operations')");
		expect(queueDetailsSource).toContain('addToggle');
		expect(queueDetailsSource).toContain("operationMode === 'bypass'");
	});

	it('localizes every string the mode shows', () => {
		for (const key of [
			'explorer.ctx.move_to_prop',
			'explorer.ctx.move_to_prop.proceed',
			'explorer.ctx.move_to_prop.cancel',
			'explorer.move_to_prop.write.append',
			'explorer.move_to_prop.write.replace',
			'explorer.move_to_prop.origin.move',
			'explorer.move_to_prop.origin.copy',
		] as const) {
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
			expect(es[key]).not.toBe(en[key]);
		}
	});
});
