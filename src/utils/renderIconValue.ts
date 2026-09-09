import { getIcon, setIcon } from 'obsidian';

import { translate } from '../i18n/index';

/**
 * Prefixes that name an icon-pack entry rather than literal content. When the
 * running Obsidian no longer ships the entry (lucide dropped its brand icons,
 * e.g. codepen), printing the id as text is never what the row means — but
 * plain values keep the emoji-as-text path below, which villages like the
 * Iconic emoji overrides rely on.
 */
const ICON_ID_PREFIXES = ['lucide-'];

export function renderIconValue(
	element: HTMLElement,
	icon: string,
	color?: string,
): void {
	if (getIcon(icon)) {
		setIcon(element, icon);
	} else if (ICON_ID_PREFIXES.some((prefix) => icon.startsWith(prefix))) {
		element.empty();
		element.createSpan({
			cls: 'vaultman-icon-text vaultman-icon-missing',
			text: translate('icon.not_found'),
		});
	} else {
		element.empty();
		element.createSpan({
			cls: 'vaultman-icon-text iconic-emoji',
			text: icon,
		});
	}
	if (color) element.style.setProperty('color', color);
}
