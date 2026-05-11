export type AddonsPane = 'stats' | 'markdown';

export class AddonsIslandService {
	activePane = $state<AddonsPane>('stats');
	notePath = $state<string | null>(null);

	openNote(path: string): void {
		this.notePath = path;
		this.activePane = 'markdown';
	}

	showStats(): void {
		this.activePane = 'stats';
		this.notePath = null;
	}
}
