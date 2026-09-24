import { Modal, Setting, type App, type ButtonComponent, type TextComponent } from 'obsidian';
import { parseMembershipUrn } from '../logic/logicMembershipUrn';
import { canAddMember, canNest, type NodeGroupDef } from '../logic/logicNodeGroup';
import { translate } from '../i18n/index';

export type GroupBatchRejectReason =
	| 'would-create-cycle'
	| 'preset-is-terminal'
	| 'foreign-provider'
	| 'unparsable'
	| 'member-rejected';

export interface GroupBatchFailedPair {
	origin: string;
	into: string;
	reason: GroupBatchRejectReason;
}

export type GroupBatchPlan =
	| {
			ok: true;
			next: Record<string, readonly string[]>;
			added: string[];
	  }
	| {
			ok: false;
			failedPairs: GroupBatchFailedPair[];
	  };

function identityOf(urn: string): string | null {
	const ref = parseMembershipUrn(urn);
	if (!ref) return null;
	return `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
}

/**
 * U130 Slice B (spec-03 §41-50): atomic add-members planner.
 *
 * Origins are membership URNs (`providerId:kind:canonicalId|label`). Foreign
 * provider URNs never match nor count (defence, same guard as the projection).
 * Dedup is by `canonicalId` identity (nodemovemode §11.6): an origin already
 * present is skipped, not duplicated. `canNest`/`canAddMember` gate before
 * anything is written, and ANY failing origin rejects the WHOLE batch with
 * the pairs that failed — no partial writes.
 */
export function planGroupMembershipBatch(args: {
	memberships: Readonly<Record<string, readonly string[]>>;
	targetId: string;
	origins: readonly string[];
	groups: readonly NodeGroupDef[];
	providerId: string;
}): GroupBatchPlan {
	const { memberships, targetId, origins, groups, providerId } = args;
	const target = groups.find((group) => group.id === targetId) ?? null;
	if (target && target.flavor !== 'custom') {
		return {
			ok: false,
			failedPairs: origins.map((origin) => ({
				origin,
				into: targetId,
				reason: 'preset-is-terminal',
			})),
		};
	}
	const targetDef: NodeGroupDef = target ?? {
		id: targetId,
		flavor: 'custom',
		label: targetId,
		parentId: null,
		scope: 'all',
	};
	const existing = memberships[targetId] ?? [];
	const known = new Set<string>();
	for (const urn of existing) {
		const key = identityOf(urn);
		if (key) known.add(key);
	}
	const failedPairs: GroupBatchFailedPair[] = [];
	const toAdd: string[] = [];
	const seenBatch = new Set<string>();
	for (const origin of origins) {
		const ref = parseMembershipUrn(origin);
		if (!ref) {
			failedPairs.push({ origin, into: targetId, reason: 'unparsable' });
			continue;
		}
		if (ref.providerId !== providerId) {
			failedPairs.push({ origin, into: targetId, reason: 'foreign-provider' });
			continue;
		}
		if (!canAddMember(targetDef, { kind: ref.kind })) {
			failedPairs.push({ origin, into: targetId, reason: 'member-rejected' });
			continue;
		}
		// An origin that names a group nests it; anything else just joins.
		if (groups.some((group) => group.id === ref.canonicalId)) {
			const verdict = canNest(groups, ref.canonicalId, targetId);
			if (!verdict.ok) {
				failedPairs.push({ origin, into: targetId, reason: verdict.reason });
				continue;
			}
		}
		const key = `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
		if (known.has(key) || seenBatch.has(key)) continue;
		seenBatch.add(key);
		toAdd.push(origin);
	}
	if (failedPairs.length > 0) return { ok: false, failedPairs };
	return {
		ok: true,
		next: { ...memberships, [targetId]: [...existing, ...toAdd] },
		added: toAdd,
	};
}

export interface GroupSuggesterTarget {
	id: string;
	label: string;
	flavor: 'preset' | 'custom' | 'note';
	hidden?: boolean;
}

export type GroupSuggesterResult =
	| { kind: 'existing'; id: string; label: string }
	| { kind: 'new'; name: string }
	| null;

export interface GroupSuggesterModalOptions {
	title?: string;
	placeholder?: string;
	initialValue?: string;
	customGroups?: readonly GroupSuggesterTarget[];
	filterTemplates?: readonly string[];
}

export interface GroupSuggesterSuggestion {
	id?: string;
	label: string;
	source: 'custom_group' | 'filter_template';
	flavor?: 'preset' | 'custom' | 'note';
}

/**
 * U130-GGC-012: Unified, responsive Group Suggester Modal.
 * Replaces the two-step dialog with a single coherent modal containing:
 * - Responsive layout (.vaultman-modal)
 * - Name input field with keyboard navigation (Enter/Escape/ArrowUp/ArrowDown)
 * - Suggestions for compatible custom groups and filter template names with distinct badges
 * - Clear status distinguishing "Add to existing group" vs "Create new group"
 * - Dynamic CTA button updating according to user selection
 */
