// Pure alias-token helpers for the "Notes for Nodes" system.
// These complement the existing NodeBindingService (serviceNodeBinding.ts)
// by providing prefix-based formatters without coupling to Obsidian app state.
//
// Canonical alias table:
//   Tag        →  #tagname
//   Snippet    →  $snippetname (without .css)
//   Plugin     →  %pluginid
//   Property   →  [propname]
//   Outline    →  [[file#header]]

export function aliasForTag(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function aliasForSnippetFile(filename: string): string {
	if (!filename) return '';
	return `$${filename.replace(/\.css$/i, '')}`;
}

export function aliasForPluginId(id: string): string {
	if (!id) return '';
	return `%${id}`;
}

export function aliasForProperty(name: string): string {
	if (!name) return '';
	const cleaned = name.replace(/^\[|\]$/g, '');
	return `[${cleaned}]`;
}

export function aliasForOutlineHeader(file: { basename: string }, header: string): string {
	return `[[${file.basename}#${header}]]`;
}
