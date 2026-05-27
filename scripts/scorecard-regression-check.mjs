import { readFileSync } from 'node:fs';

const checks = [
	{
		file: 'manifest.json',
		name: 'manifest description ends with punctuation',
		test: (text) => /[.!?]$/.test(JSON.parse(text).description ?? ''),
	},
	{
		file: 'src/i18n/index.ts',
		name: 'i18n uses Obsidian getLanguage instead of localStorage language',
		test: (text) => text.includes('getLanguage as getObsidianLanguage') && !text.includes('localStorage.getItem'),
	},
	{
		file: 'src/i18n/index.ts',
		name: 'i18n has no eslint disable directives',
		test: (text) => !text.includes('eslint-disable'),
	},
	{
		file: 'src/svelte.d.ts',
		name: 'svelte declarations avoid any and eslint disable',
		test: (text) => !text.includes('eslint-disable') && !/\bany\b/.test(text),
	},
	{
		file: 'src/VaultmanSettings.ts',
		name: 'settings uses activeDocument instead of document',
		test: (text) =>
			text.includes('activeDocument.body.toggleClass') &&
			!text.includes('document.body.toggleClass'),
	},
	{
		file: 'src/main.ts',
		name: 'main uses activeDocument instead of document',
		test: (text) =>
			text.includes('activeDocument.body.style.setProperty') &&
			!text.includes('document.body.style.setProperty'),
	},
	{
		file: 'src/components/layout/islandActiveFilters.ts',
		name: 'active filters island uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/components/layout/islandQueue.ts',
		name: 'queue island uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/components/layout/viewTree.ts',
		name: 'tree view uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/utils/inputModal.ts',
		name: 'input modal uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/modals/modalLinter.ts',
		name: 'linter modal uses window.setTimeout',
		test: (text) => text.includes('window.setTimeout('),
	},
	{
		file: 'src/services/serviceOperationQueue.ts',
		name: 'operation queue uses window.setTimeout',
		test: (text) => text.includes('window.setTimeout('),
	},
	{
		file: 'src/services/servicePropertyIndex.ts',
		name: 'property index uses window timers',
		test: (text) => text.includes('window.setTimeout(') && text.includes('window.clearTimeout('),
	},
];

const failures = [];

for (const check of checks) {
	const text = readFileSync(check.file, 'utf8');
	if (!check.test(text)) failures.push(`${check.file}: ${check.name}`);
}

if (failures.length > 0) {
	console.error('Scorecard regression scan failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Scorecard regression scan passed (${checks.length} checks).`);
