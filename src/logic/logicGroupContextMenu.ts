import { Notice } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';

/**
 * Spec 08 §3.3: `Create group with selected` on the cmenu of every explorer
 * node kind. The explorer decides when it applies (select mode with a
 * selection) by attaching `createGroupWithSelected` to the ctx; the action
 * only dispatches.
 *
 * U130 Slice B (spec-03 §24-40): universal group-header menu on
 * `nodeType: 'group'`. Owner decides availability — preset/note headers are
 * engine-owned, custom ones scene-owned — and unavailable is disabled with a
 * reason, never hidden. The explorer attaches `groupId`/`groupOwner` plus a
 * `toggleGroupExpand` callback; hide/delete stay scene-owned (navbar
 * `SceneConfig`) so from here they are disabled with the reason pointing at
 * the Groups submenu.
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

	const isCustom = (ctx: MenuCtx): boolean => ctx.groupOwner === 'custom';

	svc.registerAction({
		id: 'group.toggle-expand',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) =>
			ctx.groupExpanded === false
				? translate('group.caret.expand')
				: translate('group.caret.collapse'),
		icon: 'lucide-chevrons-up-down',
		disabledReason: (ctx: MenuCtx) =>
			typeof ctx.toggleGroupExpand === 'function' && ctx.groupId
				? null
				: translate('group.caret.unavailable'),
		run: (ctx: MenuCtx) => {
			if (ctx.groupId) ctx.toggleGroupExpand?.(ctx.groupId);
		},
	});

	svc.registerAction({
		id: 'group.copy-id',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.copy.id'),
		icon: 'lucide-copy',
		run: (ctx: MenuCtx) => {
			const id = ctx.groupId ?? ctx.node.id;
			void navigator.clipboard.writeText(id).catch(() => {
				new Notice(translate('group.copy.failed'));
			});
		},
	});

	svc.registerAction({
		id: 'group.icon',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.icon.change'),
		icon: 'lucide-palette',
		disabledReason: (ctx: MenuCtx) =>
			isCustom(ctx) ? translate('group.icon.unavailable') : translate('group.preset.locked'),
		run: () => {
			new Notice(translate('group.icon.unavailable'));
		},
	});

	svc.registerAction({
		id: 'group.hide-toggle',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) =>
			ctx.groupHidden === true
				? translate('group.row.unhide')
				: translate('group.row.hide'),
		icon: 'lucide-eye-off',
		disabledReason: (ctx: MenuCtx) =>
			isCustom(ctx) ? null : translate('group.preset.locked'),
		run: () => {
			new Notice(translate('group.hide.from_groups_menu'));
		},
	});

	svc.registerAction({
		id: 'group.delete',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.row.delete'),
		icon: 'lucide-trash-2',
		separatorBefore: true,
		disabledReason: (ctx: MenuCtx) =>
			isCustom(ctx) ? null : translate('group.preset.locked'),
		run: () => {
			new Notice(translate('group.delete.from_groups_menu'));
		},
	});
}
