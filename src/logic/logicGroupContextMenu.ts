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

	svc.registerAction({
		id: 'group.materialize-preset',
		nodeTypes: ['group'],
		surfaces: ['panel'],
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

	svc.registerAction({
		id: 'group.adjust-range',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.counter.adjust'),
		icon: 'lucide-between-horizontal-start',
		when: (ctx: MenuCtx) => typeof ctx.adjustGroupRange === 'function',
		disabledReason: (ctx: MenuCtx) =>
			typeof ctx.adjustGroupRange === 'function'
				? null
				: translate('group.counter.adjust_unavailable'),
		run: (ctx: MenuCtx) => {
			ctx.adjustGroupRange?.();
		},
	});

	svc.registerAction({
		id: 'group.toggle-expand',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) =>
			ctx.groupExpanded === false
				? translate('group.caret.expand')
				: translate('group.caret.collapse'),
		icon: 'lucide-chevrons-up-down',
		when: (ctx: MenuCtx) =>
			Boolean(ctx.groupId) && typeof ctx.toggleGroupExpand === 'function',
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

	svc.registerAction({
		id: 'group.icon',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.icon.change'),
		icon: 'lucide-palette',
		when: (ctx: MenuCtx) => typeof ctx.changeGroupIcon === 'function',
		disabledReason: (ctx: MenuCtx) =>
			typeof ctx.changeGroupIcon === 'function'
				? null
				: translate('group.icon.unavailable'),
		run: (ctx: MenuCtx) => {
			if (ctx.changeGroupIcon) {
				void ctx.changeGroupIcon();
				return;
			}
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
		when: (ctx: MenuCtx) =>
			Boolean(ctx.groupId) &&
			(isCustom(ctx) || isPreset(ctx) || ctx.groupOwner === 'note') &&
			typeof ctx.hideGroup === 'function',
		disabledReason: (ctx: MenuCtx) =>
			ctx.groupId && (isCustom(ctx) || isPreset(ctx) || ctx.groupOwner === 'note') &&
				typeof ctx.hideGroup === 'function'
				? null
				: translate('group.hide.unavailable'),
		run: (ctx: MenuCtx) => {
			if (ctx.groupId && ctx.hideGroup)
				ctx.hideGroup(ctx.groupId, ctx.groupHidden !== true);
		},
	});

	svc.registerAction({
		id: 'group.delete',
		nodeTypes: ['group'],
		surfaces: ['panel'],
		label: () => translate('group.row.delete'),
		icon: 'lucide-trash-2',
		separatorBefore: true,
		// Presets are projections, not mutable memberships. Delete is hidden
		// rather than rendered as a disabled dead-end row.
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
		area.style.position = 'fixed';
		area.style.opacity = '0';
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
