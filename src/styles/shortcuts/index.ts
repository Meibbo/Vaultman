import type { UserShortcuts } from 'unocss';
import { shortcutsButtons } from './buttons';
import { shortcutsCards } from './cards';
import { shortcutsNavigation } from './navigation';
import { shortcutsTree } from './tree';
import { shortcutsTable } from './table';
import { shortcutsIslands } from './islands';

export {
	shortcutsButtons,
	shortcutsCards,
	shortcutsNavigation,
	shortcutsTree,
	shortcutsTable,
	shortcutsIslands,
};

export const allShortcuts: UserShortcuts = [
	...shortcutsButtons,
	...shortcutsCards,
	...shortcutsNavigation,
	...shortcutsTree,
	...shortcutsTable,
	...shortcutsIslands,
];

export default allShortcuts;
