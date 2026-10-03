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
	/**
	 * U130L: true solo cuando hay descriptor registrado. Un id de registry
	 * (provider/kind/action) sin descriptor, o un id retirado, NO es
	 * publicable: habilita la proyeccion a `cell_toggle` existente sin
	 * inventar widget ni cell kind nuevos.
	 */
	isPublishable(id: string): boolean;
	/** Ids con descriptor registrado, en orden de registro. */
	registeredIds(): readonly string[];
	/**
	 * U130L: aplica un lote de decisiones persistidas sin disparar
	 * `onDecision` (ruta de carga). Los ids sin descriptor se ignoran con
	 * seguridad; el store que los conserva vive en settings, no aqui.
	 */
	restorePublished(decisions: Readonly<Record<string, boolean>>): void;
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

/**
 * U130L: decisiones Published persistidas. Clave = command id estable,
 * valor = publicado o no. Vive en PSS/settings (`sasiPublishedCommands`),
 * separado del SASI capability registry. Los ids retirados se conservan en
 * el store (no se podan) para no perder elecciones futuras.
 */
export type SasiPublishedStore = Record<string, boolean>;

export interface SasiCommandPublisherOptions {
	/**
	 * U130L: se llama solo en la ruta de toggle de usuario (`setPublished`
	 * con id publicable y cambio real de estado). La ruta de carga
	 * (`restorePublished`) nunca lo dispara: main.ts persiste el lote una
	 * sola vez tras restaurar. Asi el inspector, que ya llama a
	 * `setPublished`, persiste sin tocar su modal.
	 */
	onDecision?: (id: string, published: boolean) => void;
}

/**
 * U130L: decision efectiva para un comando. La preferencia guardada gana;
 * el default explicito solo se usa cuando no hay preferencia previa.
 * Compatibilidad de datos: `stored` puede ser undefined (data.json viejo).
 */
export function resolveSasiPublishedDecision(
	id: string,
	stored: Readonly<Record<string, boolean>> | undefined,
	defaultPublished: boolean,
): boolean {
	const saved = stored?.[id];
	return typeof saved === 'boolean' ? saved : defaultPublished;
}

/**
 * U130L: decisiones efectivas para todos los comandos registrados.
 * Los ids retirados (en `stored` pero no en `registeredIds`) no se
 * aplican aqui; `mergeSasiPublishedStore` los conserva en el store.
 */
export function effectiveSasiPublishedDecisions(
	registeredIds: readonly string[],
	stored: Readonly<Record<string, boolean>> | undefined,
	defaultFor: (id: string) => boolean,
): Record<string, boolean> {
	const effective: Record<string, boolean> = {};
	for (const id of registeredIds) {
		effective[id] = resolveSasiPublishedDecision(
			id,
			stored,
			defaultFor(id),
		);
	}
	return effective;
}

/**
 * U130L: fusiona lo efectivo con lo guardado conservando los ids retirados.
 * Nunca borra claves: un comando que vuelve recupera su eleccion futura.
 */
export function mergeSasiPublishedStore(
	stored: Readonly<Record<string, boolean>> | undefined,
	effective: Readonly<Record<string, boolean>>,
): Record<string, boolean> {
	return { ...(stored ?? {}), ...effective };
}

export function createSasiCommandPublisher(
	plugin: PluginLike,
	options?: SasiCommandPublisherOptions,
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
			// U130L: solo un descriptor registrado es publicable. Un
			// provider/kind/action del registry sin descriptor, o un id
			// retirado, se ignora con seguridad: sin addCommand, sin throw
			// (contrato de degradacion, como `registry.resolve`) y sin
			// ensuciar el store persistido.
			const entry = commands.get(id);
			if (!entry) return;
			if (published && !entry.published) {
				publish(entry);
				options?.onDecision?.(id, true);
			} else if (!published && entry.published) {
				unpublish(entry);
				options?.onDecision?.(id, false);
			}
		},
		isPublished(id) {
			return commands.get(id)?.published ?? false;
		},
		isPublishable(id) {
			return descriptors.has(id);
		},
		registeredIds() {
			return [...descriptors.keys()];
		},
		restorePublished(decisions) {
			for (const [id, published] of Object.entries(decisions)) {
				const entry = commands.get(id);
				// Ids retirados o sin descriptor: ignorar sin perder nada.
				// El store de settings los conserva para elecciones futuras.
				if (!entry) continue;
				if (published && !entry.published) {
					publish(entry);
				} else if (!published && entry.published) {
					unpublish(entry);
				}
			}
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