export class GroupSuggesterModal extends Modal {
	private options: GroupSuggesterModalOptions;
	private resolvePromise: (value: GroupSuggesterResult) => void = () => undefined;
	private enteredName = '';
	private typedQuery = '';
	private selectedExistingGroup: GroupSuggesterTarget | null = null;
	private suggestions: GroupSuggesterSuggestion[] = [];
	private highlightedIndex = -1;

	private statusEl: HTMLElement | null = null;
	private textInputEl: HTMLInputElement | null = null;
	private textInputComponent: TextComponent | null = null;
	private suggestionsContainerEl: HTMLElement | null = null;
	private ctaButtonComponent: ButtonComponent | null = null;

	constructor(app: App, options: GroupSuggesterModalOptions) {
		super(app);
		this.options = options;
		this.enteredName = options.initialValue ?? '';
		this.typedQuery = options.initialValue ?? '';
		this.buildSuggestions();
	}

	wait(): Promise<GroupSuggesterResult> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
		});
	}

	private buildSuggestions(): void {
		const result: GroupSuggesterSuggestion[] = [];
		const seenLabels = new Set<string>();

		if (this.options.customGroups) {
			for (const group of this.options.customGroups) {
				const lower = group.label.trim().toLowerCase();
				if (!seenLabels.has(lower)) {
					seenLabels.add(lower);
					result.push({
						id: group.id,
						label: group.label,
						source: 'custom_group',
						flavor: group.flavor,
					});
				}
			}
		}

		if (this.options.filterTemplates) {
			for (const name of this.options.filterTemplates) {
				const cleanName = name.trim();
				if (!cleanName) continue;
				const lower = cleanName.toLowerCase();
				if (!seenLabels.has(lower)) {
					seenLabels.add(lower);
					result.push({
						label: cleanName,
						source: 'filter_template',
					});
				}
			}
		}

		this.suggestions = result;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-modal');
		contentEl.addClass('vaultman-group-suggester-modal');

		const title = this.options.title || translate('group.suggester.title');
		contentEl.createEl('h3', { text: title });

		this.statusEl = contentEl.createDiv({ cls: 'vaultman-modal-subtitle vaultman-suggester-status' });

		new Setting(contentEl)
			.setName(translate('group.new.prompt'))
			.addText((text) => {
				this.textInputComponent = text as unknown as TextComponent;
				text
					.setPlaceholder(this.options.placeholder || translate('group.suggester.enter_name'))
					.setValue(this.enteredName)
					.onChange((val) => {
						this.onInputChange(val);
					});
				const el = (text as unknown as { inputEl?: HTMLInputElement }).inputEl;
				if (el) {
					this.textInputEl = el;
					el.addEventListener('keydown', (e: KeyboardEvent) => this.onInputKeyDown(e));
				}
			});

		if (this.suggestions.length > 0) {
			contentEl.createEl('div', {
				cls: 'vaultman-suggester-section-title',
				text: `${translate('group.preset.custom')} / ${translate('settings.templates')}`,
			});

			this.suggestionsContainerEl = contentEl.createDiv({
				cls: 'vaultman-group-suggestions',
			});
			this.renderSuggestions();
		}

		new Setting(contentEl)
			.addButton((btn) => {
				this.ctaButtonComponent = btn as unknown as ButtonComponent;
				btn.setCta();
				btn.onClick(() => this.submit());
			})
			.addButton((btn) => {
				btn.setButtonText(translate('group.row.cancel') || 'Cancel').onClick(() => {
					this.close();
				});
			});

		this.updateStatusAndCta();
		if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
			window.requestAnimationFrame(() => {
				if (this.textInputEl) {
					this.textInputEl.focus();
					this.textInputEl.select();
				}
			});
		}
	}

	private renderSuggestions(): void {
		if (!this.suggestionsContainerEl) return;
		if (typeof this.suggestionsContainerEl.empty === 'function') {
			this.suggestionsContainerEl.empty();
		}

		const query = this.typedQuery.trim().toLowerCase();
		const filtered = query
			? this.suggestions.filter((s) => s.label.toLowerCase().includes(query))
			: this.suggestions;

		if (filtered.length === 0) {
			if (typeof this.suggestionsContainerEl.createDiv === 'function') {
				const emptyEl = this.suggestionsContainerEl.createDiv({ cls: 'vaultman-suggestion-empty' });
				if (typeof emptyEl.setText === 'function') {
					emptyEl.setText(translate('group.suggester.status_new', { name: this.enteredName.trim() }));
				}
			}
			return;
		}

		filtered.forEach((sug, idx) => {
			if (typeof this.suggestionsContainerEl!.createDiv !== 'function') return;
			const itemEl = this.suggestionsContainerEl!.createDiv({
				cls: 'vaultman-suggestion-item',
			});
			if (
				(this.selectedExistingGroup && this.selectedExistingGroup.label.toLowerCase() === sug.label.toLowerCase()) ||
				idx === this.highlightedIndex
			) {
				if (typeof itemEl.addClass === 'function') itemEl.addClass('is-selected');
			}

			if (typeof itemEl.createSpan === 'function') {
				const badgeEl = itemEl.createSpan({
					cls: `vaultman-suggestion-badge is-${sug.source}`,
				});
				if (typeof badgeEl.setText === 'function') {
					badgeEl.setText(
						sug.source === 'custom_group'
							? translate('group.suggester.existing_group')
							: translate('group.suggester.template'),
					);
				}
				itemEl.createSpan({ cls: 'vaultman-suggestion-label', text: sug.label });
			}

			if (typeof itemEl.addEventListener === 'function') {
				itemEl.addEventListener('click', () => {
					this.selectSuggestion(sug);
				});
			}
		});
	}

	private selectSuggestion(sug: GroupSuggesterSuggestion): void {
		this.enteredName = sug.label;
		if (this.textInputComponent && typeof this.textInputComponent.setValue === 'function') {
			this.textInputComponent.setValue(sug.label);
		}

		if (sug.source === 'custom_group' && sug.id) {
			const target = this.options.customGroups?.find((g) => g.id === sug.id);
			this.selectedExistingGroup = target ?? {
				id: sug.id,
				label: sug.label,
				flavor: sug.flavor ?? 'custom',
			};
		} else {
			this.selectedExistingGroup = null;
		}

		this.updateStatusAndCta();
		this.renderSuggestions();
		if (this.textInputEl) {
			this.textInputEl.focus();
		}
	}

	private onInputChange(val: string): void {
		this.enteredName = val;
		this.typedQuery = val;
		const trimmed = val.trim();
		const lower = trimmed.toLowerCase();

		const match = this.options.customGroups?.find(
			(g) => g.label.trim().toLowerCase() === lower,
		);
		if (match) {
			this.selectedExistingGroup = match;
		} else {
			this.selectedExistingGroup = null;
		}

		this.highlightedIndex = -1;
		this.updateStatusAndCta();
		this.renderSuggestions();
	}

	private onInputKeyDown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault();
			this.submit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			this.close();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			this.navigateSuggestions(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			this.navigateSuggestions(-1);
		}
	}

	private navigateSuggestions(delta: number): void {
		const query = this.typedQuery.trim().toLowerCase();
		const filtered = query
			? this.suggestions.filter((s) => s.label.toLowerCase().includes(query))
			: this.suggestions;
		if (filtered.length === 0) return;

		this.highlightedIndex = Math.max(
			0,
			Math.min(filtered.length - 1, this.highlightedIndex + delta),
		);
		const highlighted = filtered[this.highlightedIndex];
		if (highlighted) {
			this.selectSuggestion(highlighted);
		}
	}

	private updateStatusAndCta(): void {
		const name = this.enteredName.trim();
		if (this.selectedExistingGroup) {
			const label = this.selectedExistingGroup.label;
			if (this.statusEl && typeof this.statusEl.setText === 'function') {
				this.statusEl.setText(translate('group.suggester.status_existing', { name: label }));
			}
			if (this.ctaButtonComponent && typeof this.ctaButtonComponent.setButtonText === 'function') {
				this.ctaButtonComponent.setButtonText(translate('group.suggester.btn_add', { name: label }));
			}
		} else if (name.length > 0) {
			if (this.statusEl && typeof this.statusEl.setText === 'function') {
				this.statusEl.setText(translate('group.suggester.status_new', { name }));
			}
			if (this.ctaButtonComponent && typeof this.ctaButtonComponent.setButtonText === 'function') {
				this.ctaButtonComponent.setButtonText(translate('group.suggester.btn_create', { name }));
			}
		} else {
			if (this.statusEl && typeof this.statusEl.setText === 'function') {
				this.statusEl.setText(translate('group.suggester.enter_name'));
			}
			if (this.ctaButtonComponent && typeof this.ctaButtonComponent.setButtonText === 'function') {
				this.ctaButtonComponent.setButtonText(translate('group.suggester.btn_create_empty') || 'Create group');
			}
		}
	}

	private submit(): void {
		const name = this.enteredName.trim();
		if (!name && !this.selectedExistingGroup) return;

		if (this.selectedExistingGroup) {
			this.resolvePromise({
				kind: 'existing',
				id: this.selectedExistingGroup.id,
				label: this.selectedExistingGroup.label,
			});
		} else {
			this.resolvePromise({
				kind: 'new',
				name,
			});
		}
		this.close();
	}

	onClose(): void {
		super.onClose();
		this.resolvePromise(null);
		this.contentEl.empty();
	}
}

/**
 * Opens the unified group suggester modal (U130-GGC-012).
 */
export function openGroupSuggesterModal(
	app: App,
	options: GroupSuggesterModalOptions,
): Promise<GroupSuggesterResult> {
	const modal = new GroupSuggesterModal(app, options);
	modal.open();
	return modal.wait();
}

/**
 * Backwards compatibility wrapper for openGroupSuggester
 */
export async function openGroupSuggester(
	app: App,
	targets: readonly GroupSuggesterTarget[],
	placeholder: string,
): Promise<{ kind: 'existing'; id: string } | null> {
	const res = await openGroupSuggesterModal(app, {
		placeholder,
		customGroups: targets,
	});
	if (res && res.kind === 'existing') {
		return { kind: 'existing', id: res.id };
	}
	return null;
}
