import { getIcon, setIcon } from 'obsidian';

export function renderIconValue(
	element: HTMLElement,
	icon: string,
	color?: string,
): void {
	if (getIcon(icon)) {
		setIcon(element, icon);
	} else {
		element.empty();
		element.createSpan({
			cls: 'vaultman-icon-text iconic-emoji',
			text: icon,
		});
	}
	if (color) element.style.setProperty('color', color);
}
