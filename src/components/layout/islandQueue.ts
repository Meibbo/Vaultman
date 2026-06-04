import { setIcon } from 'obsidian';
import type { OperationQueueService } from '../../services/serviceOperationQueue';
import { translate } from '../../i18n/index';
import type { VaultmanPlugin } from '../../main';
import { openFilterTemplateMenu } from '../../utils/filterTemplateMenu';

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
	private plugin: VaultmanPlugin;
	private queueService: OperationQueueService;
	private onClose: () => void;
	private onOpenDetails: () => void;

	private islandEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: VaultmanPlugin,
		queueService: OperationQueueService,
		onClose: () => void,
		onOpenDetails: () => void
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
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
			attr: { 'aria-label': translate('filters.popup.templates'), role: 'button', tabindex: '0' },
		});
		setIcon(templateBtn, 'lucide-library');
		templateBtn.addEventListener('click', (event) => {
			openFilterTemplateMenu(this.plugin, event, this.onClose);
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
			const modeRow = this.listEl.createDiv({ cls: 'vaultman-queue-mode-toggle' });
			const stageBtn = modeRow.createEl('button', {
				cls: `vaultman-queue-mode-btn${this.queueService.operationMode === 'stage' ? ' is-active' : ''}`,
				text: translate('queue.mode.stage'),
			});
			stageBtn.addEventListener('click', () => {
				this.queueService.setOperationMode('stage');
				this.render();
			});
			const bypassBtn = modeRow.createEl('button', {
				cls: `vaultman-queue-mode-btn${this.queueService.operationMode === 'bypass' ? ' is-active' : ''}`,
				text: translate('queue.mode.bypass'),
			});
			bypassBtn.addEventListener('click', () => {
				this.queueService.setOperationMode('bypass');
				this.render();
			});
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
