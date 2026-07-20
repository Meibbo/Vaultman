import { describe, expect, it } from 'vitest';

import {
	buildFilterTemplatePreview,
	buildQueueTemplatePreview,
	buildSavedLayoutPreview,
	type PayloadPreview,
} from '../../src/logic/logicPayloadPreview';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import modalSource from '../../src/modals/modalPayloadPreview.ts?raw';

function section(preview: PayloadPreview, id: string) {
	const match = preview.sections.find((candidate) => candidate.id === id);
	expect(match, `missing section ${id}`).toBeDefined();
	return match!;
}

function row(preview: PayloadPreview, sectionId: string, key: string) {
	const match = section(preview, sectionId).rows.find(
		(candidate) => candidate.key === key,
	);
	expect(match, `missing row ${sectionId}.${key}`).toBeDefined();
	return match!;
}

describe('BT5-020 normalized payload previews', () => {
	it('previews a complete filter tree with load-time defaults and future fields', () => {
		const template = {
			name: 'Focus',
			futureTop: { revision: 2 },
			root: {
				type: 'group',
				logic: 'all',
				id: null,
				enabled: null,
				children: [
					{
						type: 'rule',
						filterType: 'folder',
						property: '',
						values: ['Projects'],
						futureMode: 'strict',
					},
				],
			},
		};
		const before = structuredClone(template);

		const preview = buildFilterTemplatePreview(template);

		expect(preview.kind).toBe('filter');
		expect(preview.sections.map((item) => item.id)).toEqual([
			'overview',
			'filter:root',
			'filter:root.1',
		]);
		expect(row(preview, 'filter:root', 'enabled')).toMatchObject({
			value: 'true',
			status: 'default',
			note: 'default-applied',
		});
		expect(row(preview, 'filter:root', 'id')).toMatchObject({
			status: 'default',
			note: 'generated-on-load',
		});
		expect(row(preview, 'filter:root.1', 'futureMode')).toMatchObject({
			value: 'strict',
			status: 'warning',
			note: 'unknown-field',
		});
		expect(row(preview, 'overview', 'futureTop')).toMatchObject({
			value: '{"revision":2}',
			status: 'warning',
		});
		expect(preview.warningCount).toBe(2);
		expect(template).toEqual(before);
	});

	it('previews every queue operation without resolving or loading the target', () => {
		const template = {
			name: 'Cleanup',
			changes: [
				{
					type: 'property',
					action: 'set',
					property: 'status',
					value: 'done',
					details: 'Set status',
				},
				{
					type: 'content_replace',
					find: 'old',
					replace: 'new',
					details: 'Replace content',
					futureEngine: 'v2',
				},
				{
					type: 'future_operation',
					prompt: 'Do something later',
				},
				{
					type: 'property',
					action: 'change_type',
					property: 'published',
					details: 'Set native type',
				},
			],
		};
		const before = structuredClone(template);

		const preview = buildQueueTemplatePreview(template);

		expect(preview.sections.map((item) => item.id)).toEqual([
			'overview',
			'operation:1',
			'operation:2',
			'operation:3',
			'operation:4',
		]);
		expect(row(preview, 'overview', 'target')).toMatchObject({
			status: 'default',
			note: 'resolved-on-load',
		});
		expect(row(preview, 'operation:2', 'isRegex')).toMatchObject({
			value: 'false',
			status: 'default',
		});
		expect(row(preview, 'operation:2', 'caseSensitive')).toMatchObject({
			value: 'false',
			status: 'default',
		});
		expect(row(preview, 'operation:2', 'futureEngine')).toMatchObject({
			status: 'warning',
			note: 'unknown-field',
		});
		expect(row(preview, 'operation:3', 'type')).toMatchObject({
			value: 'future_operation',
			status: 'warning',
			note: 'unknown-value',
		});
		expect(row(preview, 'operation:3', 'prompt')).toMatchObject({
			status: 'warning',
			note: 'unknown-field',
		});
		expect(row(preview, 'operation:4', 'value')).toMatchObject({
			value: 'text',
			status: 'default',
			note: 'default-applied',
		});
		expect(preview.warningCount).toBe(3);
		expect(template).toEqual(before);
	});

	it('previews saved layouts in stable tab order with effective migrations', () => {
		const layout = {
			name: 'Writing',
			summary: 'Legacy layout',
			config: {
				files: {
					viewMode: 'grid',
					visibleCells: ['name', 'nested'],
					sortState: {
						sortBy: 'date',
						direction: 'desc',
						nodeTypeFilter: null,
					},
					futureSurface: 'wide',
				},
				tags: {
					viewMode: 'tree',
					visibleCells: ['icon', 'text', 'nested', 'future-cell'],
					interactionMode: 'teleport',
					sortState: {
						sortBy: 'future-sort',
						direction: 'desc',
					},
				},
				futureExplorer: {
					viewMode: 'hologram',
					visibleCells: ['future'],
					sortState: {},
				},
			},
			floatingToc: {
				enabled: true,
				kind: 'future-kind',
				rootId: 'folder:Projects',
				futureGlow: true,
			},
			futureLayout: 4,
		};
		const before = structuredClone(layout);

		const preview = buildSavedLayoutPreview(layout);

		expect(preview.sections.map((item) => item.id)).toEqual([
			'overview',
			'floating-toc',
			'layout:files',
			'layout:props',
			'layout:tags',
			'layout:snippets',
			'layout:plugins',
			'layout:futureExplorer',
		]);
		expect(row(preview, 'layout:files', 'viewMode')).toMatchObject({
			value: 'cards',
			status: 'default',
			note: 'migration-applied',
		});
		expect(
			row(preview, 'layout:files', 'sortState.sorts.all.sortBy'),
		).toMatchObject({
			value: 'mtime',
			status: 'default',
			note: 'migration-applied',
		});
		expect(row(preview, 'layout:props', 'result')).toMatchObject({
			status: 'default',
			note: 'unchanged',
		});
		expect(row(preview, 'floating-toc', 'kind')).toMatchObject({
			value: 'future-kind → folders',
			status: 'warning',
			note: 'unknown-value',
		});
		expect(row(preview, 'floating-toc', 'futureGlow')).toMatchObject({
			status: 'warning',
		});
		expect(row(preview, 'layout:futureExplorer', 'viewMode')).toMatchObject({
			status: 'warning',
			note: 'unknown-field',
		});
		expect(row(preview, 'layout:tags', 'interactionMode')).toMatchObject({
			value: 'teleport → filter',
			status: 'warning',
			note: 'unknown-value',
		});
		expect(row(preview, 'layout:tags', 'visibleCells')).toMatchObject({
			value: '["icon","text","nested","future-cell"]',
			status: 'warning',
			note: 'unknown-value',
		});
		expect(
			row(preview, 'layout:tags', 'sortState.sorts.all.sortBy'),
		).toMatchObject({
			value: 'future-sort → name',
			status: 'warning',
			note: 'unknown-value',
		});
		expect(row(preview, 'overview', 'futureLayout')).toMatchObject({
			status: 'warning',
		});
		expect(preview.warningCount).toBeGreaterThanOrEqual(4);
		expect(layout).toEqual(before);
	});

	it('does not disguise payload shapes that the real loaders cannot consume', () => {
		const filter = buildFilterTemplatePreview({
			name: 'Broken filters',
			root: { type: 'group', logic: 'all', children: null },
		});
		const queue = buildQueueTemplatePreview({
			name: 'Broken queue',
			changes: null,
		});
		const layout = buildSavedLayoutPreview({
			name: 'Broken layout',
			config: null,
		});
		const invalidCells = buildSavedLayoutPreview({
			name: 'Broken cells',
			config: {
				files: {
					viewMode: 'tree',
					visibleCells: 'name',
					sortState: {},
				},
			},
		});

		expect(row(filter, 'filter:root', 'children')).toMatchObject({
			status: 'warning',
			note: 'invalid-shape',
		});
		expect(row(queue, 'overview', 'operations')).toMatchObject({
			status: 'warning',
			note: 'invalid-shape',
		});
		expect(row(layout, 'overview', 'config')).toMatchObject({
			status: 'warning',
			note: 'invalid-shape',
		});
		expect(row(invalidCells, 'layout:files', 'visibleCells')).toMatchObject({
			value: 'name',
			status: 'warning',
			note: 'invalid-shape',
		});
	});

	it('is deterministic even when unknown object keys arrive in another order', () => {
		const first = buildFilterTemplatePreview({
			name: 'A',
			zeta: 1,
			alpha: 2,
			root: { type: 'group', logic: 'all', children: [] },
		});
		const second = buildFilterTemplatePreview({
			root: { children: [], logic: 'all', type: 'group' },
			alpha: 2,
			zeta: 1,
			name: 'A',
		});

		expect(first).toEqual(second);
		expect(
			section(first, 'overview')
				.rows.slice(-2)
				.map((item) => item.key),
		).toEqual(['alpha', 'zeta']);
	});
});

