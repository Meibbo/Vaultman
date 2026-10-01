/**
 * U130-? SASI -> Obsidian command bridge.
 *
 * Unico sitio donde se llama a `Plugin.addCommand`/`Plugin.removeCommand`.
 * Cada SASI entry puede publicarse como comando de Obsidian (toggle ON) o
 * retirarse (toggle OFF). El toggle es POR entry y se puede cambiar en
 * caliente, sin recargar el plugin.
 *
 * El command id que recibe `addCommand` es el id SASI estable. `Obsidian`
 * lo prefijara automaticamente con `vaultman:` en el palette: los ids de
 * los 5 comandos preexistentes (`apply-queue`, `open`, `open-updates`,
 * `focus-content-search`, `focus-active-explorer-search`) se preservan
 * exactamente para no romper atajos asignados por el usuario.
 */export type SasiCommandHandler = () => void | Promise<void>;

export type SasiCheckableHandler = (checking: boolean) => boolean;

export interface SasiCommandDescriptor {
	id: string;
	name: string;
	handler: SasiCommandHandler | SasiCheckableHandler;
	checkable?: boolean;
}

interface PublishedCommand {
	id: string;
	descriptor: SasiCommandDescriptor;
	published: boolean;
}

export interface SasiCommandPublisher {
	register(descriptor: SasiCommandDescriptor): void;
	setPublished(id: string, published: boolean): void;
	isPublished(id: string): boolean;
	publishedIds(): readonly string[];
	revokeAll(): void;
	snapshot(): readonly PublishedCommand[];
}

export interface PluginLike {
	addCommand(command: {
		id: string;
		name: string;
		callback?: () => unknown;
		checkCallback?: (checking: boolean) => unknown;
	}): unknown;
	removeCommand(commandId: string): void;
}

/**
 * Decide si un descriptor es `checkable` o no mirando la aridad del handler:
 * 1 argumento -> checkCallback; 0 -> callback. Asi los consumidores del
 * bridge (main.ts) no tienen que decir explicitamente cual usan.
 */
function isCheckable(
	handler: SasiCommandHandler | SasiCheckableHandler,
): handler is SasiCheckableHandler {
	return handler.length >= 1;
}

export function createSasiCommandPublisher(
	plugin: PluginLike,
): SasiCommandPublisher {
	const commands = new Map<string, PublishedCommand>();
	const descriptors = new Map<string, SasiCommandDescriptor>();

	const publish = (entry: PublishedCommand): void => {
		if (
			entry.descriptor.checkable ??
			isCheckable(entry.descriptor.handler)
		) {
			plugin.addCommand({
				id: entry.descriptor.id,
				name: entry.descriptor.name,
				checkCallback: (checking) =>
					(entry.descriptor.handler as SasiCheckableHandler)(
						checking,
					),
			});
		} else {
			plugin.addCommand({
				id: entry.descriptor.id,
				name: entry.descriptor.name,
				callback: () =>
					(entry.descriptor.handler as SasiCommandHandler)(),
			});
		}
		entry.published = true;
	};

	const unpublish = (entry: PublishedCommand): void => {
		plugin.removeCommand(entry.descriptor.id);
		entry.published = false;
	};

	return {
		register(descriptor) {
			if (descriptors.has(descriptor.id)) {
				throw new Error(
					`SASI command publisher: id duplicado: ${descriptor.id}`,
				);
			}
			descriptors.set(descriptor.id, descriptor);
			commands.set(descriptor.id, {
				id: descriptor.id,
				descriptor,
				published: false,
			});
		},
		setPublished(id, published) {
			const entry = commands.get(id);
			if (!entry) {
				throw new Error(
					`SASI command publisher: id no registrado: ${id}`,
				);
			}
			if (published && !entry.published) {
				publish(entry);
			} else if (!published && entry.published) {
				unpublish(entry);
			}
		},
		isPublished(id) {
			return commands.get(id)?.published ?? false;
		},
		publishedIds() {
			const ids: string[] = [];
			for (const entry of commands.values()) {
				if (entry.published) ids.push(entry.id);
			}
			return ids;
		},
		revokeAll() {
			for (const entry of commands.values()) {
				if (entry.published) {
					plugin.removeCommand(entry.descriptor.id);
					entry.published = false;
				}
			}
		},
		snapshot() {
			return [...commands.values()];
		},
	};
}
