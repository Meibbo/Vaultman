#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createGenerator } from 'unocss';
import * as sass from 'sass';
import createJiti from 'jiti';

const jiti = createJiti(import.meta.url);
const unoConfig = jiti('../uno.config.ts').default;
const { allShortcuts } = jiti('../src/styles/shortcuts/index.ts');

async function buildStyles() {
	console.log('🎨 Compiling UnoCSS & Modular SCSS Style System...');

	// 1. Generate UnoCSS rules for all shortcuts and safelist
	const uno = await createGenerator(unoConfig);
	const shortcutTokens = allShortcuts.map(([name]) => typeof name === 'string' ? name : '').filter(Boolean);
	const tokensToGenerate = Array.from(new Set([...(unoConfig.safelist ?? []), ...shortcutTokens]));

	const unoResult = await uno.generate(tokensToGenerate);

	// 2. Compile SCSS Residual layers
	const scssResult = sass.compile('./src/styles/index.scss', {
		style: 'expanded',
	});

	// 3. Assemble monolithic replacement
	const header = `/* ==========================================================================
   Vaultman Style System (UnoCSS + SOLID Modular SCSS)
   Generated automatically via scripts/build-styles.mjs
   ========================================================================== */\n\n`;

	const rawFinalCss = `${header}/* --- UnoCSS Atomic Layer (~90%) --- */\n${unoResult.css}\n\n/* --- Residual SCSS Layer (~10%) --- */\n${scssResult.css}\n`;
	const finalCss = rawFinalCss
		.replace(/\[data-type=vaultman-frame\]/g, '[data-type="vaultman-frame"]')
		.replace(/\[data-type=vaultman-view\]/g, '[data-type="vaultman-view"]');

	await writeFile('./styles.css', finalCss, 'utf8');
	console.log(`✅ styles.css generated successfully (${Buffer.byteLength(finalCss, 'utf8')} bytes)`);
}

buildStyles().catch((err) => {
	console.error('❌ Failed to compile styles:', err);
	process.exit(1);
});
