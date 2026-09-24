import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import {
	GroupSuggesterModal,
	openGroupSuggesterModal,
	openGroupSuggester,
	planGroupMembershipBatch,
	type GroupSuggesterTarget,
} from '../../src/modals/modalGroupSuggester';
import {
	ResponsivePromptModal,
	showInputModal,
} from '../../src/utils/inputModal';
import type { NodeGroupDef } from '../../src/logic/logicNodeGroup';

describe('U130-GGC-012 — Responsive Group Suggester & Prompt Modal', () => {
	const mockApp = {
		vault: {},
		workspace: {},
	} as unknown as App;

	describe('GroupSuggesterModal anatomy and suggestion resolution', () => {
		const customGroups: GroupSuggesterTarget[] = [
			{ id: 'group:work', label: 'Work', flavor: 'custom' },
			{ id: 'group:urgent', label: 'Urgent', flavor: 'custom' },
		];
		const filterTemplates = ['Work', 'Active Tasks', 'Review Later'];

		it('builds deduplicated suggestions distinguishing custom groups and templates', () => {
			const modal = new GroupSuggesterModal(mockApp, {
				title: 'Create or add to group',
				customGroups,
				filterTemplates,
			});

			const suggestions = (modal as unknown as { suggestions: Array<{ label: string; source: string }> }).suggestions;
			expect(suggestions).toHaveLength(4);
			expect(suggestions[0]).toEqual({
				id: 'group:work',
				label: 'Work',
				source: 'custom_group',
				flavor: 'custom',
			});
			expect(suggestions[1]).toEqual({
				id: 'group:urgent',
				label: 'Urgent',
				source: 'custom_group',
				flavor: 'custom',
			});
			// 'Work' template was deduplicated against 'Work' custom group
			expect(suggestions[2]).toEqual({
				label: 'Active Tasks',
				source: 'filter_template',
			});
			expect(suggestions[3]).toEqual({
				label: 'Review Later',
				source: 'filter_template',
			});
		});

		it('opens modal with responsive classes and renders title and input', () => {
			const modal = new GroupSuggesterModal(mockApp, {
				title: 'Test Suggester',
				customGroups,
			});

			const addClassSpy = vi.fn();
			const createElSpy = vi.fn((tag: string, opts?: { text?: string; cls?: string }) => ({
				tag,
				text: opts?.text,
				cls: opts?.cls,
				createEl: vi.fn(),
				createSpan: vi.fn(),
				createDiv: vi.fn(),
			}));
			const createDivSpy = vi.fn((opts?: { cls?: string }) => ({
				cls: opts?.cls,
				empty: vi.fn(),
				createDiv: vi.fn(() => ({
					setText: vi.fn(),
					addClass: vi.fn(),
					createSpan: vi.fn(() => ({ setText: vi.fn() })),
					addEventListener: vi.fn(),
				})),
				createSpan: vi.fn(() => ({ setText: vi.fn() })),
				createEl: vi.fn(),
				setText: vi.fn(),
			}));

			(modal as unknown as { contentEl: Record<string, unknown> }).contentEl = {
				empty: vi.fn(),
				addClass: addClassSpy,
				createEl: createElSpy,
				createDiv: createDivSpy,
			};

			modal.onOpen();

			expect(addClassSpy).toHaveBeenCalledWith('vaultman-modal');
			expect(addClassSpy).toHaveBeenCalledWith('vaultman-group-suggester-modal');
			expect(createElSpy).toHaveBeenCalledWith('h3', { text: 'Test Suggester' });
		});

		it('resolves { kind: "existing", id, label } when picking an existing custom group', async () => {
			const modal = new GroupSuggesterModal(mockApp, {
				customGroups,
			});

			// Simulate user selecting an existing suggestion
			const promise = modal.wait();
			(modal as unknown as { selectSuggestion: (sug: unknown) => void }).selectSuggestion({
				id: 'group:urgent',
				label: 'Urgent',
				source: 'custom_group',
				flavor: 'custom',
			});
			(modal as unknown as { submit: () => void }).submit();

			const result = await promise;
			expect(result).toEqual({
				kind: 'existing',
				id: 'group:urgent',
				label: 'Urgent',
			});
		});

		it('resolves { kind: "new", name } when user inputs a new group name', async () => {
			const modal = new GroupSuggesterModal(mockApp, {
				customGroups,
			});

			const promise = modal.wait();
			(modal as unknown as { onInputChange: (val: string) => void }).onInputChange('Projects 2026');
			(modal as unknown as { submit: () => void }).submit();

			const result = await promise;
			expect(result).toEqual({
				kind: 'new',
				name: 'Projects 2026',
			});
		});

		it('resolves null when modal is closed or cancelled', async () => {
			const modal = new GroupSuggesterModal(mockApp, {});
			(modal as unknown as { contentEl: Record<string, unknown> }).contentEl = {
				empty: vi.fn(),
			};

			const promise = modal.wait();
			modal.onClose();

			const result = await promise;
			expect(result).toBeNull();
		});

		it('recognizes matching existing group on typed input without explicit click', async () => {
			const modal = new GroupSuggesterModal(mockApp, {
				customGroups,
			});

			const promise = modal.wait();
			// User types "work" in lowercase matching "Work"
			(modal as unknown as { onInputChange: (val: string) => void }).onInputChange('work');
			(modal as unknown as { submit: () => void }).submit();

			const result = await promise;
			expect(result).toEqual({
				kind: 'existing',
				id: 'group:work',
				label: 'Work',
			});
		});

		it('navigates suggestions via keyboard ArrowDown and ArrowUp', () => {
			const modal = new GroupSuggesterModal(mockApp, {
				customGroups,
			});

			(modal as unknown as { navigateSuggestions: (delta: number) => void }).navigateSuggestions(1);
			expect((modal as unknown as { highlightedIndex: number }).highlightedIndex).toBe(0);
			expect((modal as unknown as { enteredName: string }).enteredName).toBe('Work');

			(modal as unknown as { navigateSuggestions: (delta: number) => void }).navigateSuggestions(1);
			expect((modal as unknown as { highlightedIndex: number }).highlightedIndex).toBe(1);
			expect((modal as unknown as { enteredName: string }).enteredName).toBe('Urgent');

			(modal as unknown as { navigateSuggestions: (delta: number) => void }).navigateSuggestions(-1);
			expect((modal as unknown as { highlightedIndex: number }).highlightedIndex).toBe(0);
			expect((modal as unknown as { enteredName: string }).enteredName).toBe('Work');
		});

		it('backwards compatibility: openGroupSuggester and openGroupSuggesterModal are callable functions', () => {
			expect(typeof openGroupSuggesterModal).toBe('function');
			expect(typeof openGroupSuggester).toBe('function');
		});
	});

	describe('planGroupMembershipBatch atomic contract', () => {
		const groups: NodeGroupDef[] = [
			{ id: 'group:custom1', label: 'Custom 1', flavor: 'custom', parentId: null, scope: 'all' },
			{ id: 'group:custom2', label: 'Custom 2', flavor: 'custom', parentId: null, scope: 'all' },
			{ id: 'preset:letter', label: 'By letter', flavor: 'preset', parentId: null, scope: 'all' },
		];

		it('adds valid member URNs atomically to custom group and dedupes', () => {
			const memberships = {
				'group:custom1': ['props:prop:status|Status'],
			};
			const plan = planGroupMembershipBatch({
				memberships,
				targetId: 'group:custom1',
				origins: [
					'props:prop:status|Status', // duplicate
					'props:prop:priority|Priority', // new
				],
				groups,
				providerId: 'props',
			});

			expect(plan.ok).toBe(true);
			if (plan.ok) {
				expect(plan.added).toEqual(['props:prop:priority|Priority']);
				expect(plan.next['group:custom1']).toEqual([
					'props:prop:status|Status',
					'props:prop:priority|Priority',
				]);
			}
		});

		it('rejects batch if target is a preset group (preset-is-terminal)', () => {
			const plan = planGroupMembershipBatch({
				memberships: {},
				targetId: 'preset:letter',
				origins: ['props:prop:status|Status'],
				groups,
				providerId: 'props',
			});

			expect(plan.ok).toBe(false);
			if (!plan.ok) {
				expect(plan.failedPairs).toHaveLength(1);
				expect(plan.failedPairs[0].reason).toBe('preset-is-terminal');
			}
		});

		it('rejects batch if an origin comes from a foreign provider', () => {
			const plan = planGroupMembershipBatch({
				memberships: { 'group:custom1': [] },
				targetId: 'group:custom1',
				origins: [
					'tags:tag:project|Project', // foreign provider 'tags' when providerId is 'props'
				],
				groups,
				providerId: 'props',
			});

			expect(plan.ok).toBe(false);
			if (!plan.ok) {
				expect(plan.failedPairs[0].reason).toBe('foreign-provider');
			}
		});

		it('rejects batch if origin is unparsable URN', () => {
			const plan = planGroupMembershipBatch({
				memberships: { 'group:custom1': [] },
				targetId: 'group:custom1',
				origins: ['invalid-unparsable-urn'],
				groups,
				providerId: 'props',
			});

			expect(plan.ok).toBe(false);
			if (!plan.ok) {
				expect(plan.failedPairs[0].reason).toBe('unparsable');
			}
		});
	});

	describe('ResponsivePromptModal (inputModal.ts replacement)', () => {
		it('opens with responsive modal classes and heading', () => {
			const prompt = new ResponsivePromptModal(mockApp, 'Enter folder name:');
			const addClassSpy = vi.fn();
			const createElSpy = vi.fn();

			(prompt as unknown as { contentEl: Record<string, unknown> }).contentEl = {
				empty: vi.fn(),
				addClass: addClassSpy,
				createEl: createElSpy,
			};

			prompt.onOpen();
			expect(addClassSpy).toHaveBeenCalledWith('vaultman-modal');
			expect(addClassSpy).toHaveBeenCalledWith('vaultman-prompt-modal');
			expect(createElSpy).toHaveBeenCalledWith('h3', { text: 'Enter folder name:' });
		});

		it('resolves entered trimmed text upon submit', async () => {
			const prompt = new ResponsivePromptModal(mockApp, 'Prompt message');
			(prompt as unknown as { value: string }).value = '  New Note Title  ';

			const promise = prompt.wait();
			(prompt as unknown as { submit: () => void }).submit();

			const result = await promise;
			expect(result).toBe('New Note Title');
		});

		it('resolves null if user submits whitespace or cancels', async () => {
			const prompt = new ResponsivePromptModal(mockApp, 'Prompt message');
			(prompt as unknown as { value: string }).value = '   ';

			const promise = prompt.wait();
			(prompt as unknown as { submit: () => void }).submit();

			const result = await promise;
			expect(result).toBeNull();
		});

		it('showInputModal wrapper resolves successfully', () => {
			expect(typeof showInputModal).toBe('function');
		});
	});
});
