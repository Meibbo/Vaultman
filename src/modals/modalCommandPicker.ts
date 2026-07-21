import { FuzzySuggestModal, setIcon, type App } from 'obsidian';
import type { FuzzyMatch } from 'obsidian';

import { translate } from '../i18n/index';
import { listObsidianCommands } from '../utils/obsidianCommands';
import {
	VAULTMAN_DEFAULT_COMMAND,
	type CommandDescriptor,
} from '../logic/logicCommandActions';

interface CommandChoice extends CommandDescriptor {
	/** The Vaultman-default sentinel, offered first when allowed. */
	isDefault?: boolean;
}

export interface CommandPickerOptions {
	app: App;
	title: string;
	/** Offer "Vaultman default" as the first choice (BT5-023 reset path). */
	includeDefault?: boolean;
	onPick: (id: string) => void | Promise<void>;
	/** Injectable for tests; defaults to the live registry. */
	listCommands?: () => CommandDescriptor[];
}

/**
 * BT5-023 / BT5-024: a searchable Obsidian-command picker built on the native
 * fuzzy suggester, so search, keyboard navigation and focus come from Obsidian.
 * It always reads the live registry, so a command added or removed since the
 * settings page opened shows up without a stale cache.
 */
export class CommandPickerModal extends FuzzySuggestModal<CommandChoice> {
	private readonly options: CommandPickerOptions;

	constructor(options: CommandPickerOptions) {
		super(options.app);
		this.options = options;
		this.setPlaceholder(translate('command.picker.search'));
		this.emptyStateText = translate('command.picker.empty');
		this.titleEl?.setText(options.title);
	}

	getItems(): CommandChoice[] {
		const commands =
			this.options.listCommands?.() ?? listObsidianCommands(this.options.app);
		const items: CommandChoice[] = [];
		if (this.options.includeDefault) {
			items.push({
				id: VAULTMAN_DEFAULT_COMMAND,
				name: translate('command.picker.default'),
				icon: 'lucide-rotate-ccw',
				isDefault: true,
			});
		}
		return items.concat(commands);
	}

	getItemText(item: CommandChoice): string {
		return item.name;
	}

	renderSuggestion(match: FuzzyMatch<CommandChoice>, el: HTMLElement): void {
		const item = match.item;
		el.addClass('mod-complex');
		const iconEl = el.createSpan({ cls: 'suggestion-icon' });
		setIcon(iconEl, item.icon ?? 'lucide-terminal');
		el.createSpan({ cls: 'suggestion-content', text: item.name });
		if (!item.isDefault) {
			el.createSpan({ cls: 'suggestion-aux', text: item.id });
		}
	}

	onChooseItem(item: CommandChoice): void {
		void this.options.onPick(item.id);
	}

	onClose(): void {
		super.onClose();
		if (activePicker === this) activePicker = null;
	}
}

let activePicker: CommandPickerModal | null = null;

export function openCommandPicker(
	options: CommandPickerOptions,
): CommandPickerModal | null {
	if (activePicker) return null;
	const modal = new CommandPickerModal(options);
	activePicker = modal;
	modal.open();
	return modal;
}
