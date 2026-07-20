import { FuzzySuggestModal, getIconIds, setIcon, type App } from 'obsidian';
import type { FuzzyMatch } from 'obsidian';
import { translate } from '../i18n/index';
import {
	addonIconChoices,
	addonIconLabelFor,
	type AddonIconChoice,
} from '../logic/logicAddonIcons';

export interface AddonIconPickerOptions {
	app: App;
	/** Human name of the add-on, shown in the prompt title. */
	name: string;
	/** True when Vaultman itself holds an override (enables Reset). */
	hasOverride: boolean;
	onPick: (icon: string) => void | Promise<void>;
	onReset: () => void | Promise<void>;
	/** Injectable for tests; defaults to the Obsidian icon library. */
	listIconIds?: () => string[];
}

/**
 * BT5-019: Vaultman's own icon picker for add-on nodes.
 *
 * Built on the native fuzzy suggester, so search, keyboard navigation, focus
 * handling and styling come from Obsidian itself. It is deliberately
 * independent of the Iconic adapter — it delegates to no external picker — so
 * snippets and plugins get a picker whether or not Iconic is installed.
 */
export class AddonIconPickerModal extends FuzzySuggestModal<AddonIconChoice> {
	private readonly options: AddonIconPickerOptions;

	constructor(options: AddonIconPickerOptions) {
		super(options.app);
		this.options = options;
		this.setPlaceholder(translate('addon.icon.search'));
		this.emptyStateText = translate('addon.icon.empty');
		this.titleEl?.setText(
			translate('addon.icon.title').replace('{name}', options.name),
		);
	}

	getItems(): AddonIconChoice[] {
		const iconIds = this.options.listIconIds?.() ?? getIconIds();
		return addonIconChoices(iconIds, {
			hasOverride: this.options.hasOverride,
		});
	}

	getItemText(item: AddonIconChoice): string {
		return item.kind === 'reset'
			? translate('addon.icon.reset')
			: addonIconLabelFor(item.id);
	}

	renderSuggestion(match: FuzzyMatch<AddonIconChoice>, el: HTMLElement): void {
		const item = match.item;
		el.addClass('mod-complex');
		const iconEl = el.createSpan({ cls: 'suggestion-icon' });
		setIcon(iconEl, item.kind === 'reset' ? 'lucide-rotate-ccw' : item.id);
		el.createSpan({ cls: 'suggestion-content', text: this.getItemText(item) });
	}

	onChooseItem(item: AddonIconChoice): void {
		if (item.kind === 'reset') {
			void this.options.onReset();
			return;
		}
		void this.options.onPick(item.id);
	}

	onClose(): void {
		super.onClose();
		if (activePicker === this) activePicker = null;
	}
}

/** Only one picker may be open at a time (no stacked/duplicate modals). */
let activePicker: AddonIconPickerModal | null = null;

export function openAddonIconPicker(
	options: AddonIconPickerOptions,
): AddonIconPickerModal | null {
	if (activePicker) return null;
	const modal = new AddonIconPickerModal(options);
	activePicker = modal;
	modal.open();
	return modal;
}