describe('BT5-020 settings and modal wiring', () => {
	it('localizes every preview control, section, and note in English and Spanish', () => {
		const keys = [
			'payload_preview.view',
			'payload_preview.view_aria',
			'payload_preview.title',
			'payload_preview.read_only',
			'payload_preview.warning_count',
			'payload_preview.close',
			'payload_preview.section.overview',
			'payload_preview.section.floating_toc',
			'payload_preview.section.root_filter',
			'payload_preview.section.filter',
			'payload_preview.section.operation',
			'payload_preview.note.default_applied',
			'payload_preview.note.generated_on_load',
			'payload_preview.note.ignored_field',
			'payload_preview.note.invalid_shape',
			'payload_preview.note.migration_applied',
			'payload_preview.note.missing_field',
			'payload_preview.note.resolved_on_load',
			'payload_preview.note.unchanged',
			'payload_preview.note.unknown_field',
			'payload_preview.note.unknown_value',
		] as const;

		for (const key of keys) {
			expect(en[key], `missing English key ${key}`).toBeTruthy();
			expect(es[key], `missing Spanish key ${key}`).toBeTruthy();
		}
		for (const key of [
			'sort.by.state',
			'sort.by.type',
			'sort.type.datetime',
		] as const) {
			expect(en[key], `missing English key ${key}`).toBeTruthy();
			expect(es[key], `missing Spanish key ${key}`).toBeTruthy();
		}
	});

	it('adds a distinct View action to all three preset rows', () => {
		expect(settingsSource).toContain('PayloadPreviewModal');
		expect(settingsSource).toContain('buildFilterTemplatePreview(template)');
		expect(settingsSource).toContain('buildQueueTemplatePreview(template)');
		expect(settingsSource).toContain('buildSavedLayoutPreview(layout)');
		expect(
			settingsSource.match(
				/setButtonText\(translate\('payload_preview\.view'\)\)/g,
			),
		).toHaveLength(3);
		// Existing destructive management actions remain separate.
		expect(
			settingsSource.match(
				/setButtonText\(translate\('filter\.template\.delete'\)\)/g,
			),
		).toHaveLength(2);
		expect(settingsSource).toContain(
			"setButtonText(translate('settings.saved_view_config.clear'))",
		);
	});

	it('keeps the preview modal read-only and keyboard-accessible', () => {
		expect(modalSource).toContain("translate('payload_preview.read_only')");
		expect(modalSource).toContain("translate('payload_preview.close')");
		expect(modalSource).toContain("row.status === 'warning'");
		expect(modalSource).toContain("setAttribute('role', 'note')");
		expect(modalSource).not.toMatch(
			/loadTemplate|loadQueueTemplate|loadLayout|saveSettings|saveData/,
		);
	});
});
