import esbuild from "esbuild";
import process from "process";
import { builtinModules as builtins } from "module";
import esbuildSvelte from "esbuild-svelte";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	target: "es2022",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	outfile: "main.js",
	plugins: [
		esbuildSvelte({
			compilerOptions: {
				css: "injected",
			},
			// Suppress Svelte a11y warnings — Obsidian plugins are desktop apps,
			// not public web pages, so strict a11y lint isn't applicable here.
			filterWarnings: (w) => !w.code.startsWith('a11y_') && w.code !== 'non_reactive_update',
		}),
	],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
