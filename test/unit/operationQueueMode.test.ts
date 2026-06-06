import type { App } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { OperationQueueService } from '../../src/services/serviceOperationQueue';

describe('OperationQueueService operation mode', () => {
	it('defaults to staging operations', () => {
		const service = new OperationQueueService({} as App);

		expect(service.operationMode).toBe('stage');
		expect(service.shouldStageOperations).toBe(true);
	});

	it('can initialize bypass mode from persisted settings', () => {
		const service = new OperationQueueService({} as App, {
			bypassOperations: true,
		});

		expect(service.operationMode).toBe('bypass');
		expect(service.shouldStageOperations).toBe(false);
	});

	it('emits a changed event when stage bypass mode changes', () => {
		const service = new OperationQueueService({} as App);
		let changes = 0;
		service.on('changed', () => {
			changes += 1;
		});

		service.setOperationMode('bypass');

		expect(service.operationMode).toBe('bypass');
		expect(service.shouldStageOperations).toBe(false);
		expect(changes).toBe(1);

		service.setOperationMode('bypass');

		expect(changes).toBe(1);
	});
});
