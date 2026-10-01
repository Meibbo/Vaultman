import { Notice } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';
import {
	ADD_PROPERTY_ROW_ID,
	DEGROUP_SELECTED_ICON,
	DEGROUP_SELECTED_SASI_ID,
	GROUP_SELECTED_ICON,
	GROUP_SELECTED_SASI_ID,
} from './logicGroupSelectionTransaction';

/**
 * Spec 08 §3.3 + U130 transacción (spec-01 §4, spec-02 §4-5):
 * `Group selected` / `Degroup selected` en el cmenu de cada explorer.
 *
 * - Group selected no depende de `interactionMode === select` ni de
 *   checkbox visible: exige selección válida y groupable.
 * - Si la selección contiene un action-only node (`add_property`), la
 *   acción queda unavailable con razón explícita; nunca opera sobre un
 *   subset silencioso.
 * - Menú/invoker async: espera el resultado del handler.
 * - Los IDs son los del catálogo SASI (`vaultman.group.*`), sin callbacks
 *   duplicados: el context menu es una proyección de esas Actions.
 */
export function registerGroupActions(plugin: VaultmanPlugin): void {
	const svc = plugin.contextMenuService;
	if (!svc?.registerAction) return;

	svc.registerAction({
		id: GROUP_SELECTED_SASI_ID,
		nodeTypes: ['file', 'folder', 'tag', 'prop', 'value', 'snippet', 'plugin'],
		surfaces: ['panel'],
		label: () => translate('group.selected'),
		icon: GROUP_SELECTED_ICON,
		separatorBefore: true,
		when: (ctx: MenuCtx) => typeof ctx.createGroupWithSelected === 'function',
		disabledReason: (ctx: MenuCtx) => {
			if (typeof ctx.createGroupWithSelected !== 'function')
				return translate('group.selected.no_handler');
			const ids = ctx.selectedIds;
			if (!ids || ids.size === 0) return translate('group.selected.empty');
			if (ids.has(ADD_PROPERTY_ROW_ID))
				return translate('group.selected.action_only');
			return null;
		},
		run: async (ctx: MenuCtx) => {
			const result = await ctx.createGroupWithSelected?.();
			if (result && typeof result === 'object' && 'status' in result) {
				if (result.status === 'rejected')
					new Notice(`${translate('group.batch.rejected')} (${result.reason})`);
			}
		},
	});

	svc.registerAction({
		id: DEGROUP_SELECTED_SASI_ID,
		nodeTypes: ['file', 'folder', 'tag', 'prop', 'value', 'snippet', 'plugin'],
		surfaces: ['panel'],
		label: () => translate('group.degroup_selected'),
		icon: DEGROUP_SELECTED_ICON,
		when: (ctx: MenuCtx) => typeof ctx.degroupSelected === 'function',
		disabledReason: (ctx: MenuCtx) => {
			if (typeof ctx.degroupSelected !== 'function')
				return translate('group.degroup.no_handler');
			// Preset nunca ofrece Degroup: sin owner no hay de dónde salir.
			if (!ctx.membershipOwner && ctx.groupOwner !== 'custom' && ctx.groupOwner !== 'note')
				return translate('group.degroup.unavailable_no_owner');
			if (ctx.membershipOwner === undefined && ctx.groupOwner === 'preset')
				return translate('group.degroup.unavailable_preset');
			const ids = ctx.selectedIds;
			if (!ids || ids.size === 0) return translate('group.selected.empty');
			if (ids.has(ADD_PROPERTY_ROW_ID))
				return translate('group.selected.action_only');
			return null;
		},
		run: async (ctx: MenuCtx) => {
			const result = await ctx.degroupSelected?.();
			if (result && typeof result === 'object' && 'status' in result) {
				if (result.status === 'rejected')
					new Notice(`${translate('group.batch.rejected')} (${result.reason})`);
			}
		},
	});

	const isCustom = (ctx: MenuCtx): boolean => ctx.groupOwner === 'custom';
	const isPreset = (ctx: MenuCtx): boolean => ctx.groupOwner === 'preset';

	// U130-GGC-007: only Files group headers with a valid physical snapshot
	// receive this handler. The explorer performs preflight and confirmation.
	svc.registerAction({
		id: 'group.convert-to-folder',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.folder.convert'),
		icon: 'lucide-folder-input',
		when: (ctx: MenuCtx) => typeof ctx.convertGroupToFolder === 'function',
		run: async (ctx: MenuCtx) => { await ctx.convertGroupToFolder?.(); },
	});

	// U130-GGC-006 / 016: Materialize preset bucket to custom group
	// Oculta del panel cmenu (solo SASI) para evitar duplicado/colisión con
	// 'group.make-copy': el panel muestra SOLO make-copy.
	svc.registerAction({
		id: 'group.materialize-preset',
		nodeTypes: ['group'],
		surfaces: [],
		label: () => translate('group.preset.materialize'),
		icon: 'lucide-copy-plus',
		when: (ctx: MenuCtx) => isPreset(ctx) && typeof ctx.materializePreset === 'function',
		disabledReason: (ctx: MenuCtx) =>
			!isPreset(ctx) ? translate('group.preset.locked') :
				typeof ctx.materializePreset === 'function' ? null : translate('group.preset.locked'),
		run: async (ctx: MenuCtx) => {
			const result = await ctx.materializePreset?.();
			if (result && typeof result === 'object' && result.status === 'rejected')
				new Notice(`${translate('group.batch.rejected')} (${result.reason})`);
		},
	});

	// U130-GGC-016: make_a_copy (preset o custom con snapshot)
	svc.registerAction({
		id: 'group.make-copy',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.copy.make'),
		icon: 'lucide-copy',
		when: (ctx: MenuCtx) =>
			typeof ctx.makeACopy === 'function' ||
			(isPreset(ctx) && typeof ctx.materializePreset === 'function'),
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			if (typeof ctx.makeACopy === 'function') {
				const result = await ctx.makeACopy();
				if (result && typeof result === 'object' && result.status === 'rejected')
					new Notice(`${translate('group.batch.rejected')} (${result.reason})`);
				return;
			}
			if (isPreset(ctx) && typeof ctx.materializePreset === 'function') {
				const result = await ctx.materializePreset();
				if (result && typeof result === 'object' && result.status === 'rejected')
					new Notice(`${translate('group.batch.rejected')} (${result.reason})`);
			}
		},
	});

	// U130-GGC-016: rename_custom_group (custom o note group)
	svc.registerAction({
		id: 'group.rename',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.row.rename'),
		icon: 'lucide-pencil',
		when: (ctx: MenuCtx) =>
			(isCustom(ctx) || ctx.groupOwner === 'note') &&
			(typeof ctx.renameGroup === 'function' || typeof ctx.invokeRename === 'function'),
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			if (ctx.renameGroup && ctx.groupId) {
				await ctx.renameGroup(ctx.groupId);
			} else if (ctx.invokeRename) {
				ctx.invokeRename(ctx.node.id);
			}
		},
	});

	// U130-GGC-016: open_node_note
	// Disponible para cualquier node_group cuando nodeBindingService existe;
	// si no, solo note groups o grupos con file/openNodeNote.
	svc.registerAction({
		id: 'group.open-note',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('context_menu.node_note') || 'Open Node-Note',
		icon: 'lucide-link',
		when: (ctx: MenuCtx) => {
			if (Boolean(plugin.nodeBindingService)) return true;
			return (
				(ctx.groupOwner === 'note' || Boolean(ctx.file)) &&
				(typeof ctx.openNodeNote === 'function' ||
					Boolean(ctx.file) ||
					Boolean(plugin.nodeBindingService))
			);
		},
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			if (typeof ctx.openNodeNote === 'function') {
				await ctx.openNodeNote();
				return;
			}
			if (ctx.file) {
				const leaf = plugin.app.workspace.getLeaf(false);
				await leaf.openFile(ctx.file, { active: true });
				return;
			}
			if (plugin.nodeBindingService && ctx.node?.label) {
				await plugin.nodeBindingService.bindOrCreate({
					kind: 'group',
					label: ctx.node.label,
					path: ctx.groupId ?? ctx.node.id,
				});
			}
		},
	});

	// U130-GGC-016: update_group_scope
	svc.registerAction({
		id: 'group.update-scope',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.scope.update'),
		icon: 'lucide-target',
		when: (ctx: MenuCtx) => typeof ctx.updateGroupScope === 'function',
		disabledReason: () => null,
		run: (ctx: MenuCtx) => {
			void ctx.updateGroupScope?.();
		},
	});

	// U130-GGC-016: en Files, open in X para node_folder representado por grupo
	svc.registerAction({
		id: 'group.folder.open_tab',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('file.ctx.open_tab'),
		icon: 'lucide-panel-top',
		when: (ctx: MenuCtx) => Boolean((ctx.node?.meta as { folder?: import('obsidian').TFolder })?.folder),
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			const folder = (ctx.node?.meta as { folder?: import('obsidian').TFolder })?.folder;
			if (folder) {
				const leaf = plugin.app.workspace.getLeaf('tab');
				await leaf.openFile(folder as never, { active: true });
			}
		},
	});

	svc.registerAction({
		id: 'group.folder.open_right',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('file.ctx.open_right'),
		icon: 'lucide-panel-right',
		when: (ctx: MenuCtx) => Boolean((ctx.node?.meta as { folder?: import('obsidian').TFolder })?.folder),
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			const folder = (ctx.node?.meta as { folder?: import('obsidian').TFolder })?.folder;
			if (folder) {
				const leaf = plugin.app.workspace.getLeaf('split', 'vertical');
				await leaf.openFile(folder as never, { active: true });
			}
		},
	});

	svc.registerAction({
		id: 'group.folder.open_window',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('file.ctx.open_window'),
		icon: 'lucide-app-window',
		when: (ctx: MenuCtx) => Boolean((ctx.node?.meta as { folder?: import('obsidian').TFolder })?.folder),
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			const folder = (ctx.node?.meta as { folder?: import('obsidian').TFolder })?.folder;
			if (folder) {
				const ws = plugin.app.workspace as { openPopoutLeaf?(): import('obsidian').WorkspaceLeaf };
				const leaf = ws.openPopoutLeaf?.();
				await leaf?.openFile(folder as never, { active: true });
			}
		},
	});

	// U130-GGC-006 / 016: Adjust range y Slice group range
	svc.registerAction({
		id: 'group.adjust-range',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.counter.adjust'),
		icon: 'lucide-between-horizontal-start',
		when: (ctx: MenuCtx) =>
			typeof ctx.adjustGroupRange === 'function' ||
			typeof ctx.sliceGroupRange === 'function',
		disabledReason: () => null,
		run: (ctx: MenuCtx) => {
			if (typeof ctx.adjustGroupRange === 'function') {
				ctx.adjustGroupRange();
			} else if (typeof ctx.sliceGroupRange === 'function') {
				ctx.sliceGroupRange();
			}
		},
	});

	svc.registerAction({
		id: 'group.slice-range',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.counter.slice'),
		icon: 'lucide-split',
		when: (ctx: MenuCtx) =>
			typeof ctx.sliceGroupRange === 'function' ||
			typeof ctx.adjustGroupRange === 'function',
		disabledReason: () => null,
		run: (ctx: MenuCtx) => {
			if (typeof ctx.sliceGroupRange === 'function') {
				ctx.sliceGroupRange();
			} else if (typeof ctx.adjustGroupRange === 'function') {
				ctx.adjustGroupRange();
			}
		},
	});

	// U130-GGC-016: Ocultar Collapse group en ambos cmenu sin eliminar su acción SASI
	svc.registerAction({
		id: 'group.toggle-expand',
		nodeTypes: ['group'],
		surfaces: [],
		label: (ctx: MenuCtx) =>
			ctx.groupExpanded === false
				? translate('group.caret.expand')
				: translate('group.caret.collapse'),
		icon: 'lucide-chevrons-up-down',
		when: (ctx: MenuCtx) =>
			Boolean(ctx.groupId) && typeof ctx.toggleGroupExpand === 'function',
		disabledReason: () => null,
		run: (ctx: MenuCtx) => {
			if (ctx.groupId) ctx.toggleGroupExpand?.(ctx.groupId);
		},
	});

	// U130-GGC-020: copiar ID estable
	svc.registerAction({
		id: 'group.copy-id',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.copy.id'),
		icon: 'lucide-copy',
		when: (ctx: MenuCtx) => Boolean(ctx.groupId || ctx.node?.id),
		disabledReason: () => null,
		run: async (ctx: MenuCtx) => {
			const id = resolveGroupCopyId(ctx);
			if (!id) {
				new Notice(translate('group.copy.failed'));
				return;
			}
			const ok = await writeGroupCopyIdToClipboard(id);
			new Notice(
				translate(
					ok
						? 'settings.data_transfer.export.copied'
						: 'group.copy.failed',
				),
			);
		},
	});

	// U130-GGC-006: Change icon siempre permitido para preset/custom/note
	svc.registerAction({
		id: 'group.icon',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.icon.change'),
		icon: 'lucide-palette',
		when: (ctx: MenuCtx) =>
			typeof ctx.changeGroupIcon === 'function' || Boolean(ctx.groupId || ctx.node?.id),
		disabledReason: (ctx: MenuCtx) =>
			typeof ctx.changeGroupIcon === 'function' || Boolean(plugin?.app)
				? null
				: translate('group.icon.unavailable'),
		run: async (ctx: MenuCtx) => {
			if (typeof ctx.changeGroupIcon === 'function') {
				await ctx.changeGroupIcon();
				return;
			}
			if (plugin?.app) {
				const { openAddonIconPicker } = await import(
					'../modals/modalAddonIconPicker'
				);
				const groupName = ctx.node?.label ?? ctx.groupId ?? 'Group';
				openAddonIconPicker({
					app: plugin.app,
					name: groupName,
					hasOverride: false,
					onPick: () => {},
					onReset: () => {},
				});
				return;
			}
			new Notice(translate('group.icon.unavailable'));
		},
	});

	// U130-GGC-006: Hide cuando se puede ocultar
	svc.registerAction({
		id: 'group.hide-toggle',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) =>
			ctx.groupHidden === true
				? translate('group.row.unhide')
				: translate('group.row.hide'),
		icon: 'lucide-eye-off',
		when: (ctx: MenuCtx) =>
			Boolean(ctx.groupId) &&
			(isCustom(ctx) || isPreset(ctx) || ctx.groupOwner === 'note') &&
			typeof ctx.hideGroup === 'function',
		disabledReason: () => null,
		run: (ctx: MenuCtx) => {
			if (ctx.groupId && ctx.hideGroup)
				ctx.hideGroup(ctx.groupId, ctx.groupHidden !== true);
		},
	});

	// U130-GGC-006 / 016: Delete incompatible con preset se oculta; sólo para custom o note
	svc.registerAction({
		id: 'group.delete',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.row.delete'),
		icon: 'lucide-trash-2',
		separatorBefore: true,
		when: (ctx: MenuCtx) =>
			(isCustom(ctx) || ctx.groupOwner === 'note') &&
			typeof ctx.deleteGroup === 'function',
		disabledReason: (ctx: MenuCtx) => {
			if (!isCustom(ctx) && ctx.groupOwner !== 'note')
				return translate('group.delete.preset');
			return ctx.groupId && typeof ctx.deleteGroup === 'function'
				? null
				: translate('group.delete.unavailable');
		},
		run: (ctx: MenuCtx) => {
			if (ctx.groupId && ctx.deleteGroup) ctx.deleteGroup(ctx.groupId);
		},
	});
}

