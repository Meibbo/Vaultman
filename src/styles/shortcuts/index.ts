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

export const allShortcuts: [string, string][] = [
	...shortcutsButtons,
	...shortcutsCards,
	...shortcutsNavigation,
	...shortcutsTree,
	...shortcutsTable,
	...shortcutsIslands,
];

export default allShortcuts;
