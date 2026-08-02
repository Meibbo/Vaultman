export interface NativeMenuHandle {
	hide(): void;
	onHide(callback: () => void): void;
}

export interface MenuSessionOwner {
	key: string;
	generation: number;
}

export class MenuSession {
	private activeMenu: NativeMenuHandle | null = null;
	private activeOwner: MenuSessionOwner | null = null;

	toggle(owner: MenuSessionOwner, open: () => NativeMenuHandle): void {
		if (
			this.activeOwner &&
			this.activeOwner.key === owner.key &&
			this.activeOwner.generation === owner.generation
		) {
			this.close();
			return;
		}
		this.replace(owner, open);
	}

	replace(owner: MenuSessionOwner, open: () => NativeMenuHandle): void {
		this.close();
		const menu = open();
		this.activeMenu = menu;
		this.activeOwner = owner;

		menu.onHide(() => {
			if (this.activeMenu === menu) {
				this.activeMenu = null;
				this.activeOwner = null;
			}
		});
	}

	closeGeneration(generation: number): void {
		if (this.activeOwner && this.activeOwner.generation <= generation) {
			this.close();
		}
	}

	close(): void {
		if (this.activeMenu) {
			const menu = this.activeMenu;
			this.activeMenu = null;
			this.activeOwner = null;
			menu.hide();
		}
	}
}
