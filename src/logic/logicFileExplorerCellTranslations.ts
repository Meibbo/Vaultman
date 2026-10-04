import { gateSubject, selectorList } from './logicNativeSelectorBridge';
import type { ExplorerCellProvider } from '../services/serviceExplorerCellContributions';

/** Isolated legacy selector adapters, not native Obsidian behavior. They read
 * contributions already emitted on FileExplorer items. No plugin imports,
 * controllers, counting/formatting reimplementations or runtime dependencies.
 */
export const fileExplorerCellTranslations: readonly ExplorerCellProvider[] = [
	{
		id: 'file-explorer-icon',
		translate: ({ nativeRow }) => {
			const element = nativeRow?.querySelector<HTMLElement>('.iconize-icon[data-icon]');
			return element ? [{ id: 'icon', kind: 'icon', element }] : [];
		},
	},
	{
		id: 'file-explorer-annotation',
		translate: ({ nativeRow, nativePseudos }) => {
			const text = nativeRow?.getAttribute('data-novel-word-count-plugin');
			return text && nativePseudos.after ? [{ id: 'file-explorer-annotation', kind: 'text', text, replacesPseudo: 'after' }] : [];
		},
		cssAliases: (selectorText) => {
			if (!selectorText.includes('.novel-word-count--')) return [];
			return selectorList(selectorText).filter(selector => selector.trim().endsWith('::after'))
				.map(selector => gateSubject(selector.replace(/::after\s*$/, ' > span:where([data-cell="file-explorer-annotation"])'), 'files'));
		},
	},
];
