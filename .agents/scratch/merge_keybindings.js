import fs from 'fs';

function parseJsonc(content) {
	const clean = content
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*/g, '')
		.replace(/,(\s*[\]}])/g, '$1');
	return JSON.parse(clean);
}

const legacyPath = 'C:\\Users\\vic_A\\AppData\\Roaming\\Antigravity\\User\\keybindings.json';
const backupPath = 'C:\\Users\\vic_A\\AppData\\Roaming\\Antigravity IDE\\User\\keybindings.json.backup';
const outputPath = 'C:\\Users\\vic_A\\AppData\\Roaming\\Antigravity IDE\\User\\keybindings.json';

const legacy = parseJsonc(fs.readFileSync(legacyPath, 'utf8'));
const backup = parseJsonc(fs.readFileSync(backupPath, 'utf8'));

// Define our decisions:
// Keys where we want to keep ONLY the Legacy command, ignoring IDE backup:
const keepLegacyKeys = new Set([
	'ctrl+alt+w', 'ctrl+alt+a', 'ctrl+alt+s', 'ctrl+alt+d',         // Group movement (WASD)
	'shift+alt+w', 'shift+alt+a', 'shift+alt+s', 'shift+alt+d',     // Group focus (WASD)
	'ctrl+shift+alt+w', 'ctrl+shift+alt+a', 'ctrl+shift+alt+s', 'ctrl+shift+alt+d' // Tab move between groups
]);

// Keys where we want to keep ONLY the IDE command, ignoring Legacy:
const keepIdeKeys = new Set([
	'ctrl+q', 'ctrl+w',                  // Cerrar actions
	'ctrl+l',                            // Chat/ChatGPT focus
	'shift+alt+q', 'shift+alt+e',        // Tab move left/right inside group
	'ctrl+g',                            // GitLens Graph
	'ctrl+6', 'alt+6'                    // Replaced by alt+t toggle
]);

// 1. Process Legacy bindings
const finalBindings = [];

legacy.forEach(leg => {
	// If it's a key where we want the IDE version, discard the legacy one
	if (keepIdeKeys.has(leg.key)) {
		return;
	}
	finalBindings.push(leg);
});

// 2. Process IDE Backup bindings
backup.forEach(bac => {
	// If it's a key where we want the Legacy version (or we want to exclude for alt+t toggle), discard the IDE one
	if (keepLegacyKeys.has(bac.key) || bac.key === 'ctrl+6' || bac.key === 'alt+6') {
		return;
	}
	
	// Avoid exact duplicates (same key and command)
	const exists = finalBindings.some(b => b.key === bac.key && b.command === bac.command);
	if (!exists) {
		finalBindings.push(bac);
	}
});

// 3. Append the custom alt+t toggle cycler for editor tabs
finalBindings.push({
	"key": "alt+t",
	"command": "settings.cycle",
	"args": {
		"id": "workbench.editor.showTabs",
		"values": [
			"multiple",
			"none"
		]
	}
});

fs.writeFileSync(outputPath, JSON.stringify(finalBindings, null, 2));
console.log(`Cleanly merged keybindings: ${finalBindings.length} bindings written.`);
