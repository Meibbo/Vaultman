import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * AC#1 import-boundary guard for the Q4 logic-extraction (slice 3).
 *
 * A `logic*` module must be importable without `obsidian`, Svelte, or DOM in its
 * dependency graph. We walk the static relative-import graph starting at
 * `src/logic/logicTags.ts` and assert no module in that graph imports `obsidian`
 * (or anything ending in `.svelte`). Cheap, deterministic, runs in `node`.
 * Mirrors `logicFilesBoundary.test.ts` / `logicPropsBoundary.test.ts`.
 */

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '../../../src');

const IMPORT_RE = /\bimport\b[^'"]*['"]([^'"]+)['"]/g;
const EXPORT_FROM_RE = /\bexport\b[^'"]*\bfrom\b\s*['"]([^'"]+)['"]/g;

function collectSpecifiers(source: string): string[] {
	const out: string[] = [];
	for (const re of [IMPORT_RE, EXPORT_FROM_RE]) {
		re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(source)) !== null) out.push(m[1]);
	}
	return out;
}

function resolveModule(fromFile: string, spec: string): string | null {
	if (!spec.startsWith('.')) return null; // bare import (e.g. 'obsidian') — not a file to walk
	const base = resolve(dirname(fromFile), spec);
	const candidates = [base, `${base}.ts`, `${base}.svelte.ts`, `${base}/index.ts`];
	for (const c of candidates) {
		if (existsSync(c) && c.endsWith('.ts')) return c;
	}
	return null;
}

function walkGraph(entry: string): { files: string[]; bareImports: Set<string> } {
	const visited = new Set<string>();
	const bareImports = new Set<string>();
	const stack = [entry];
	while (stack.length > 0) {
		const file = stack.pop()!;
		if (visited.has(file)) continue;
		visited.add(file);
		const source = readFileSync(file, 'utf8');
		for (const spec of collectSpecifiers(source)) {
			if (spec.startsWith('.')) {
				const resolved = resolveModule(file, spec);
				if (resolved) stack.push(resolved);
			} else {
				bareImports.add(spec.replace(/\/.*$/, '')); // package root
			}
		}
	}
	return { files: [...visited], bareImports };
}

describe('logicTags import boundary (AC#1)', () => {
	const entry = resolve(srcRoot, 'logic/logicTags.ts');

	it('logicTags.ts exists', () => {
		expect(existsSync(entry)).toBe(true);
	});

	it('does not import obsidian anywhere in its static graph', () => {
		const { bareImports } = walkGraph(entry);
		expect([...bareImports]).not.toContain('obsidian');
	});

	it('does not pull any .svelte module into its graph', () => {
		const { files } = walkGraph(entry);
		expect(files.filter((f) => f.includes('.svelte'))).toEqual([]);
	});
});

describe('logicExplorerHierarchy import boundary (AC#1)', () => {
	const entry = resolve(srcRoot, 'logic/logicExplorerHierarchy.ts');

	it('logicExplorerHierarchy.ts exists', () => {
		expect(existsSync(entry)).toBe(true);
	});

	it('does not import obsidian anywhere in its static graph', () => {
		const { bareImports } = walkGraph(entry);
		expect([...bareImports]).not.toContain('obsidian');
	});

	it('does not pull any .svelte module into its graph', () => {
		const { files } = walkGraph(entry);
		expect(files.filter((f) => f.includes('.svelte'))).toEqual([]);
	});
});
