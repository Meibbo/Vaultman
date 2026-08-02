import { describe, expect, it } from 'vitest';
import type { TFile } from 'obsidian';

import {
	DEFAULT_COPY_RESULTS_OPTIONS,
	formatCopiedSearchResults,
} from '../../src/logic/logicCopySearchResults';

function file(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	return {
		basename: name.replace(/\.md$/, ''),
		extension: 'md',
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

const files = [file('notes/alpha.md'), file('beta.md')];

describe('copying search results the way core does', () => {
	it('lists short names with no decoration by default', () => {
		// Read off core's own builder: it copies a list of file links, one per
		// line — never the match text. Defaults are short name, no link style,
		// no list style.
		expect(formatCopiedSearchResults(files, DEFAULT_COPY_RESULTS_OPTIONS)).toBe(
			'alpha\nbeta',
		);
	});

	it('switches to the full path when asked', () => {
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				showFullPath: true,
			}),
		).toBe('notes/alpha.md\nbeta.md');
	});

	it('wraps in a wikilink around whichever name is showing', () => {
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				linkStyle: 'wikilink',
			}),
		).toBe('[[alpha]]\n[[beta]]');
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				showFullPath: true,
				linkStyle: 'wikilink',
			}),
		).toBe('[[notes/alpha.md]]\n[[beta.md]]');
	});

	it('uses the basename as the markdown label and the shown name as target', () => {
		// Core's own quirk, kept: the label is always `basename`, while the target
		// follows the path toggle.
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				showFullPath: true,
				linkStyle: 'markdown',
			}),
		).toBe('[alpha](notes/alpha.md)\n[beta](beta.md)');
	});

	it('applies the list style after the link style', () => {
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				linkStyle: 'wikilink',
				listStyle: 'dash',
			}),
		).toBe('- [[alpha]]\n- [[beta]]');
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				listStyle: 'asterisk',
			}),
		).toBe('* alpha\n* beta');
	});

	it('numbers from one, not from zero', () => {
		expect(
			formatCopiedSearchResults(files, {
				...DEFAULT_COPY_RESULTS_OPTIONS,
				listStyle: 'number',
			}),
		).toBe('1. alpha\n2. beta');
	});

	it('copies every matched file, with no cap', () => {
		// The scope is ours, so the list is ours: core's modal reads core's own
		// result set and cannot know about our folder or filter scope. That is
		// the reason this is reproduced rather than delegated.
		const many = Array.from({ length: 1000 }, (_, i) => file(`f${i}.md`));
		expect(
			formatCopiedSearchResults(many, DEFAULT_COPY_RESULTS_OPTIONS).split('\n'),
		).toHaveLength(1000);
	});

	it('produces nothing for an empty result set', () => {
		expect(formatCopiedSearchResults([], DEFAULT_COPY_RESULTS_OPTIONS)).toBe('');
	});
});
