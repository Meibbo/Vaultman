import { setIcon, type App } from 'obsidian';

const WIKILINK = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function renderPropertyValue(
	container: HTMLElement,
	raw: string,
	type: string,
	app: App,
): void {
	if (type === 'checkbox') {
		const checkbox = container.createEl('input', {
			type: 'checkbox',
			cls: 'metadata-input-checkbox vaultman-property-value-checkbox',
		});
		checkbox.checked = !['', 'false', '0', 'no', 'none', 'null'].includes(
			raw.trim().toLowerCase(),
		);
		checkbox.disabled = true;
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

	if (
		(type === 'date' || type === 'datetime') &&
		!Number.isNaN(Date.parse(raw))
	) {
		const dateParts = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		const instant =
			type === 'date' && dateParts
				? new Date(
						Number(dateParts[1]),
						Number(dateParts[2]) - 1,
						Number(dateParts[3]),
					)
				: new Date(raw);
		const dateText =
			type === 'datetime'
				? instant.toLocaleString()
				: instant.toLocaleDateString();
		container.createSpan({
			cls: 'vaultman-property-value-date',
			text: dateText,
		});
		const day = raw.slice(0, 10);
		if (DATE.test(day)) {
			const dailyNote = container.createEl('button', {
				type: 'button',
				cls: 'clickable-icon vaultman-property-value-daily-note',
				attr: { 'aria-label': `Open daily note ${day}` },
			});
			setIcon(dailyNote, 'lucide-calendar-arrow-up');
			dailyNote.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				void app.workspace.openLinkText(day, '', false);
			});
		}
		return;
	}

	container.createSpan({ cls: 'vaultman-property-value-text', text: raw });
}
