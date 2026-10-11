import type { App } from 'obsidian';

interface CommandPalettePlugin {
	instance?: {
		getCommands?: () => Array<{ id: string; name: string }>;
		modal?: {
			commands?: Array<unknown> | null;
			getItems?: () => Array<{ id: string; name: string }>;
		};
	};
}

interface ExtendedApp extends App {
	internalPlugins?: {
		getPluginById?(id: string): CommandPalettePlugin | null | undefined;
	};
}

let originalGetCommands: (() => Array<{ id: string; name: string }>) | null = null;
let installedOnInstance: unknown = null;

/**
 * Intercepts Obsidian's internal Command Palette projection.
 *
 * When a command is toggled to =off in apiScene, it is filtered out of
 * commandPalette.instance.getCommands(), suppressing its appearance in
 * the native command palette without disabling the command globally.
 */
export function installCommandPaletteFilter(
	app: App,
	isCommandPublished: (id: string) => boolean,
): () => void {
	const extApp = app as ExtendedApp;
	const cp = extApp.internalPlugins?.getPluginById?.('command-palette');
	const instance = cp?.instance;
	if (!instance || typeof instance.getCommands !== 'function') {
		return () => {};
	}

	if (installedOnInstance !== instance) {
		originalGetCommands = instance.getCommands.bind(instance);
		installedOnInstance = instance;
	}

	const orig = originalGetCommands!;
	instance.getCommands = function () {
		const list = orig();
		return list.filter((cmd) => isCommandPublished(cmd.id));
	};

	refreshCommandPaletteCache(app);

	return () => {
		if (installedOnInstance === instance && originalGetCommands) {
			instance.getCommands = originalGetCommands;
			installedOnInstance = null;
			originalGetCommands = null;
			refreshCommandPaletteCache(app);
		}
	};
}

/**
 * Invalidates the modal's cached commands array so the next open
 * re-queries instance.getCommands().
 */
export function refreshCommandPaletteCache(app: App): void {
	const extApp = app as ExtendedApp;
	const cp = extApp.internalPlugins?.getPluginById?.('command-palette');
	if (cp?.instance?.modal) {
		cp.instance.modal.commands = null;
	}
}
