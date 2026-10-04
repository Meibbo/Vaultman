import { toolbarMenuCatalog } from './logicToolbarMenuCatalog';

/** Display metadata only; workspace view and instance identities stay unchanged. */
export function workspaceTabIdentity(mirror: boolean, scene: string | null | undefined): {
	readonly labelKey: string;
	readonly icon: string;
} {
	const definition = mirror && scene
		? toolbarMenuCatalog('scene_menu').find((entry) =>
			entry.id === `scene_menu.tab.${scene}` || entry.id === `scene_menu.launcher.${scene}`)
		: undefined;
	return definition
		? { labelKey: definition.labelKey, icon: definition.icon }
		: { labelKey: 'plugin.frame_name', icon: 'lucide-vault' };
}
