import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function block(source: string, selector: string): string {
	const start = source.indexOf(selector);
	expect(start).toBeGreaterThanOrEqual(0);
	const open = source.indexOf('{', start);
	expect(open).toBeGreaterThan(start);
	let depth = 0;
	for (let index = open; index < source.length; index += 1) {
		if (source[index] === '{') depth += 1;
		if (source[index] === '}') depth -= 1;
		if (depth === 0) return source.slice(open + 1, index);
	}
	throw new Error(`Unclosed block for ${selector}`);
}

function lastBlock(source: string, selector: string): string {
	const start = source.lastIndexOf(selector);
	expect(start).toBeGreaterThanOrEqual(0);
	const open = source.indexOf('{', start);
	expect(open).toBeGreaterThan(start);
	let depth = 0;
	for (let index = open; index < source.length; index += 1) {
		if (source[index] === '{') depth += 1;
		if (source[index] === '}') depth -= 1;
		if (depth === 0) return source.slice(open + 1, index);
	}
	throw new Error(`Unclosed block for ${selector}`);
}

function blockAfter(source: string, anchor: string, selector: string): string {
	const anchorIndex = source.indexOf(anchor);
	expect(anchorIndex).toBeGreaterThanOrEqual(0);
	const scopedSource = source.slice(anchorIndex);
	return block(scopedSource, selector);
}

describe('compact horizontal control scroll styles', () => {
	it('defines the shared hidden-scroll compact control mixin', () => {
		const source = readFileSync('src/styles/_mixins.scss', 'utf8');
		const mixin = block(source, '@mixin horizontal-control-scroll');

		expect(mixin).toContain('max-width: $max-width');
		expect(mixin).toContain('min-width: 0');
		expect(mixin).toContain('overflow-x: auto');
		expect(mixin).toContain('scrollbar-width: none');
		expect(mixin).toContain('justify-content: $justify');
		expect(mixin).toContain('&::-webkit-scrollbar');
	});

	it('applies scrollable compact controls to popup squircles and shared squircle rows', () => {
		const source = readFileSync('src/styles/popup/_islands.scss', 'utf8');

		expect(block(source, '.vm-popup-squircles')).toContain(
			'@include horizontal-control-scroll(safe center)',
		);
		expect(block(source, '&-btns')).toContain('@include horizontal-control-scroll(safe center)');
		expect(block(source, '.vm-squircle-row')).toContain(
			'@include horizontal-control-scroll(safe center)',
		);
		const sharedSquircle = blockAfter(source, '// Squircle action buttons', '.vm-squircle');
		expect(block(sharedSquircle, '&-row')).toContain('@include horizontal-control-scroll(safe center)');
	});

	it('applies scrollable compact controls to view mode, sort, and statistics pills', () => {
		const viewmode = readFileSync('src/styles/popup/_viewmode-popup.scss', 'utf8');
		const sort = readFileSync('src/styles/popup/_sort-popup.scss', 'utf8');
		const statistics = readFileSync('src/styles/components/_statistics.scss', 'utf8');

		expect(block(viewmode, '&-pills')).toContain('@include horizontal-control-scroll(flex-start)');
		expect(block(sort, '&-row')).toContain('@include horizontal-control-scroll(flex-start)');
		expect(block(statistics, '&-scope-pills')).toContain(
			'@include horizontal-control-scroll(safe center)',
		);
	});

	it('applies scrollable compact controls to dock and tab navigation bars', () => {
		const tabs = readFileSync('src/styles/nav/_tab-bar.scss', 'utf8');
		const nav = readFileSync('src/styles/nav/_v3-nav.scss', 'utf8');

		expect(block(tabs, '&-bar')).toContain('@include horizontal-control-scroll(safe center)');
		expect(block(nav, '&-dock')).toContain(
			'@include horizontal-control-scroll(safe center, min(100%, 72vw, 520px))',
		);
		expect(lastBlock(nav, '.vm-nav-dock')).toContain('max-width: min(100%, 72vw, 520px)');
	});
});
