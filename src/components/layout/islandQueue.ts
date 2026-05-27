import { setIcon } from 'obsidian';
import type { OperationQueueService } from '../../services/serviceOperationQueue';
import { translate } from '../../i18n/index';

/**
 * In-frame floating island showing the pending operation queue.
 * Rendered above the bottom nav bar, slides up from below.
 *
 * Structure (top → bottom inside island):
 *   header ("N pending changes")
 *   squircle buttons: Execute ▶ · Clear ✕ · Details ☰
 *   scrollable item list
 *
 * Height grows with content up to 70vh, then scrolls internally.
 */
export class QueueIslandComponent {
	private containerEl: HTMLElement;
	private queueService: OperationQueueService;
	private onClose: () => void;
	private onOpenDetails: () => void;

	private islandEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;

	constructor(
		containerEl: HTMLElement,
		_app: unknown,
		queueService: OperationQueueService,
		onClose: () => void,
		onOpenDetails: () => void
	) {
		this.containerEl = containerEl;
		this.queueService = queueService;
		this.onClose = onClose;
		this.onOpenDetails = onOpenDetails;
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({ cls: 'vaultman-queue-island' });

		// 1. Squircle action buttons (Now first, floating above body via CSS)
		const btnRow = this.islandEl.createDiv({ cls: 'vaultman-squircle-row vaultman-queue-island-btns' });

		const clearBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: { 'aria-label': translate('ops.clear'), role: 'button', tabindex: '0' },
		});
		setIcon(clearBtn, 'lucide-trash'); // Changed from x to trash for "Clear queue"
		clearBtn.addEventListener('click', () => {
			this.queueService.clear();
			this.onClose();
		});

		const detailsBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: { 'aria-label': translate('ops.details'), role: 'button', tabindex: '0' },
		});
		setIcon(detailsBtn, 'lucide-list');
		detailsBtn.addEventListener('click', () => {
			this.onOpenDetails();
		});

		const templateBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: { 'aria-label': 'Templates', role: 'button', tabindex: '0' },
		});
		setIcon(templateBtn, 'lucide-library');
		templateBtn.addEventListener('click', () => {
			// Stub for future templates feature
		});

		const executeBtn = btnRow.createDiv({
			cls: 'vaultman-squircle is-accent',
			attr: { 'aria-label': translate('ops.apply'), role: 'button', tabindex: '0' },
		});
		setIcon(executeBtn, 'lucide-play');
		executeBtn.addEventListener('click', () => {
			void this.queueService.execute();
			this.onClose();
		});

		// 2. Header — count label (Now below squircles)
		this.headerEl = this.islandEl.createDiv({ cls: 'vaultman-queue-island-header' });

		// 3. Scrollable item list
		this.listEl = this.islandEl.createDiv({ cls: 'vaultman-queue-island-list' });

		this.render();

		// Slide in after next frame so CSS transition fires
		window.requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		const queue = this.queueService.queue;

		const pendingLabel = translate('queue.island.pending');
		this.headerEl.setText(`${queue.length} ${pendingLabel}`);

		this.listEl.empty();
		if (queue.length === 0) {
			this.listEl.createDiv({ cls: 'vaultman-queue-island-empty', text: translate('queue.island.empty') });
			return;
		}

		for (const change of queue) {
			const rowEl = this.listEl.createDiv({ cls: 'vaultman-queue-island-row' });
			const fileCount = change.files.length;
			rowEl.createSpan({
				cls: 'vaultman-queue-island-row-files',
				text: `${fileCount} file${fileCount !== 1 ? 's' : ''}`,
			});
			rowEl.createSpan({
				cls: 'vaultman-queue-island-row-detail',
				text: change.details,
			});
		}
	}

	destroy(): void {
		this.islandEl?.remove();
		this.islandEl = null;
		this.listEl = null;
		this.headerEl = null;
	}
}
