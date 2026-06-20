import fs from 'fs';
import path from 'path';

// Helper to strip comments and trailing commas from JSON
function parseJsonc(content) {
	const clean = content
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*/g, '')
		.replace(/,(\s*[\]}])/g, '$1');
	return JSON.parse(clean);
}

const legacyPath = 'C:\\Users\\vic_A\\AppData\\Roaming\\Antigravity\\User\\keybindings.json';
const backupPath = 'C:\\Users\\vic_A\\AppData\\Roaming\\Antigravity IDE\\User\\keybindings.json.backup';

if (!fs.existsSync(legacyPath) || !fs.existsSync(backupPath)) {
	console.error('Files not found.');
	process.exit(1);
}

const legacy = parseJsonc(fs.readFileSync(legacyPath, 'utf8'));
const backup = parseJsonc(fs.readFileSync(backupPath, 'utf8'));

console.log(`Legacy keybindings: ${legacy.length}`);
console.log(`IDE Backup keybindings: ${backup.length}`);

// Map by key combinations to find overlapping mappings
const legacyByKey = {};
legacy.forEach(b => {
	if (!legacyByKey[b.key]) legacyByKey[b.key] = [];
	legacyByKey[b.key].push(b);
});

const backupByKey = {};
backup.forEach(b => {
	if (!backupByKey[b.key]) backupByKey[b.key] = [];
	backupByKey[b.key].push(b);
});

// Category 1: Key conflicts (same key mapped to different commands)
const conflicts = [];
const allKeys = new Set([...Object.keys(legacyByKey), ...Object.keys(backupByKey)]);

for (const key of allKeys) {
	const legBindings = legacyByKey[key] || [];
	const bacBindings = backupByKey[key] || [];

	if (legBindings.length > 0 && bacBindings.length > 0) {
		// Compare commands and when clauses
		legBindings.forEach(leg => {
			bacBindings.forEach(bac => {
				if (leg.command !== bac.command) {
					conflicts.push({
						key,
						legacyCommand: leg.command,
						legacyWhen: leg.when || 'none',
						ideCommand: bac.command,
						ideWhen: bac.when || 'none'
					});
				}
			});
		});
	}
}

// Category 2: Legacy unique keybindings (not present in IDE)
const legacyUnique = [];
legacy.forEach(leg => {
	const matching = (backupByKey[leg.key] || []).filter(b => b.command === leg.command);
	if (matching.length === 0) {
		legacyUnique.push(leg);
	}
});

// Category 3: IDE unique keybindings (not present in Legacy)
const ideUnique = [];
backup.forEach(bac => {
	const matching = (legacyByKey[bac.key] || []).filter(l => l.command === bac.command);
	if (matching.length === 0) {
		ideUnique.push(bac);
	}
});

// Write markdown report output
let md = `# Keybindings Reconciliation Analysis\n\n`;

md += `## Summary\n`;
md += `- **Legacy Keybindings (Old)**: ${legacy.length}\n`;
md += `- **IDE Keybindings (New Backup)**: ${backup.length}\n`;
md += `- **Key Overlaps / Potential Conflicts**: ${conflicts.length}\n`;
md += `- **Unique to Legacy**: ${legacyUnique.length}\n`;
md += `- **Unique to IDE**: ${ideUnique.length}\n\n`;

md += `## 1. Key Conflicts\n`;
md += `These are keys that bind different commands in the legacy configuration versus the active IDE backup:\n\n`;
md += `| Key | Legacy Command | Legacy When | IDE Backup Command | IDE Backup When |\n`;
md += `| :--- | :--- | :--- | :--- | :--- |\n`;
conflicts.forEach(c => {
	md += `| \`${c.key}\` | \`${c.legacyCommand}\` | \`${c.legacyWhen}\` | \`${c.ideCommand}\` | \`${c.ideWhen}\` |\n`;
});
md += `\n`;

md += `## 2. Unbinds / Mappings you disabled on purpose in IDE\n`;
md += `These are commands prefixed with \`-\` (unbound) in the IDE backup, but might still be active in legacy:\n\n`;
md += `| Key | Unbound IDE Command | Legacy Status |\n`;
md += `| :--- | :--- | :--- |\n`;

let unbindsFound = 0;
backup.forEach(bac => {
	if (bac.command.startsWith('-')) {
		const targetCommand = bac.command.slice(1);
		const legacyActive = legacy.find(leg => leg.key === bac.key && leg.command === targetCommand);
		md += `| \`${bac.key}\` | \`${bac.command}\` | ${legacyActive ? '⚠️ Active in Legacy' : 'Not in Legacy'} |\n`;
		unbindsFound++;
	}
});
if (unbindsFound === 0) {
	md += `| *None found* | | |\n`;
}
md += `\n`;

md += `## 3. Unique Legacy Keybindings\n`;
md += `These shortcuts were customized in the legacy Antigravity app but were completely missing from the IDE:\n\n`;
md += `| Key | Command | When |\n`;
md += `| :--- | :--- | :--- |\n`;
legacyUnique.forEach(l => {
	md += `| \`${l.key}\` | \`${l.command}\` | \`${l.when || 'always'}\` |\n`;
});
md += `\n`;

md += `## 4. Unique IDE Keybindings\n`;
md += `These shortcuts are new to the Antigravity IDE configuration and did not exist in your legacy settings:\n\n`;
md += `| Key | Command | When |\n`;
md += `| :--- | :--- | :--- |\n`;
ideUnique.forEach(i => {
	md += `| \`${i.key}\` | \`${i.command}\` | \`${i.when || 'always'}\` |\n`;
});

fs.writeFileSync('C:\\Users\\vic_A\\.gemini\\antigravity-ide\\brain\\87e5202c-66c8-43e4-ae3b-9791ee08020f\\keybindings_comparison.md', md);
console.log('Report generated at keybindings_comparison.md');
