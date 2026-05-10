type HtmlElement = {
	innerHTML: string;
	outerHTML: string;
	textContent: string;
	insertAdjacentHTML(position: string, html: string): void;
};

type TFile = { path: string };

type VaultAdapter = {
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	rename(oldPath: string, newPath: string): Promise<void>;
	exists(path: string): Promise<boolean>;
};

declare const element: HtmlElement;
declare const adapter: VaultAdapter;
declare const app: {
	vault: {
		adapter: VaultAdapter;
		getAbstractFileByPath(path: string): unknown;
		create(path: string, data: string): Promise<void>;
		rename(file: TFile, path: string): Promise<void>;
		read(file: TFile): Promise<string>;
	};
};

declare const file: TFile;
declare const moduleName: string;
declare function getUserHtml(): string;
declare function getUserPath(): string;
declare function safeVaultPath(path: string): string;
declare function sanitizeHtml(html: string): string;

export async function unsafeDynamicCode(source: string): Promise<unknown> {
	eval(source); // eslint-disable-line no-eval
	new Function(source);
	Function(source);
	return import(moduleName);
}

export async function safeStaticImport(): Promise<unknown> {
	return import("./known-module");
}

export function unsafeDynamicHtml(): void {
	element.innerHTML = getUserHtml();
	element.outerHTML = getUserHtml();
	element.insertAdjacentHTML("beforeend", getUserHtml());
}

export function safeHtmlAlternatives(): void {
	element.textContent = getUserHtml();
	element.innerHTML = "<span>safe</span>";
	element.outerHTML = sanitizeHtml(getUserHtml());
	element.insertAdjacentHTML("beforeend", "<span>safe</span>");
}

export async function unsafeDynamicPaths(): Promise<void> {
	await adapter.read(getUserPath());
	await app.vault.adapter.write(getUserPath(), "data");
	await app.vault.adapter.rename("old.md", getUserPath());
	app.vault.getAbstractFileByPath(getUserPath());
	await app.vault.create(getUserPath(), "body");
	await app.vault.rename(file, getUserPath());
}

export async function safePathAlternatives(): Promise<void> {
	await adapter.read("known.md");
	await app.vault.adapter.write(safeVaultPath(getUserPath()), "data");
	app.vault.getAbstractFileByPath("known.md");
	await app.vault.read(file);
}
