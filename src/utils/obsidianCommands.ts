import type { App } from 'obsidian';

import type { CommandDescriptor } from '../logic/logicCommandActions';

/**
 * BT5-023 / BT5-024: thin, safe accessor over Obsidian's internal command
 * registry (`app.commands`), which the public type does not expose. Everything
 * is defensive so a shape change never throws into the toolbar or settings.
 */
interface InternalCommandsApi {
	listCommands?(): { id: string; name: string; icon?: string }[];
	executeCommandById?(id: string): boolean;
	commands?: Record<string, { id: string; name: string; icon?: string }>;
}

function commandsApi(app: App): InternalCommandsApi | null {
	const api = (app as App & { commands?: InternalCommandsApi }).commands;
	return api ?? null;
}

export function listObsidianCommands(app: App): CommandDescriptor[] {
	try {
		const api = commandsApi(app);
		if (!api) return [];
		const raw = api.listCommands?.() ?? Object.values(api.commands ?? {});
		return raw
			.filter((command) => command && typeof command.id === 'string')
			.map((command) => ({
				id: command.id,
				name: typeof command.name === 'string' ? command.name : command.id,
				...(command.icon ? { icon: command.icon } : {}),
			}));
	} catch {
		return [];
	}
}

/** Run a command by id. Returns whether Obsidian reported it as executed. */
export function executeObsidianCommand(app: App, id: string): boolean {
	try {
		return commandsApi(app)?.executeCommandById?.(id) === true;
	} catch {
		return false;
	}
}

export function obsidianCommandExists(app: App, id: string): boolean {
	return listObsidianCommands(app).some((command) => command.id === id);
}
