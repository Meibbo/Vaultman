import { setIcon, type App } from 'obsidian';

const WIKILINK = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;
export function renderPropertyValue(
	container: HTMLElement,
	raw: string,
	type: string,
	app: App,
): void {
	if (type === 'checkbox') {
		const checkbox = container.createEl('input', {
			type: 'checkbox',
			cls: 'metadata-input-checkbox',
		});
		checkbox.checked = !['', 'false', '0', 'no', 'none', 'null'].includes(
			raw.trim().toLowerCase(),
		);
		checkbox.tabIndex = -1;
		checkbox.setAttribute('aria-readonly', 'true');
		checkbox.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
		return;
	}

	const wikilink = raw.trim().match(WIKILINK);
	if (wikilink) {
		const target = wikilink[1];
		const link = container.createEl('a', {
			cls: 'internal-link vaultman-property-value-link',
			text: wikilink[2] || target,
			href: target,
		});
		link.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void app.workspace.openLinkText(target, '', false);
		});
		return;
	}

	if ((type === 'date' || type === 'datetime') && !Number.isNaN(Date.parse(raw))) {
		const day = raw.slice(0, 10);
		if (type === 'date') {
			const dateInput = container.createEl('input', {
				type: 'date',
				cls: 'metadata-input metadata-input-text mod-date',
				attr: { max: '9999-12-31' },
			});
			dateInput.value = day;
			dateInput.readOnly = true;
			dateInput.tabIndex = -1;

			const dailyNote = container.createDiv({
				cls: 'clickable-icon',
				attr: { 'aria-label': `Open daily note ${day}` },
			});
			setIcon(dailyNote, 'lucide-link');
			dailyNote.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				void app.workspace.openLinkText(day, '', false);
			});
		} else {
			const dateTimeInput = container.createEl('input', {
				type: 'datetime-local',
				cls: 'metadata-input metadata-input-text mod-datetime',
				attr: { max: '9999-12-31T23:59' },
			});
			dateTimeInput.value = raw.slice(0, 16);
			dateTimeInput.readOnly = true;
			dateTimeInput.tabIndex = -1;
		}
		return;
	}

	container.createSpan({ cls: 'vaultman-property-value-text', text: raw });
}
