type TFile = { path: string };

declare const app: {
	vault: {
		read(file: TFile): Promise<string>;
		cachedRead(file: TFile): Promise<string>;
		getFiles(): TFile[];
		getMarkdownFiles(): TFile[];
	};
};

export async function readEveryFile(files: TFile[]): Promise<string[]> {
	return Promise.all(files.map(async (file) => app.vault.read(file)));
}

export async function cachedReadEveryFile(allFiles: TFile[]): Promise<string[]> {
	return Promise.all(allFiles.map((file) => app.vault.cachedRead(file)));
}

export async function readDirectVaultFiles(): Promise<string[]> {
	return Promise.all(app.vault.getFiles().map((file) => app.vault.read(file)));
}

export async function readDirectMarkdownFiles(): Promise<string[]> {
	return Promise.all(app.vault.getMarkdownFiles().map((file) => app.vault.cachedRead(file)));
}

export async function readChunked(files: TFile[]): Promise<string[]> {
	const out: string[] = [];
	const chunkSize = 20;
	for (let i = 0; i < files.length; i += chunkSize) {
		const chunk = files.slice(i, i + chunkSize);
		out.push(...(await Promise.all(chunk.map((file) => app.vault.cachedRead(file)))));
	}
	return out;
}

export async function readSelectedFiles(selectedFiles: TFile[]): Promise<string[]> {
	return Promise.all(selectedFiles.map((file) => app.vault.read(file)));
}

export async function readExplicitPair(left: TFile, right: TFile): Promise<string[]> {
	return Promise.all([app.vault.read(left), app.vault.cachedRead(right)]);
}

export async function inspectFileNames(files: TFile[]): Promise<string[]> {
	return Promise.all(files.map(async (file) => file.path));
}