/**
 * U130-GGC-020: identidad estable del grupo invocado.
 *
 * `TreeNode.id` es rowId de ocurrencia (p. ej. `vaultman.group.header:<owner>:<id>`
 * tras `projectGroupedTreeInScope`); la identidad canonica viaja en
 * `node.entityId` (= `entityIdOf`) y, en Files/Props/Tags, en `ctx.groupId`.
 * Snippets/Plugins propagan `groupId: id` (rowId), asi que `entityId` tiene
 * prioridad: copiar el rowId seria copiar otra ocurrencia/instancia.
 */
export function resolveGroupCopyId(ctx: MenuCtx): string {
	const entity = (ctx.node as { entityId?: unknown }).entityId;
	if (typeof entity === 'string' && entity.length > 0) return entity;
	if (typeof ctx.groupId === 'string' && ctx.groupId.length > 0)
		return ctx.groupId;
	return ctx.node.id;
}

/**
 * U130-GGC-020: escritura con capability guard + fallback DOM sin API extra.
 * Nunca lanza: `false` significa "mostrar `group.copy.failed`".
 */
export async function writeGroupCopyIdToClipboard(id: string): Promise<boolean> {
	try {
		const scope = globalThis as unknown as {
			navigator?: { clipboard?: { writeText?: (text: string) => Promise<unknown> } };
		};
		const writeText = scope.navigator?.clipboard?.writeText?.bind(
			scope.navigator.clipboard,
		);
		if (typeof writeText === 'function') {
			await writeText(id);
			return true;
		}
	} catch {
		// Clipboard API rechazo/permiso: intenta el fallback legacy abajo.
	}
	return legacyCopyGroupId(id);
}

function legacyCopyGroupId(text: string): boolean {
	try {
		const scope = globalThis as unknown as {
			document?: Document;
		};
		const doc = scope.document;
		if (!doc || typeof doc.createElement !== 'function') return false;
		const exec = (doc as unknown as { execCommand?: (cmd: string) => boolean }).execCommand;
		if (typeof exec !== 'function') return false;
		const area = doc.createElement('textarea');
		area.value = text;
		area.setAttribute('readonly', '');
		area.className = 'fixed opacity-0';
		doc.body?.appendChild(area);
		area.select();
		try {
			area.setSelectionRange(0, area.value.length);
		} catch {
			// Select ya basta en desktop; ignora el rango movil.
		}
		const result = exec.call(doc, 'copy');
		area.remove();
		return result !== false;
	} catch {
		return false;
	}
}
