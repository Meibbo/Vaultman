import { describe, expect, it } from 'vitest';
import {
	queueActionIcon,
	queueActionLabel,
	queueChildLabel,
} from '../../../src/services/serviceQueuePresentation';
import type { PendingChange } from '../../../src/types/typeOps';

function change(partial: Partial<PendingChange> & { type: PendingChange['type'] }): PendingChange {
	return {
		id: 'op',
		files: [],
		action: partial.action ?? 'set',
		details: partial.details ?? 'queued change',
		logicFunc: () => null,
		customLogic: true,
		...partial,
	} as PendingChange;
}

describe('serviceQueuePresentation', () => {
	it('maps queue action keys to stable parent labels and icons', () => {
		expect(queueActionLabel('delete')).toBe('delete');
		expect(queueActionIcon('delete')).toBe('lucide-trash-2');
		expect(queueActionLabel('content_replace')).toBe('replace');
		expect(queueActionIcon('content_replace')).toBe('lucide-replace');
		expect(queueActionLabel('apply_template')).toBe('template');
		expect(queueActionIcon('apply_template')).toBe('lucide-book-marked');
	});

	it('labels queue child rows by object kind instead of operation wording', () => {
		expect(
			queueChildLabel(
				change({
					type: 'property',
					action: 'delete',
					property: 'status',
					oldValue: 'draft',
				}),
			),
		).toBe('value');
		expect(
			queueChildLabel(
				change({
					type: 'property',
					action: 'delete',
					property: 'status',
				}),
			),
		).toBe('property');
		expect(queueChildLabel(change({ type: 'tag', action: 'delete', tag: '#idea' }))).toBe('tag');
		expect(queueChildLabel(change({ type: 'file_delete', action: 'delete' }))).toBe('file');
		expect(queueChildLabel(change({ type: 'content_replace', action: 'replace' }))).toBe('content');
		expect(
			queueChildLabel(
				change({
					type: 'template',
					action: 'apply',
					templateFileStr: 'Template.md',
					templateContent: '',
				}),
			),
		).toBe('template');
	});
});
