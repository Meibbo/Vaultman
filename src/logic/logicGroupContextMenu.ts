import type { VaultmanPlugin } from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';

/**
 * Spec 08 §3.3: `Create group with selected` on the cmenu of every explorer
 * node kind. The explorer decides when it applies (select mode with a
 * selection) by attaching `createGroupWithSelected` to the ctx; the action
 * only dispatches.
 */
export function registerGroupActions(plugin: VaultmanPlugin): void {
	const svc = plugin.contextMenuService;
	if (!svc?.registerAction) return;

	svc.registerAction({
		id: 'group.create-with-selected',
		nodeTypes: ['file', 'folder', 'tag', 'prop', 'value', 'snippet', 'plugin'],
		surfaces: ['panel'],
		label: () => translate('group.create_with_selected'),
		icon: 'lucide-folder-plus',
		separatorBefore: true,
		when: (ctx: MenuCtx) => typeof ctx.createGroupWithSelected === 'function',
		run: (ctx: MenuCtx) => {
			ctx.createGroupWithSelected?.();
		},
	});
}
