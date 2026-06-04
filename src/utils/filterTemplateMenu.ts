import { Menu } from 'obsidian';
import { translate } from '../i18n/index';
import type { VaultmanPlugin } from '../main';
import { SaveTemplateModal } from '../modals/modalSaveTemplate';

export function openFilterTemplateMenu(
	plugin: VaultmanPlugin,
	event: MouseEvent,
	onClose: () => void,
): void {
	const menu = new Menu();

	for (const template of plugin.settings.filterTemplates) {
		menu.addItem((item) =>
			item.setTitle(template.name).onClick(() => {
				plugin.filterService.loadTemplate(template);
				onClose();
			}),
		);
	}

	menu.addSeparator();
	menu.addItem((item) =>
		item.setTitle(translate('filter.template.save')).onClick(() => {
			new SaveTemplateModal(
				plugin.app,
				plugin,
				plugin.filterService.activeFilter,
			).open();
			onClose();
		}),
	);

	menu.showAtMouseEvent(event);
}
