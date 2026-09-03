import type { VaultmanPlugin } from "../main";
import type { MenuCtx } from "../types/typeCMenu";
import { translate } from "../i18n/index";

export function registerNodeBindingActions(plugin: VaultmanPlugin): void {
	const svc = plugin.contextMenuService;
	if (!svc?.registerAction) return;

	svc.registerAction({
		id: "node.binding-note",
		nodeTypes: ["tag", "prop", "value", "folder", "snippet", "plugin", "file"],
		surfaces: ["panel"],
		label: () => translate("context_menu.node_note") || "Open Node-Note",
		icon: "lucide-link",
		run: async (ctx: MenuCtx) => {
			if (!plugin.nodeBindingService) return;
			const node = ctx.node;
			const meta = (node?.meta ?? {}) as Record<string, any>;
			const label = node?.label ?? "";

			switch (ctx.nodeType) {
				case "file": {
					const filePath = meta.path ?? node?.id ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "file",
						label: node?.label ?? label,
						path: filePath,
					});
					break;
				}
				case "tag": {
					const tagPath = meta.tagPath ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "tag",
						label: tagPath,
						tagPath,
					});
					break;
				}
				case "prop": {
					const propName = meta.propName ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "prop",
						label: propName,
						propName,
					});
					break;
				}
				case "value": {
					const val = meta.rawValue ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "value",
						label: val,
						propName: meta.propName,
					});
					break;
				}
				case "folder": {
					const folderPath = meta.path ?? meta.folderPath ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "folder",
						label: folderPath,
					});
					break;
				}
				case "snippet": {
					const name = meta.name ?? meta.snippetName ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "snippet",
						label: name,
					});
					break;
				}
				case "plugin": {
					const id = meta.pluginId ?? meta.id ?? label;
					await plugin.nodeBindingService.bindOrCreate({
						kind: "plugin",
						label: meta.name ?? id,
						pluginId: id,
					});
					break;
				}
			}
		},
	});
}
