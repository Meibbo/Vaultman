import type { App, TFile } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import mainSource from '../../src/main.ts?raw';
import { FilterService } from '../../src/services/serviceFilter';
import type { FilterType } from '../../src/types/typeFilter';

type EventCallback = (...args: unknown[]) => void;

function createEventHub() {
	const callbacks = new Map<string, Set<EventCallback>>();
	return {
		listenerCount: (name: string) => callbacks.get(name)?.size ?? 0,
		on: (name: string, callback: EventCallback) => {
			if (!callbacks.has(name)) callbacks.set(name, new Set());
			callbacks.get(name)?.add(callback);
			return {};
		},
		trigger: (name: string, ...args: unknown[]) => {
			for (const callback of callbacks.get(name) ?? []) callback(...args);
		},
	};
}

function makeApp() {
	const metadataEvents = createEventHub();
	const vaultEvents = createEventHub();
	const files: TFile[] = [];
	const app = {
		metadataCache: {
			getFileCache: () => null,
			on: metadataEvents.on,
		},
		vault: {
			getFiles: () => files,
			getMarkdownFiles: () => files,
			on: vaultEvents.on,
		},
	} as unknown as App;
	return { app, metadataEvents, vaultEvents };
}

const metadataFilterTypes: FilterType[] = [
	'has_property',
	'missing_property',
	'specific_value',
	'multiple_values',
	'has_tag',
];

describe('FilterService metadata refresh backpressure', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('window', { clearTimeout, setTimeout });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('does not subscribe basename sort-cache invalidation to vault modify', () => {
		const { app, vaultEvents } = makeApp();
		const service = new FilterService(app);

		service.onload();

		expect(vaultEvents.listenerCount('create')).toBe(1);
		expect(vaultEvents.listenerCount('delete')).toBe(1);
		expect(vaultEvents.listenerCount('rename')).toBe(1);
		expect(vaultEvents.listenerCount('modify')).toBe(0);
	});

	it.each(metadataFilterTypes)(
		'coalesces repeated refreshes for a nested enabled %s rule',
		(filterType) => {
			const { app } = makeApp();
			const service = new FilterService(app);
			const applyFilters = vi.spyOn(service, 'applyFilters');
			service.activeFilter = {
				type: 'group',
				logic: 'all',
				enabled: true,
				children: [
					{
						type: 'group',
						logic: 'any',
						enabled: true,
						children: [
							{
								type: 'rule',
								filterType,
								property: 'status',
								values: ['active'],
								enabled: true,
							},
						],
					},
				],
			};

			service.scheduleMetadataRefresh();
			service.scheduleMetadataRefresh();
			service.scheduleMetadataRefresh();
			expect(applyFilters).not.toHaveBeenCalled();

			vi.runAllTimers();
			expect(applyFilters).toHaveBeenCalledTimes(1);
		},
	);

	it('coalesces metadata changed events when a metadata filter is active', () => {
		const { app, metadataEvents } = makeApp();
		const service = new FilterService(app);
		service.activeFilter.children = [
			{
				type: 'rule',
				filterType: 'has_property',
				property: 'status',
				values: [],
				enabled: true,
			},
		];
		const applyFilters = vi.spyOn(service, 'applyFilters');
		service.onload();
		applyFilters.mockClear();

		metadataEvents.trigger('changed');
		vi.advanceTimersByTime(60);
		metadataEvents.trigger('changed');
		vi.advanceTimersByTime(60);
		metadataEvents.trigger('changed');
		vi.advanceTimersByTime(99);
		expect(applyFilters).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(applyFilters).toHaveBeenCalledTimes(1);
	});

	it('does not schedule work for disabled metadata rules or disabled ancestor groups', () => {
		const { app } = makeApp();
		const service = new FilterService(app);
		const applyFilters = vi.spyOn(service, 'applyFilters');
		service.activeFilter = {
			type: 'group',
			logic: 'all',
			enabled: true,
			children: [
				{
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: ['#active'],
					enabled: false,
				},
				{
					type: 'group',
					logic: 'all',
					enabled: false,
					children: [
						{
							type: 'rule',
							filterType: 'has_property',
							property: 'status',
							values: [],
							enabled: true,
						},
					],
				},
				{
					type: 'rule',
					filterType: 'file_name',
					property: '',
					values: ['project'],
					enabled: true,
				},
			],
		};

		service.scheduleMetadataRefresh();
		vi.runAllTimers();

		expect(applyFilters).not.toHaveBeenCalled();
	});

	it('cancels a pending metadata refresh on unload', () => {
		const { app } = makeApp();
		const service = new FilterService(app);
		const applyFilters = vi.spyOn(service, 'applyFilters');
		service.activeFilter.children = [
			{
				type: 'rule',
				filterType: 'has_property',
				property: 'status',
				values: [],
				enabled: true,
			},
		];

		service.scheduleMetadataRefresh();
		service.onunload();
		vi.runAllTimers();

		expect(applyFilters).not.toHaveBeenCalled();
	});
});

describe('VaultmanPlugin metadata refresh wiring', () => {
	it('routes metadata resolved through FilterService backpressure', () => {
		expect(mainSource).toContain(
			'this.filterService.scheduleMetadataRefresh();',
		);
		expect(mainSource).not.toMatch(
			/metadataCache\.on\('resolved',[\s\S]*?this\.filterService\.applyFilters\(\);[\s\S]*?\}\)/,
		);
	});
});
