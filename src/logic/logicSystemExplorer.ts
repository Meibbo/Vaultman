import { Platform, type App } from 'obsidian';
import { translate } from '../i18n/index';

export const SNIPPET_REVEAL_ACTION_ID = 'snippet.reveal';
export const REVEAL_IN_SYSTEM_EXPLORER_ICON = 'lucide-arrow-up-right';

interface AppWithSystemExplorer extends App {
	showInFolder?(path: string): void;
}

export function systemExplorerRevealLabel(): string {
	return translate(
		Platform.isMacOS
			? 'snippet.reveal_finder'
			: 'snippet.reveal_system_explorer',
	);
}

export function canRevealInSystemExplorer(app: App): boolean {
	return typeof (app as AppWithSystemExplorer).showInFolder === 'function';
}

export function revealInSystemExplorer(app: App, path: string): boolean {
	const target = app as AppWithSystemExplorer;
	if (typeof target.showInFolder !== 'function' || !path) return false;
	target.showInFolder(path);
	return true;
}
