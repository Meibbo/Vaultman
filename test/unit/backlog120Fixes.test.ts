import { describe, expect, it } from 'vitest';
import {
	dedupeSuggestItems,
	PropertySuggest,
} from '../../src/utils/autocomplete';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import {
	defaultScopeForTab,
	normalizeScopeDefaultCursor,
	registerDefaultScopeCursorProvider,
	type ScopeDefaultCursor,
} from '../../src/logic/logicScopedSort';
import { DELETE_PROP, FIND_REPLACE_CONTENT } from '../../src/types/typeOps';
import { InstanceSearchModal } from '../../src/modals/modalInstanceSearch';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('vm-backlog120 fixes', () => {
	describe('Issue 1: PropertySuggest sorting and empty item filtering', () => {
		it('dedupeSuggestItems drops empty and whitespace-only items', () => {
			const items = [
				{ value: 'alpha' },
				{ value: '' },
				{ value: '   ' },
				{ value: 'beta' },
				{ value: 'alpha' },
			];
			const deduped = dedupeSuggestItems(items);
			expect(deduped.map((i) => i.value)).toEqual(['alpha', 'beta']);
		});

		it('PropertySuggest places highest score first', () => {
			const mockInput = {
				addEventListener: () => {},
				removeEventListener: () => {},
			} as unknown as HTMLInputElement;

			const suggest = new PropertySuggest(
				{} as any,
				mockInput,
				[
					{ value: 'test' },
					{ value: 'testing' },
					{ value: 'a' },
					{ value: '   ' },
					{ value: '' },
				],
				() => {},
			);

			// Search with query 'test'
			const results = suggest.getSuggestions('test');
			expect(results.length).toBeGreaterThan(0);
			// Exact match 'test' should come before prefix 'testing'
			expect(results[0]).toBe('test');
			expect(results).toContain('testing');
			expect(results).not.toContain('');
		});
	});

	describe('Issue 2: Action Scope default ALL and respected by scenes', () => {
		it('DEFAULT_SETTINGS.scopeDefaultCursor defaults to all', () => {
			expect(DEFAULT_SETTINGS.scopeDefaultCursor).toBe('all');
		});

		it('normalizeScopeDefaultCursor returns all for unknown or undefined', () => {
			expect(normalizeScopeDefaultCursor(undefined)).toBe('all');
			expect(normalizeScopeDefaultCursor('invalid')).toBe('all');
			expect(normalizeScopeDefaultCursor('level:1')).toBe('level:1');
			expect(normalizeScopeDefaultCursor('all')).toBe('all');
		});

		it('defaultScopeForTab respects global provider', () => {
			let mockScope: ScopeDefaultCursor = 'all';
			registerDefaultScopeCursorProvider(() => mockScope);
			expect(defaultScopeForTab('props')).toBe('all');
			expect(defaultScopeForTab('files')).toBe('all');

			mockScope = 'level:1';
			expect(defaultScopeForTab('props')).toBe('level:1');
			expect(defaultScopeForTab('files')).toBe('level:1');

			// Reset provider
			registerDefaultScopeCursorProvider(() => 'all');
			expect(defaultScopeForTab('props')).toBe('all');
		});
	});

	describe('Issue 3: selectOpenedFile setting defaults to false', () => {
		it('DEFAULT_SETTINGS has selectOpenedFile false', () => {
			expect(DEFAULT_SETTINGS.selectOpenedFile).toBe(false);
		});

		it('i18n contains labels for selectOpenedFile', () => {
			expect(en['settings.select_opened_file']).toBeDefined();
			expect(en['settings.select_opened_file.desc']).toBeDefined();
			expect(es['settings.select_opened_file']).toBeDefined();
			expect(es['settings.select_opened_file.desc']).toBeDefined();
		});
	});

	describe('Issue 4: Tag deletion frontmatter & inline queue handling', () => {
		it('supports DELETE_PROP with array and undefined property values', () => {
			const fm: Record<string, unknown> = {
				tags: ['test'],
				tag: 'test',
				other: 123,
			};
			const updates: Record<string, unknown> = {
				tags: undefined,
				tag: undefined,
				[DELETE_PROP]: ['tags', 'tag'],
				[FIND_REPLACE_CONTENT]: {
					pattern: '(?:^|(?<=\\s))#test(?=[\\s,.;:!?)\\}\\]]|$)',
					replacement: '',
					isRegex: true,
					caseSensitive: false,
				},
			};

			// Simulate OperationQueueService logic for updates
			for (const [key, value] of Object.entries(updates)) {
				if (key === DELETE_PROP) {
					if (Array.isArray(value)) {
						for (const p of value) delete fm[p as string];
					} else {
						delete fm[value as string];
					}
				} else if (value === undefined) {
					delete fm[key];
				}
			}

			expect(fm.tags).toBeUndefined();
			expect(fm.tag).toBeUndefined();
			expect(fm.other).toBe(123);
		});
	});

	describe('Issue 5: openVaultmanBehavior setting and InstanceSearchModal', () => {
		it('DEFAULT_SETTINGS.openVaultmanBehavior defaults to direct', () => {
			expect(DEFAULT_SETTINGS.openVaultmanBehavior).toBe('direct');
		});

		it('i18n contains labels for openVaultmanBehavior', () => {
			expect(en['settings.open_vaultman_behavior']).toBeDefined();
			expect(es['settings.open_vaultman_behavior']).toBeDefined();
		});

		it('InstanceSearchModal offers create choice when query has no exact match', () => {
			const mockApp = {
				workspace: {
					getLeavesOfType: () => [{ id: 'inst1' }],
				},
			} as any;
			const mockPlugin = {
				app: mockApp,
				settings: {
					instanceRegistry: {
						schema: 1,
						instances: {
							inst1: { id: 'inst1', activeScene: 'files', lastActiveAt: 1000 },
							inst2: { id: 'inst2', activeScene: 'tags', lastActiveAt: 2000 },
						},
						lastActiveInstanceId: 'inst2',
					},
				},
				workspaceMountForLeaf: (leaf: any) => ({ instanceId: leaf.id }),
				readInstanceRegistry: () => ({
					instances: {
						inst1: { id: 'inst1', activeScene: 'files', lastActiveAt: 1000 },
						inst2: { id: 'inst2', activeScene: 'tags', lastActiveAt: 2000 },
					},
					lastActiveInstanceId: 'inst2',
				}),
				listMountedWorkspaceFrames: () => [
					{ instanceId: 'inst1' },
				],
			} as any;

			const modal = new InstanceSearchModal(mockApp, mockPlugin);
			const suggestions = modal.getSuggestions('new-work');
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions[0]).toEqual({
				kind: 'create',
				id: 'new-work',
				title: 'Create new instance: "new-work"',
				subtitle: 'Create a new Vaultman workspace instance with this name',
			});
		});

		it('InstanceSearchModal sorts mounted instances before unmounted', () => {
			const mockApp = {
				workspace: {
					getLeavesOfType: () => [{ id: 'mounted' }],
				},
			} as any;
			const mockPlugin = {
				app: mockApp,
				settings: {
					instanceRegistry: {
						schema: 1,
						instances: {
							unmounted: { id: 'unmounted', activeScene: 'files', lastActiveAt: 5000 },
							mounted: { id: 'mounted', activeScene: 'props', lastActiveAt: 1000 },
						},
						lastActiveInstanceId: 'unmounted',
					},
				},
				workspaceMountForLeaf: (leaf: any) => ({ instanceId: leaf.id }),
				readInstanceRegistry: () => ({
					instances: {
						unmounted: { id: 'unmounted', activeScene: 'files', lastActiveAt: 5000 },
						mounted: { id: 'mounted', activeScene: 'props', lastActiveAt: 1000 },
					},
					lastActiveInstanceId: 'unmounted',
				}),
				listMountedWorkspaceFrames: () => [
					{ instanceId: 'mounted' },
				],
			} as any;

			const modal = new InstanceSearchModal(mockApp, mockPlugin);
			const suggestions = modal.getSuggestions('');
			const existing = suggestions.filter((s) => s.kind === 'existing');
			expect(existing[0].id).toBe('mounted');
			expect(existing[1].id).toBe('unmounted');
		});
	});
});
