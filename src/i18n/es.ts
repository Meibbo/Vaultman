export const es: Record<string, string> = {
	'settings.native_surface_click_primary': 'Acción de Click Primario Nativo',
	'settings.native_surface_click_primary.desc': 'Acción al hacer click en elementos nativos de Obsidian (breadcrumbs, tags, carpetas).',
	'settings.native_surface_click_alt': 'Acción de Alt+Click Nativo',
	'settings.native_surface_click_alt.desc': 'Acción al hacer Alt+Click en elementos nativos de Obsidian.',
	'settings.native_surface_click_mod': 'Acción de Mod+Click Nativo',
	'settings.native_surface_click_mod.desc': 'Acción al hacer Ctrl/Cmd-Click o click central en elementos nativos de Obsidian.',
	'settings.node_note_tag_pattern': 'Patrón node-note para tags',
	'settings.node_note_tag_pattern.desc': 'Patrón para bindings de tags. Usa "name" como placeholder para el nombre del tag. Por defecto "#name"',
	'settings.node_note_snippet_pattern': 'Patrón node-note para snippets',
	'settings.node_note_snippet_pattern.desc': 'Patrón para bindings de snippets. Usa "name" como placeholder. Por defecto "$name"',
	'settings.node_note_plugin_pattern': 'Patrón node-note para plugins',
	'settings.node_note_plugin_pattern.desc': 'Patrón para bindings de plugins. Usa "name" como placeholder. Por defecto "%name"',
	'settings.node_note_prop_pattern': 'Patrón node-note para props',
	'settings.node_note_prop_pattern.desc': 'Patrón para bindings de props. Usa "name" como placeholder. Por defecto "[name]". Cambiarlo prepara renames de alias para revisar.',
	'settings.node_note_prefix_migrated': 'Se prepararon {count} renames de alias para revisar',
	'settings.action.reveal_in_vaultman': 'Revelar en Vaultman Explorer',
	'settings.action.open_node_note_same_tab': 'Abrir Node-Note (misma pestaña)',
	'settings.action.open_node_note_new_tab': 'Abrir Node-Note (nueva pestaña)',
	'settings.action.search_selection': 'Buscar Selección',
	'settings.action.none': 'Ninguna (por defecto de Obsidian)',
	'context_menu.node_note': 'Abrir Node-Note',
	// General
	'plugin.name': 'Vaultman',
	'plugin.description':
		'Editor masivo de propiedades y herramienta de gestión de vault',
	'plugin.open': 'Abrir Vaultman',
	'common.cancel': 'Cancelar',
	'iconic.change_icon': 'Cambiar ícono',

	// Sections
	'section.filters': 'Filtros',
	'section.files': 'Archivos',
	'section.operations': 'Operaciones',

	// Filter types
	'filter.has_property': 'Con propiedad',
	'filter.missing_property': 'Sin propiedad',
	'filter.specific_value': 'Con valor',
	'filter.multiple_values': 'Sin valor',
	'filter.folder': 'En carpeta',
	'filter.folder_exclude': 'Sin carpeta',
	'filter.file_name': 'Con nombre',
	'filter.file_name_exclude': 'Sin nombre',
	'filter.text_contains': 'Con texto',
	'filter.text_not_contains': 'Sin texto',

	// Filter logic
	'filter.logic.all': 'TODOS (AND)',
	'filter.logic.any': 'ALGUNO (OR)',
	'filter.logic.none': 'NINGUNO (NOT)',

	// Filter actions
	'filter.add_rule': 'Agregar filtro',
	'filter.add_group': 'Agregar grupo',
	'filter.clear': 'Limpiar filtros',
	'filter.template': 'Plantilla',
	'filter.template.save': 'Guardar plantilla',
	'filter.template.delete': 'Eliminar plantilla',
	'filter.template.none': 'Sin plantilla',
	'filter.template.load': 'Cargar',
	'filter.refresh': 'Actualizar',
	'filter.create': 'Crear',
	'filter.tabs_btn': 'Pestañas',
	'filter.auto_reveal': 'Auto-revelar archivo actual',
	'filter.tools': 'Herramientas',
	'filter.expand_all': 'Expandir todo',
	'filter.collapse_all': 'Colapsar todo',

	// File list
	'files.search': 'Buscar archivos...',
	'files.select_all': 'Seleccionar todo',
	'files.select_none': 'Deseleccionar todo',
	'files.show_checked_only': 'Mostrar solo archivos marcados',
	'files.count': '{filtered} / {total} archivos',
	'files.bubble_dot': '{count} elementos ocultos con actividad',
	'payload_preview.view': 'Ver',
	'payload_preview.view_aria': 'Ver payload: {name}',
	'payload_preview.title': 'Vista previa del payload — {name}',
	'payload_preview.read_only':
		'Revisa lo que se cargará. Esta vista previa no cambia tu espacio de trabajo.',
	'payload_preview.warning_count': '{count} valores requieren atención.',
	'payload_preview.close': 'Cerrar',
	'payload_preview.section.overview': 'Resumen',
	'payload_preview.section.floating_toc': 'Índice flotante',
	'payload_preview.section.root_filter': 'Filtro raíz',
	'payload_preview.section.filter': 'Filtro {index}',
	'payload_preview.section.operation': 'Operación {index}',
	'payload_preview.note.default_applied': 'Se muestra el valor por defecto.',
	'payload_preview.note.generated_on_load': 'Se genera al cargar.',
	'payload_preview.note.ignored_field': 'Se ignora al cargar.',
	'payload_preview.note.invalid_shape': 'Este valor impide cargar el payload.',
	'payload_preview.note.migration_applied':
		'El valor heredado se migra al cargar.',
	'payload_preview.note.missing_field': 'Falta un valor requerido.',
	'payload_preview.note.resolved_on_load':
		'Se resuelve desde el contexto actual al cargar.',
	'payload_preview.note.unchanged': 'El valor actual se conserva.',
	'payload_preview.note.unknown_field':
		'Campo desconocido; se muestra para revisión.',
	'payload_preview.note.unknown_value':
		'Valor desconocido o futuro; se muestra el fallback si corresponde.',
	'files.col.name': 'Nombre',
	'files.col.file_name': 'file name',
	'files.col.props': 'Props',
	'files.col.words': 'Palabras',
	'files.col.ext': 'Ext',
	'files.col.file_ext': 'file extension',
	'files.col.path': 'Ruta',
	'files.col.file_folder': 'folder',
	'files.col.date': 'Fecha',
	'files.col.modified': 'Modificación',
	'files.col.created': 'Creación',
	'files.empty_filtered_title': 'No hay archivos que coincidan',
	'files.empty_filtered_desc': 'Prueba cambiar o limpiar los filtros activos.',

	// Operations
	'ops.properties': 'Propiedades',
	'ops.tools': 'Herramientas',
	'ops.queue': 'Cola ({count} pendientes)',
	'ops.queue.empty': 'Cola (vacía)',
	'ops.queue.warning': '{count} pendientes, {warnings} aviso(s)',
	'ops.apply': 'Aplicar',
	'ops.clear': 'Limpiar cola',
	'ops.details': 'Ver detalles',
	'ops.add_property': 'Agregar propiedad',
	'ops.add_property.unavailable':
		'Agregar una propiedad necesita el editor de clave inline, que aún no existe.',

	// Property manager
	'prop.title': 'Gestor de Propiedades',
	'prop.scope': 'Alcance',
	'prop.scope.filtered': 'Todos los archivos filtrados',
	'prop.scope.selected': 'Solo archivos seleccionados',
	'prop.property': 'Propiedad',
	'prop.value': 'Valor',
	'prop.value.empty': 'Vacío',
	'prop.action': 'Acción',
	'prop.action.set': 'Establecer / Crear',
	'prop.action.rename': 'Renombrar',
	'prop.action.delete': 'Eliminar',
	'prop.action.clean': 'Limpiar vacías',
	'prop.action.change_type': 'Cambiar tipo',
	'prop.action.add': 'Agregar',
	'prop.type': 'Tipo',
	'prop.type.text': 'Texto',
	'prop.type.number': 'Número',
	'prop.type.checkbox': 'Casilla',
	'prop.type.list': 'Lista',
	'prop.type.date': 'Fecha',
	'prop.type.wikilink': 'Wikilink [[]]',
	'prop.type.tags': 'Etiquetas',
	'prop.type.aliases': 'Alias',
	'prop.type.cssclasses': 'Clases CSS',
	'prop.option.wikilink': 'Formatear como [[wikilink]]',
	'prop.option.append': 'Agregar a lista',
	'prop.option.replace': 'Reemplazar valor',
	'prop.add_to_queue': 'Agregar a cola',
	'prop.new_name': 'Nuevo nombre',
	'prop.option.native_rename': 'Renombrado Global (Nativo)',
	'prop.option.native_rename_desc':
		'Usa el motor interno de Obsidian para renombrar esta propiedad en todo el baúl. Es más rápido para grandes volúmenes de datos.',

	// Queue island
	'queue.island.pending': 'cambios pendientes',
	'queue.island.empty': 'La cola está vacía',
	'queue.template.templates': 'Presets de operaciones',
	'queue.template.save': 'Guardar preset de acción',
	'queue.template.no_serializable':
		'No hay operaciones de cola que se puedan guardar como preset de acción',
	'queue.template.bulk_title': 'Objetivo de operación grande',
	'queue.template.bulk_desc':
		'Este preset de acción preparará {count} de {total} archivos desde {source}. Revisa la cola antes de aplicar.',
	'queue.template.bulk_suppress': 'No volver a mostrar este aviso',
	'queue.template.bulk_confirm': 'Enlistar operaciones',
	'queue.template.source.selected': 'la selección actual',
	'queue.template.source.filtered': 'los filtros activos',
	'queue.template.source.vault': 'todo el vault',
	'queue.mode.stage': 'Stage',
	'queue.mode.bypass': 'Bypass',
	'queue.guard.duplicate': 'Operación duplicada omitida',
	'queue.guard.merged': 'Objetivos duplicados fusionados en la cola',
	'queue.guard.conflict': 'Operación contradictoria bloqueada',
	'queue.guard.batch':
		'Guardia de cola: {merged} fusionadas, {duplicates} duplicadas omitidas, {conflicts} contradicciones bloqueadas',
	'queue.warning.empty_target': 'Esta operación afecta 0 archivos.',
	'queue.warning.large_target':
		'Esta operación afecta {count} archivos, sobre el límite de aviso de {threshold}.',

	// Queue details
	'queue.title': 'Detalles de Cola',
	'queue.file': 'Archivo',
	'queue.action': 'Acción',
	'queue.before': 'Antes',
	'queue.after': 'Después',
	'queue.confirm': '¿Aplicar todos los cambios?',
	'queue.show_unchanged': 'Mostrar propiedades sin cambios',

	// Results
	'result.success': '{count} archivos actualizados exitosamente',
	'result.errors': '{count} errores ocurrieron',
	'result.no_changes': 'No hay cambios que aplicar',

	// Settings
	'settings.background_blur': 'Intensidad de desenfoque del fondo',
	'settings.background_blur.desc':
		'Controla el desenfoque de cristal en la barra inferior y los popups.',
	'settings.style_config': 'Configuración de Layout',
	'settings.rainbow_folders': 'Carpetas arcoíris',
	'settings.rainbow_folders.desc':
		'Colorea cada subárbol de carpeta de primer nivel en el árbol de files; usa la paleta del snippet fancyfile-explorer-rainbow si está instalado.',
	'settings.glyph_color.default': 'Predeterminado',
	'settings.glyph_color.faint': 'Tenue',
	'settings.glyph_color.accent': 'Acento',
	'settings.glyph_color.custom': 'Personalizado',
	'settings.glyph_color.rainbow': 'Arcoíris',
	'settings.glyph_color.rainbow-pastel': 'Arcoíris pastel',
	'settings.glyph_color.custom_pick': 'Color personalizado',
	'settings.explorer_glyph_color': 'Color de glyph del explorer',
	'settings.explorer_glyph_color.desc':
		'Colorea los glyphs de los nodos del explorer con la paleta compartida. Predeterminado los deja sin color.',
	'settings.explorer_glyph_scope': 'Alcance del color de glyph',
	'settings.explorer_glyph_scope.desc':
		'A qué nodos se aplica el color de glyph.',
	'settings.explorer_glyph_scope.folders': 'Carpetas',
	'settings.explorer_glyph_scope.files': 'Archivos',
	'settings.explorer_glyph_scope.both': 'Ambos',
	'settings.toc_glyph_color': 'Color de glyphs',
	'settings.toc_glyph_color.desc': 'Color de los glyphs del índice flotante.',
	'settings.toc_glyph_color.default': 'Por defecto',
	'settings.toc_glyph_color.accent': 'Acento',
	'settings.toc_glyph_color.rainbow': 'Arcoíris',
	'settings.toc_glyph_color_mode': 'Modo del color de glyphs',
	'settings.toc_glyph_color_mode.desc':
		'Aplicar el color solo con el rail estático, o en todo momento.',
	'settings.toc_glyph_color_mode.static': 'Solo estático',
	'settings.toc_glyph_color_mode.always': 'Siempre',
	'settings.files_hover_info.tasks': 'Tareas pendientes',
	'sort.by.tasks': 'Tareas pendientes',
	'viewmode.pill.tasks': 'Tareas',
	'file.ctx.exclude': 'Excluir archivo',
	'settings.explorer_page': 'Panel: Explorer',
	'settings.explorer_file_move_mode': 'Modo de IU para Move To',
	'settings.explorer_file_move_mode.desc':
		'Cómo se presenta la función de mover a carpeta en el File Scene.',
	'settings.explorer_file_move_mode.inline': 'Inline (Modo Árbol)',
	'settings.explorer_file_move_mode.modal': 'Modal Clásico',
	'settings.cells_section': 'Celdas',
	'settings.explorer_page.desc':
		'Cells, badges y comportamiento de resaltado de los explorers.',
	'settings.persist_interaction_mode': 'Recordar el modo de interacción',
	'settings.persist_interaction_mode.desc':
		'Cada pestaña vuelve a abrirse en el último modo de interacción que elegiste allí. Al apagarlo, todas abren en Abrir; lo que ya elegiste se conserva.',
	'settings.context_menu.page_desc':
		'Dónde aparecen los items de Vaultman en los menús contextuales.',
	'settings.style_preset': 'Preset de estilo',
	'settings.style_preset.desc':
		'Minimal usa controles compactos nativos de Obsidian; Experimental usa los controles decorados de Vaultman.',
	'settings.style_preset.minimal': 'Minimal',
	'settings.style_preset.experimental': 'Experimental',
	'settings.minimal_style': 'Estilo minimal',
	'settings.minimal_style.desc':
		'Usa botones compactos nativos de Obsidian en headers y dock inferior.',
	'settings.search_highlights': 'Highlights de busqueda en explorers',
	'settings.search_highlights.desc':
		'Resalta filas de explorers que coinciden con la busqueda actual.',
	'settings.icon_in_caret_slot': 'Icono en el hueco del caret',
	'settings.icon_in_caret_slot.desc':
		'Los nodos que muestran icono y no reservan caret lo dibujan en la columna del caret en vez de antes del label, así todos los labels quedan alineados con los nodos sin icono.',
	'settings.selection_checkbox_position': 'Posición de la casilla de selección',
	'settings.selection_checkbox_position.desc':
		'Coloca el cell_checkbox del modo seleccionar al inicio o al final de los nodos.',
	'settings.selection_checkbox_position.start': 'Inicio / izquierda',
	'settings.selection_checkbox_position.end': 'Final / derecha',
	'settings.selection_checkbox_position.hidden': 'Oculta',
	'settings.order_cells_by_activation': 'Ordenar celdas por activación',
	'settings.order_cells_by_activation.desc':
		'Muestra las celdas en el orden en que las activas en vez de un orden fijo.',
	'settings.collapsed_folder_badges': 'Actividad de folder colapsado',
	'settings.collapsed_folder_badges.desc':
		'Cómo un folder colapsado muestra el estado que oculta: un dot de que sus childs tienen actividad (una operación pendiente o un filtro activo), o los badges propios de los descendientes junto al dot de filtro.',
	'settings.collapsed_folder_badges.dot':
		'Un dot indicativo',
	'settings.collapsed_folder_badges.badges':
		'Badges de descendientes',
	'settings.floating_toc_sticky_actions': 'Mantener fijos los widgets del índice',
	'settings.floating_toc_sticky_actions.desc':
		'El índice flotante conserva sus propios controles arriba mientras los nodos pasan por debajo, igual que las filas del explorer pasan bajo el toolbar. Desactivado, se van con la lista al hacer scroll.',
	'settings.keep_property_when_last_value_deleted':
		'Conservar la propiedad cuando se va su último valor',
	'settings.keep_property_when_last_value_deleted.desc':
		'Borrar el último valor de una propiedad deja la propiedad en su sitio, con un valor vacío. Desactivado, la propiedad se borra junto con él — y se te pregunta antes, porque eso borra dos cosas de un solo gesto.',
	'ops.delete_value.also_property':
		'¿Borrar las propiedades que queden sin valor?',
	'ops.delete_value.also_property.message':
		'Algunas notas tienen este como su único valor de la propiedad. Borrarlo quita también la propiedad en esas notas.',
	'settings.deletion_highlight': 'Resaltar las filas en cola para borrar',
	'settings.deletion_highlight.desc':
		'Tiñe todas las filas que la cola va a borrar, no solo la que nombra la operación. Desactivado, el borrado se sigue viendo como fila gris tachada, badge y dot rojo en los parents colapsados.',
	'settings.auto_reveal_active_file': 'Mostrar siempre el archivo actual',
	'settings.auto_reveal_active_file.desc':
		'Mantiene el explorer Files sobre la nota que tenga el foco: cada vez que abres una, sus carpetas se despliegan y la fila se desplaza hasta quedar a la vista. Desactivado, la acción de la barra hace lo mismo una sola vez, cuando la pulsas.',
	'settings.mobile_rounded_rows': 'Filas táctiles redondeadas en móvil',
	'settings.mobile_rounded_rows.desc':
		'Iguala el radio de esquina nativo de Obsidian en los explorers Tree (Files, Properties, Tags, Snippets, Plugins) cuando el workspace está en móvil/teléfono. Desactivado usa el mismo radio que en PC. Con algunos temas, la barra de acento de filtro activo puede verse ligeramente corta respecto a la esquina cuando está activado.',
	'settings.developer': 'Herramientas de desarrollador',
	'settings.developer.desc':
		'Resetea la configuracion del plugin, o respalda y restaura filtros guardados, sets de operaciones y layouts como JSON.',
	'settings.data_transfer': 'Filtros, sets de operaciones y layouts',
	'settings.data_transfer.desc':
		'Exporta filtros guardados, plantillas de queue y layouts guardados como JSON, o importa un archivo previamente exportado.',
	'settings.data_transfer.export': 'Exportar JSON',
	'settings.data_transfer.import': 'Importar JSON',
	'settings.data_transfer.export.title': 'Exportar filtros, sets de operaciones y layouts',
	'settings.data_transfer.export.desc':
		'Copia este JSON para respaldarlo o moverlo a otro vault.',
	'settings.data_transfer.export.copy': 'Copiar al portapapeles',
	'settings.data_transfer.export.copied': 'Copiado al portapapeles.',
	'settings.data_transfer.export.copy_failed':
		'No se pudo copiar automaticamente — el texto quedo seleccionado, copialo manualmente.',
	'settings.data_transfer.import.title': 'Importar filtros, sets de operaciones y layouts',
	'settings.data_transfer.import.desc':
		'Pega un JSON previamente exportado. Solo se reemplazan los arrays presentes en el JSON — lo que exportaste vacio o dejaste afuera queda intacto.',
	'settings.data_transfer.import.placeholder': 'Pega aqui el JSON exportado…',
	'settings.data_transfer.import.apply': 'Importar',
	'settings.data_transfer.import.done': 'Importacion completa.',
	'settings.data_transfer.import.invalid_json': 'Eso no es JSON valido.',
	'settings.data_transfer.import.invalid_shape':
		'Se esperaba un objeto JSON con filterTemplates, queueTemplates y/o savedLayouts.',
	'settings.data_transfer.import.no_known_keys':
		'No se encontro ningun array filterTemplates, queueTemplates o savedLayouts en este JSON.',
	'settings.reset': 'Resetear configuracion',
	'settings.reset.desc':
		'Restaura cada configuracion de Vaultman a su valor por defecto, incluyendo filtros guardados, sets de operaciones y layouts. Expórtalos primero si queres conservar una copia.',
	'settings.reset.button': 'Resetear configuracion',
	'settings.reset.confirm_title': 'Resetear toda la configuracion de Vaultman?',
	'settings.reset.confirm_message':
		'Esto restaura cada configuracion a su valor por defecto, incluyendo filtros guardados, sets de operaciones y layouts. Esto no se puede deshacer.',
	'settings.reset.done': 'Configuracion reseteada a los valores por defecto.',
	'settings.badge_colors': 'Badges de celda con color',
	'settings.badge_colors.desc':
		'Usa iconos de badge con color en Files, Tags y Properties. Desactivado mantiene badges monotonos.',
	'settings.addon_cell_style': 'Cell de estado de add-ons',
	'settings.addon_cell_style.desc':
		'Elige el control de activación mostrado en Snippets y Plugins.',
	'settings.addon_cell_style.native': 'Toggle nativo',
	'settings.addon_cell_style.badge': 'Badge',
	'settings.badge_cancel_click': 'Interaccion para cancelar badges',
	'settings.badge_cancel_click.desc':
		'Elige si los badges de operaciones se cancelan con doble click o click simple.',
	'settings.badge_cancel_click.double': 'Doble click',
	'settings.badge_cancel_click.single': 'Click simple',
	'settings.prop_conflict_warnings': 'Avisos de conflicto de propiedades',
	'settings.prop_conflict_warnings.desc':
		'Cuanto se decora un valor de tipo incompatible. La deteccion no cambia: ocultar el aviso nunca vuelve valida una operacion bloqueada.',
	'settings.prop_conflict_warnings.off': 'Ocultos',
	'settings.prop_conflict_warnings.badge': 'Solo badge',
	'settings.prop_conflict_warnings.full': 'Badge y borde de fila',
	'settings.show_toolbar': 'Mostrar barra de herramientas',
	'settings.show_toolbar.desc':
		'Muestra la barra del explorer (tabs, vista, orden, búsqueda). Actívala desde el menú de vista; restáurala aquí cuando esté oculta.',
	'command.picker.search': 'Buscar comandos…',
	'command.picker.empty': 'Ningún comando coincide.',
	'command.picker.default': 'Predeterminado de Vaultman',
	'command.missing':
		'El comando "{id}" no está disponible; se usó el predeterminado de Vaultman.',
	'command.unavailable':
		'El comando "{id}" no está disponible (retirado o plugin deshabilitado).',
	'settings.create_actions_placement': 'Ubicación de acciones Crear',
	'settings.create_actions_placement.desc':
		'Si Crear archivo y Crear carpeta viven en la caja de búsqueda o como nodos de acción del toolbar.',
	'settings.create_actions_placement.searchbox': 'Caja de búsqueda',
	'settings.create_actions_placement.toolbar': 'Toolbar',
	'settings.toolbar_commands': 'Comandos del toolbar',
	'settings.toolbar_commands.desc':
		'Comandos de Obsidian mostrados como nodos de acción del toolbar de Files. El toolbar ejecuta el comando de inmediato al activarlo.',
	'settings.toolbar_commands.add': 'Añadir comando',
	'settings.toolbar_commands.remove': 'Eliminar',
	'settings.create_file_command': 'Acción Crear archivo',
	'settings.create_file_command.desc':
		'Qué ejecuta la acción Crear archivo: la creación de nota integrada de Vaultman, o un comando de Obsidian elegido.',
	'settings.toolbar_overflow': 'Overflow del toolbar',
	'settings.toolbar_overflow.desc':
		'Cómo maneja el toolbar de Files más acciones de las que caben: condensar los extras en el menú Herramientas, o mantener cada acción en una sola línea con scroll horizontal.',
	'settings.toolbar_overflow.condensed': 'Menú condensado',
	'settings.toolbar_overflow.scroll': 'Scroll horizontal',
	'settings.toolbar_overflow.wrap': 'Varias filas',
	'settings.toolbar_tools_menu': 'Condensar herramientas de Files',
	'settings.toolbar_tools_menu.desc':
		'Reemplaza Auto-revelar y Expandir/Colapsar por un menú Tools nativo para mantener cinco nodos en la barra de Files.',
	'settings.toolbar': 'Barra de herramientas',
	'settings.toolbar.desc':
		'Configura etiquetas y controles de la barra del explorador.',
	'settings.context_menu_kind.files': 'Menú de nodos Files',
	'settings.context_menu_kind.props': 'Menú de nodos Properties',
	'settings.context_menu_kind.tags': 'Menú de nodos Tags',
	'settings.context_menu_kind.content': 'Menú de nodos de Texto',
	'settings.context_menu_kind.snippets': 'Menú de nodos Snippets',
	'settings.context_menu_kind.plugins': 'Menú de nodos Plugins',
	'settings.files_context_menu': 'Menú contextual de Files',
	'settings.files_context_menu.desc':
		'Elige qué acciones muestra el menú contextual de los nodos de Files, en qué orden, y agrúpalas con separadores y submenús.',
	'settings.files_context_menu.add_divider': 'Añadir separador',
	'settings.files_context_menu.add_submenu': 'Añadir submenú',
	'settings.files_context_menu.submenu_name': 'Submenú',
	'settings.files_context_menu.intercepted':
		'Item interceptado: se puede mostrar u ocultar',
	'settings.files_context_menu.divider': 'Separador',
	'settings.files_context_menu.submenu':
		'Submenú: asigna acciones con el selector',
	'settings.files_context_menu.no_submenu': 'Nivel principal',
	'settings.files_context_menu.remove': 'Eliminar',
	'settings.files_context_menu.reset': 'Restaurar el orden por defecto',
	'settings.files_hover_info': 'Tooltip de Files',
	'settings.files_hover_info.desc':
		'Elige qué metadata cacheada y estadísticas de lectura aparecen al mantener el cursor sobre un nodo de Files.',
	'settings.files_hover_info.path': 'Ruta',
	'settings.files_hover_info.label': 'Etiqueta',
	'settings.files_hover_info.modified': 'Modificado',
	'settings.files_hover_info.created': 'Creado',
	'settings.files_hover_info.opened': 'Última apertura',
	'settings.files_hover_info.words': 'Palabras',
	'settings.files_hover_info.characters': 'Caracteres',
	'settings.show_dock': 'Mostrar dock inferior',
	'settings.show_dock.desc':
		'Muestra el dock inferior. Al desactivarlo, Filtros y Cola quedan en el menú de tabs de Datos.',
	'settings.bypass_operations': 'Omitir cola de operaciones',
	'settings.bypass_operations.desc':
		'Ejecuta operaciones inmediatamente en vez de prepararlas en la cola.',
	'settings.bulk_operation_warning': 'Aviso de operación masiva',
	'settings.bulk_operation_warning.desc':
		'Avisa antes de que los presets de acción preparen conjuntos muy grandes de archivos.',
	'settings.bulk_operation_warning_threshold': 'Umbral de aviso en cola',
	'settings.bulk_operation_warning_threshold.desc':
		'Muestra avisos en la cola cuando una operación afecta más archivos que este límite.',
	'settings.prop_move_conflict': 'Conflictos de tipo al mover a propiedad',
	'settings.prop_move_conflict.desc':
		'Qué ocurre cuando la propiedad de destino no puede contener el valor que se mueve.',
	'settings.prop_move_conflict.coerce': 'Cambiar el tipo del destino',
	'settings.prop_move_conflict.block': 'Omitir el destino',
	'settings.prop_move_conflict.ask': 'Preguntar en el resumen de la operación',
	'settings.addons': 'Complementos',
	'settings.addons.iconic': 'Iconic',
	'settings.addons.iconic.desc':
		'Usa en los explorers de Vaultman los íconos configurados por el plugin comunitario Iconic.',
	'settings.addons.iconic.files_scope': 'Alcance de íconos en Files',
	'settings.addons.iconic.files_scope.desc':
		'Elige qué nodos de Files pueden mostrar la celda de ícono. Personalizados muestra solo los nodos configurados en Iconic.',
	'settings.folder_aggregate_cells': 'Totales de cell por folder',
	'settings.folder_aggregate_cells.desc':
		'Los folders del árbol de Files muestran la suma recursiva de los cells de conteo de sus files (propiedades, palabras, tareas), incluyendo los totales de sus subfolders.',
	'settings.sticky_parent_rows': 'Filas padre fijas',
	'settings.sticky_parent_rows.desc':
		'Mantiene visibles los nodos padre expandidos al recorrer su árbol.',
	'settings.sticky_parent_rows_fraction': 'Límite de altura de las cabeceras fijadas',
	'settings.sticky_parent_rows_fraction.desc': 'Parte del árbol que pueden tapar los padres fijados. Un panel corto se queda sin huecos antes del techo de siete filas: al 40 %, un árbol de 413 px admite cinco, así que un sexto nivel nunca se fija.',
	'settings.node_icon_scope': 'Alcance de icono de nodo',
	'settings.node_icon_scope.desc':
		'Qué nodos del explorer pueden mostrar icono: files y folders, solo files, solo folders, o solo nodos con icono personalizado.',
	'settings.icon_scope.all': 'Archivos y carpetas',
	'settings.icon_scope.files': 'Solo archivos',
	'settings.icon_scope.folders': 'Solo carpetas',
	'settings.icon_scope.custom': 'Solo iconos personalizados',
	'settings.developer_tools': 'Herramientas de desarrollo',
	'settings.performance_monitor': 'Monitor de rendimiento',
	'settings.performance_monitor.desc':
		'Muestra el monitor flotante de FPS, long tasks, memoria y acciones.',
	'settings.default_type': 'Tipo de propiedad por defecto',
	'settings.default_type.desc': 'Tipo por defecto para nuevas propiedades',
	'settings.templates': 'Plantillas de filtros',
	'settings.templates.desc': 'Gestionar plantillas de filtros guardadas',
	'settings.saved_view_config': 'Composiciones de vista',
	'settings.saved_view_config.desc': 'Composiciones de vista guardadas',
	'settings.saved_view_config.empty':
		'Sin composición de vista guardada. Usa "Guardar composición de vista" en el menú de vista para recordar opciones y orden por tab.',
	'settings.saved_view_config.clear': 'Limpiar',
	'settings.floating_toc': 'Índice flotante',
	'settings.floating_toc.desc':
		'Configura el índice del explorer y el comportamiento Niagara.',
	'settings.configure': 'Configurar',
	'settings.back_to_layout_settings': 'Volver a Configuración de Layout',
	'settings.floating_toc_enable': 'Activar TOC flotante',
	'settings.floating_toc_enable.desc':
		'Muestra un índice flotante de primeras letras sobre los explorers de Files, Props y Tags.',
	'settings.floating_toc_niagara': 'Efectos Niagara',
	'settings.floating_toc_niagara.desc':
		'Arrastra por el índice para magnificar glifos y desplazarte entre grupos. Off lo mantiene estático.',
	'settings.toc_plain_style': 'Estilo simple del rail',
	'settings.toc_plain_style.desc':
		'Glifos desnudos con nodos de control transparentes (sin cajas), como el prototipo.',
	'settings.toc_position': 'Posición del rail',
	'settings.toc_position.right': 'Derecha',
	'settings.toc_position.left': 'Izquierda',
	'settings.toc_position.top': 'Arriba',
	'settings.toc_position.bottom': 'Abajo',
	'settings.toc_reserved_lane': 'Reservar espacio para el índice',
	'settings.toc_reserved_lane.desc':
		'Coloca el índice vertical entre las celdas del explorer y el scrollbar, sin superponer ninguno. Los rails superior e inferior permanecen como overlay.',
	'settings.toc_hide_explorer_scrollbar': 'Ocultar barra del explorador',
	'settings.toc_hide_explorer_scrollbar.desc':
		'Oculta la barra del explorador activo mientras su índice flotante esté visible.',
	'settings.toc_glyph_mode': 'Modo de glifo',
	'settings.toc_glyph_mode.letter': 'Primera letra',
	'settings.toc_glyph_mode.name': 'Nombre completo',
	'settings.toc_label_mode': 'Celda de nombre',
	'settings.toc_label_mode.desc':
		'Cuándo mostrar el nombre del nodo junto al glifo al hacer scrub.',
	'settings.toc_label_mode.off': 'Off',
	'settings.toc_label_mode.selected': 'Seleccionado',
	'settings.toc_label_mode.scrub': 'Falloff en scrub',
	'settings.toc_label_mode.always': 'Siempre',
	'settings.toc_reveal': 'Rango de revelado del nombre',
	'settings.toc_reveal.selected': 'Seleccionado',
	'settings.toc_reveal.near': 'Cercano',
	'settings.toc_reveal.wide': 'Amplio',
	'settings.toc_reveal.all': 'Todo',
	'settings.toc_name_order': 'Letras del nombre',
	'settings.toc_name_order.down': 'De arriba a abajo',
	'settings.toc_name_order.up': 'De abajo a arriba',
	'settings.toc_name_order.flat': 'Horizontal',
	'settings.toc_glow': 'Glow en scrub',
	'settings.toc_name_pill': 'Pastilla de nombre',
	'settings.toc_soft_scroll': 'Desplazamiento suave',
	'settings.toc_soft_scroll.desc':
		'Desliza suavemente el explorer entre grupos del índice durante el scrub.',
	'settings.toc_stretch': 'Estirar en vez de deslizar',
	'settings.toc_stretch.desc':
		'Ancla el rail en su sitio: arrastrar estira la campana como plastilina en vez de desplazar el rail por el frame.',
	'settings.toc_niagara_nodes': 'Unir acciones al deslizamiento',
	'settings.toc_niagara_nodes.desc':
		'Coloca los controles de acción y los nodos indexados en el mismo track Niagara.',
	'floating_toc.aria': 'Índice del explorer',
	'floating_toc.menu': 'Índice flotante',
	'viewmenu.toolbar': 'Barra de herramientas',
	'viewmenu.layouts': 'Composiciones de vista',
	'viewmenu.save_layout': 'Guardar composición de vista',
	'viewmenu.saved_config_notice': 'Composición de vista guardada',
	'viewmenu.interaction': 'Interacción',
	'viewmenu.interaction.open': 'Abrir',
	'viewmenu.interaction.add': 'Agregar',
	'viewmenu.interaction.select': 'Seleccionar',
	'viewmenu.interaction.filter': 'Filtrar',
	'floating_toc.files':
		'Indexando archivos — toca para indexar carpetas, mantén para elegir alcance',
	'floating_toc.folders':
		'Indexando carpetas — toca para indexar archivos, mantén para elegir alcance',
	'floating_toc.pick': 'Elige un nodo para indexar su nivel',
	'floating_toc.drill': 'Indexar el nivel de un nodo',
	'floating_toc.close': 'Cerrar índice',
	'floating_toc.back': 'Volver un nivel',
	'floating_toc.incompatible_sort':
		'El índice requiere un orden textual (nombre, ruta o extensión) en el explorer activo.',
	'settings.queue_templates.desc':
		'Gestionar presets guardados de operaciones preparadas',

	// Main view
	'view.main.title': 'Vaultman',
	'command.open_main': 'Abrir Vaultman (vista completa)',
	'command.open_sidebar': 'Abrir barra lateral de Vaultman',
	'command.apply_queue': 'Aplicar operaciones pendientes',
	'command.focus_content_search': 'Enfocar búsqueda de Texto',
	'command.focus_active_explorer_search':
		'Enfocar busqueda del explorador activo',
	'command.focus_search_unavailable':
		'No hay un campo de busqueda de Vaultman disponible.',
	'command.open_updates': 'Abrir novedades de Vaultman',
	'updates.title': 'Novedades de Vaultman · {version}',
	'updates.notice':
		'Vaultman {version} está listo. Descubre lo más importante.',
	'updates.intro':
		'Consulta una presentación breve y visual de esta versión. El boletín enlaza al changelog técnico completo.',
	'updates.view_bulletin': 'Ver novedades',
	'updates.copy_url': 'Copiar enlace del boletín',
	'updates.url_copied': 'Enlace del boletín copiado.',
	'updates.open_failed':
		'No se pudo abrir el boletín. Usa el comando de novedades de Vaultman para reintentar o copiar su enlace.',
	'updates.copy_failed': 'No se pudo copiar el enlace del boletín.',
	'updates.dismiss': 'Ahora no',
	'updates.close': 'Entendido',

	// Toolbar
	'toolbar.filters': 'Filtros',
	'toolbar.queue': 'Cola',
	'toolbar.no_session': 'Sin sesión',
	'toolbar.new_session': '+ Nueva sesión...',

	// Session
	'session.create': 'Crear sesión',
	'session.name': 'Nombre de sesión',
	'session.synced': 'Sincronizado',
	'session.outdated': 'Archivo cambiado externamente',
	'session.conflict': 'Conflicto de Google Drive detectado',

	// Status bar
	'statusbar.files': '{count} archivos',
	'statusbar.filtered_label': '{count} filtrados',
	'statusbar.selected': '{count} seleccionados',
	'statusbar.pending': '{count} pendientes',

	// Linter
	'linter.title': 'Linter de Propiedades',
	'linter.description': 'Reordena las propiedades YAML usando obsidian-linter.',
	'linter.not_installed':
		'El plugin obsidian-linter no está instalado. Instálalo para usar esta función.',
	'linter.scope': 'Alcance',
	'linter.add_property': 'Agregar propiedad al orden...',
	'linter.save_order': 'Guardar orden',
	'linter.apply': 'Aplicar linter',
	'linter.order_saved': 'Orden de prioridad guardado en la config del linter',
	'linter.save_error': 'Error al guardar la config del linter',
	'linter.applying': 'Aplicando linter',
	'linter.done': 'Linter completado',
	'linter.button': 'Linter',

	// File Rename
	'rename.title': 'Renombrar Archivos',
	'rename.pattern': 'Patrón',
	'rename.pattern_desc':
		'Usa marcadores: {basename}, {date}, {counter}, {property}',
	'rename.help': '* o {basename} | {date} | {counter} | {property}',
	'rename.pattern_warning':
		'Patron de renombrado bloqueado para {count} archivo(s): {reason}',
	'rename.issue.missing_property': 'Falta la propiedad de texto "{property}"',
	'rename.issue.non_text_property': 'La propiedad "{property}" no es texto',
	'rename.issue.invalid_pattern': 'Patron de renombrado invalido "{token}"',

	// Status bar (extended)
	'statusbar.props_label': '{count} props',
	'statusbar.values_label': '{count} valores',

	// Property Explorer
	'explorer.title': 'Propiedades',
	'explorer.search': 'Buscar propiedades...',
	'explorer.empty': 'No se encontraron propiedades',
	'explorer.props.empty_title': 'No hay propiedades que coincidan',
	'explorer.props.empty_search_desc':
		'Prueba otro término o cambia la categoría de propiedades.',
	'explorer.tags.empty_title': 'No hay etiquetas que coincidan',
	'explorer.tags.empty_desc': 'No hay etiquetas en el vault',
	'explorer.tags.empty_search_desc':
		'Prueba otro término o cambia la categoría de etiquetas.',
	'explorer.toggle': 'Explorador',

	// Explorer nav buttons
	'explorer.btn.search': 'Buscar',
	'explorer.btn.filter': 'Filtrar',
	'explorer.btn.sort': 'Ordenar',
	'explorer.btn.create': 'Crear propiedad',

	// Explorer filter scopes
	'explorer.filter.all_vault': 'Todo el baúl',
	'explorer.filter.filtered': 'Archivos filtrados',
	'explorer.filter.selected': 'Archivos seleccionados',
	'explorer.filter.by_type': 'Por tipo',

	// Explorer sort
	'explorer.sort.alpha': 'Alfabético',
	'explorer.sort.count': 'Por ocurrencias',
	'explorer.sort.type': 'Por tipo',
	'explorer.sort.type.props_only': 'Solo propiedades',
	'explorer.sort.type.folders_only': 'Solo carpetas',
	'explorer.sort.values': 'Por cantidad de valores',

	// Explorer context menu — properties
	'explorer.ctx.rename': 'Renombrar propiedad',
	'explorer.ctx.type': 'Tipo de propiedad',
	'explorer.ctx.change_type': 'Cambiar tipo',
	'explorer.ctx.add_to_files': 'Agregar a {count} archivos',
	'explorer.ctx.add_to_files.empty': 'Ningún archivo coincide con el filtro',
	'explorer.ctx.reveal_this_file': 'Revelar este archivo',
	'explorer.ctx.reveal_this_file.empty': 'Este archivo no tiene propiedades',
	'explorer.ctx.move_to_prop': 'Mover a propiedad...',
	'explorer.ctx.move_to_prop.proceed': 'Continuar con lo seleccionado',
	'explorer.ctx.move_to_prop.cancel': 'Cancelar',
	'sasi.move.proceed': 'Proceder',
	'sasi.move.cancel': 'Cancelar',
	'sasi.move.toggle_write': 'Añadir o reemplazar',
	'sasi.move.toggle_origin': 'Mover o copiar',
	'sasi.move.toggle_kind': 'Mover nodos o grupos',
	'explorer.move_to_prop.write.append': 'Agregar al destino',
	'explorer.move_to_prop.write.replace': 'Reemplazar en el destino',
	'explorer.move_to_prop.origin.move': 'Mover',
	'explorer.move_to_prop.origin.copy': 'Copiar',
	'explorer.move_to_folder.rejected':
		'No se puede mover una carpeta dentro de sí misma.',
	'explorer.move_to_prop.summary': 'Revisar este movimiento',
	'explorer.move_to_prop.summary.files': '{count} archivos',
	'explorer.move_to_prop.summary.confirm': 'Ejecutar ahora',
	'explorer.move_to_prop.rejected': '{property} es donde este valor ya vive',
	'explorer.prop_move.blocked.scalar_occupied':
		'{property} ya tiene un valor y no es una lista',
	'explorer.prop_move.blocked.type_mismatch':
		'{property} es {type} y no puede contener este valor',
	'explorer.ctx.icon': 'Cambiar ícono (Iconic)',
	'explorer.ctx.delete_prop': 'Eliminar propiedad',
	'explorer.ctx.add_value': 'Agregar valor',

	// Explorer context menu — values
	'explorer.ctx.rename_value': 'Renombrar valor',
	'explorer.ctx.move_value': 'Mover a propiedad...',
	'explorer.ctx.convert': 'Convertir',
	'explorer.ctx.delete_value': 'Eliminar valor',

	// Explorer convert submenu
	'explorer.ctx.wikilink': 'Wikilink',
	'explorer.ctx.wikilink_alias': 'A [[nota|alias]]',
	'explorer.ctx.md_link': 'A [alias](nota)',
	'explorer.ctx.uppercase': 'MAYÚSCULAS',
	'explorer.ctx.lowercase': 'minúsculas',
	'explorer.ctx.titlecase': 'Tipo título',
	'explorer.ctx.plain_text': 'Texto plano',
	'explorer.ctx.capitalize': 'Primera Letra Mayúscula',
	'tags.invalid_name': 'Ese nombre de tag no es válido',
	'tags.invalid_name.spaces':
		'Los tags no admiten espacios. Usa "-", "_" o "/" en su lugar.',
	'explorer.ctx.filter_include': 'Incluir como filtro',
	'explorer.ctx.filter_exclude': 'Excluir como filtro',
	'file.ctx.open_tab': 'Abrir en nueva pestaña',
	'file.ctx.open_right': 'Abrir a la derecha',
	'file.ctx.open_window': 'Abrir en nueva ventana',
	'snippet.open_default_app': 'Abrir en la aplicación predeterminada',
	'snippet.reveal_system_explorer': 'Mostrar en el explorador del sistema',
	'snippet.reveal_finder': 'Mostrar en el Finder',
	'file.ctx.make_copy': 'Crear una copia',
	'folder.ctx.new_note': 'Nueva nota',
	'folder.ctx.new_folder': 'Nueva carpeta',
	'folder.ctx.new_canvas': 'Nuevo canvas',
	'folder.ctx.new_base': 'Nueva base',
	'folder.ctx.make_copy': 'Crear una copia',
	'folder.ctx.filter_include': 'Filtrar a esta carpeta',
	'folder.ctx.filter_exclude': 'Excluir esta carpeta',
	'folder.ctx.rename': 'Renombrar carpeta',
	'folder.ctx.move': 'Mover carpeta',
	'folder.ctx.delete': 'Eliminar carpeta',
	'folder.prompt.rename': 'Nuevo nombre de carpeta',
	'folder.prompt.move': 'Ruta de carpeta destino',

	// Explorer add value form
	'explorer.add_value.append': 'Agregar valor',
	'explorer.add_value.replace': 'Reemplazar valores actuales',
	'explorer.add_value.as_wikilink': 'Formato [[wikilink]]',
	'explorer.add_value.as_md_link': 'Formato [alias](nota)',

	// Explorer rename conflict
	'explorer.rename.append': 'Combinar valores',
	'explorer.rename.replace': 'Reemplazar valores',
	'explorer.rename.target_exists': 'La propiedad destino ya existe',

	// Explorer warnings
	'explorer.warn.no_files_selected':
		'Selecciona archivos en el file tree primero',

	// Settings (new)
	'settings.ctrl_click_search': 'Ctrl+click abre búsqueda',
	'settings.ctrl_click_search.desc':
		'Ctrl+click en una propiedad o valor abre la búsqueda de Obsidian con la query',
	'settings.queue_preview': 'Vista previa de cola en explorador',
	'settings.queue_preview.desc':
		'Muestra cambios pendientes de la cola en el explorador de propiedades',
	'settings.content_search': 'Búsqueda de texto en árbol',
	'settings.content_search.desc':
		'Habilitar búsqueda de texto dentro de archivos en el árbol de archivos',
	'settings.operation_scope': 'Alcance de operaciones',
	'settings.operation_scope.desc':
		'Alcance por defecto para operaciones del explorador',
	'settings.scope.auto': 'Auto (seleccionados > filtrados > todos)',
	'settings.scope.selected': 'Solo archivos seleccionados',
	'settings.scope.filtered': 'Archivos filtrados',
	'settings.scope.all': 'Todos los archivos',
	'settings.open_mode': 'Vista por defecto',
	'settings.open_mode.desc':
		'Qué se abre al hacer click en el icono de Vaultman',
	'settings.open_mode.sidebar': 'Sidebar',
	'settings.open_mode.main': 'Vista principal',
	'settings.open_mode.new_instance': 'Nueva instancia',
	'settings.open_mode.both': 'Nueva instancia',

	// File list (extended)
	'files.content_search': 'Buscar en contenido...',

	// Property type datetime
	'prop.type.datetime': 'Fecha y Hora',

	// Header bar
	'header.show_selected': 'Mostrar solo seleccionados',
	'header.queue_badge': '{count} pendientes',
	'filter.tab.tags': 'Etiquetas',
	'filter.tab.props': 'Props',
	'filter.active_descendant': 'Filtro activo oculto',
	'filter.tab.files': 'Archivos',
	'filter.tab.content': 'Texto',
	'filter.tab.snippets': 'Snippets',
	'filter.tab.plugins': 'Plugins',
	'addon.icon.title': 'Cambiar ícono — {name}',
	'addon.icon.change': 'Cambiar ícono',
	'addon.icon.reset': 'Restablecer al predeterminado',
	'addon.icon.search': 'Buscar íconos…',
	'addon.icon.empty': 'Ningún ícono coincide',
	'addon.icon.current': 'Ícono actual',
	'addons.enabled': 'Activado',
	'addons.disabled': 'Desactivado',
	'addons.enable': 'Activar',
	'addons.disable': 'Desactivar',
	'addons.snippets.empty': 'No se encontraron snippets CSS',
	'addons.snippets.unavailable':
		'Los controles de snippets CSS no están disponibles en esta versión de Obsidian',
	'addons.snippets.failed': 'No se pudo actualizar el snippet CSS',
	'addons.plugins.empty': 'No se encontraron plugins comunitarios',
	'addons.plugins.unavailable':
		'Los controles de plugins no están disponibles en esta versión de Obsidian',
	'addons.plugins.failed': 'No se pudo actualizar el plugin',
	'addons.open_settings': 'Abrir settings del plugin',
	'addons.installed': 'Instalado',
	'addons.updated': 'Actualizado',
	'addons.version': 'Versión',
	'addons.author': 'Autor',
	'filters.active': 'Filtros activos',
	'filters.active_zero': 'Los filtros activos no devuelven archivos',
	'settings.filters_show_tab_labels': 'Mostrar labels en tabs',
	'settings.filters_show_tab_labels.desc':
		'Muestra u oculta el texto junto a los iconos de tabs en las pages.',
	'settings.context_menu': 'Menús contextuales',
	'settings.context_menu.file_menu': 'Mostrar en menú de archivos',
	'settings.context_menu.file_menu.desc':
		'Agrega acciones de Vaultman al menú contextual de archivos de Obsidian.',
	'settings.context_menu.editor_menu': 'Mostrar en menú del editor',
	'settings.context_menu.editor_menu.desc':
		'Agrega acciones de Vaultman al menú contextual del editor de Obsidian.',
	'settings.context_menu.more_options': 'Mostrar en menú de más opciones',
	'settings.context_menu.more_options.desc':
		'Agrega acciones de Vaultman al menú de más opciones de archivos.',
	'context_menu.clean_filters': 'Limpiar filtros',
	'nav.filters': 'Datos',
	'nav.ops': 'Archivos',
	'nav.statistics': 'Estadísticas',

	// Operations panel
	'ops.panel.title': 'Operaciones',
	'ops.tab.queue': 'Cola',
	'ops.tab.rename': 'Renombrar',
	'ops.tab.linter': 'Linter',
	'ops.tab.templates': 'Plantillas',
	'ops.tab.move': 'Mover',
	'ops.move.coming_soon': 'Próximamente',
	'ops.tab.content_short': 'Texto',
	'ops.tabs.props': 'Propiedades',
	'ops.tabs.tags': 'Etiquetas',
	'ops.tabs.content': 'Texto',

	// Layout settings
	'settings.ops_position': 'Posición del panel de operaciones',
	'settings.ops_position.desc': 'Dónde aparece el panel de operaciones',
	'settings.ops_position.right': 'Panel derecho',
	'settings.ops_position.bottom': 'Panel inferior',
	'settings.ops_position.replace': 'Reemplazar explorador',

	// Explorer sort sections
	'explorer.sort.section_props': 'Propiedades',
	'explorer.sort.section_values': 'Valores',
	'explorer.sort.value_name': 'Por nombre',
	'explorer.sort.value_count': 'Por ocurrencias',

	// Grid settings
	'settings.grid_render_mode': 'Modo de renderizado de la tabla',
	'settings.grid_render_mode.desc':
		'Cómo se renderizan los valores de propiedades en la tabla',
	'settings.grid_render_mode.plain': 'Texto plano',
	'settings.grid_render_mode.chunk': 'Vista previa (por bloques)',
	'settings.grid_render_mode.all': 'Vista previa (todo a la vez)',
	'settings.grid_editable_columns': 'Columnas editables',
	'settings.grid_editable_columns.desc':
		'Columnas que permiten edición en línea (separadas por coma, incluir "name" para renombrar)',
	'settings.base_file': 'Ruta del archivo base',
	'settings.base_file.desc':
		'Ruta a un archivo .base para sincronización bidireccional con Obsidian Bases',
	'filter.viewmode_btn': 'Modo de vista',
	'filter.sort_btn': 'Ordenar',
	'filter.search_clear': 'Limpiar búsqueda',
	'filter.search_mode': 'Modo de búsqueda',
	'filter.category.all_props': 'Todo',
	'filter.category.prop_names': 'Nombre de prop',
	'filter.category.all_tags': 'Todas',
	'filter.category.leaf_tags': 'Hojas',
	'filter.category.files': 'Archivos',
	'filter.category.folders': 'Carpetas',
	'filters.popup.templates': 'Plantillas de filtros',
	'filters.popup.empty': 'Sin filtros activos',
	'filters.popup.active': 'reglas activas',
	'filters.popup.filtered_files': '{filtered} / {total} archivos',
	'filters.popup.clear_all': 'Limpiar filtros',
	'filters.popup.rule.disable': 'Desactivar filtro',
	'filters.popup.rule.enable': 'Activar filtro',
	'filters.popup.rule.delete': 'Eliminar filtro',
	'filters.view_state.files_type': 'Tipo en vista Files',
	'filters.view_state.files_type_desc':
		'La vista Files esta limitada a archivos {type}.',
	'filters.bases.menu': 'Importar/exportar filtros de Bases',
	'filters.bases.import': 'Importar',
	'filters.bases.export': 'Exportar filtros activos a Base',
	'filters.bases.exported': 'Filtros exportados a {path}',
	'filters.bases.imported': 'Filtros de Bases importados',
	'filters.bases.no_files': 'No se encontraron archivos .base',
	'filters.bases.no_active_filters': 'No hay filtros activos para exportar',
	'filters.bases.no_supported_filters':
		'No se encontraron filtros de Bases compatibles',
	'filters.bases.invalid_yaml': 'No se pudo leer este archivo .base',
	'filters.bases.global_filters': 'Filtros globales',
	'filters.bases.view': 'Vista',
	'sort.by.name': 'Nombre',
	'sort.by.state': 'Estado',
	'sort.by.type': 'Tipo',
	'sort.by.count': 'Cantidad',
	'sort.by.props': 'Props',
	'sort.by.words': 'Palabras',
	'sort.by.date': 'Fecha',
	'sort.by.modified': 'Modificación',
	'sort.by.created': 'Creación',
	'sort.by.installed': 'Instalación',
	'sort.by.updated': 'Actualización',
	'sort.by.ext': 'Extensión',
	'sort.by.opened': 'Última apertura',
	'sort.by.path': 'Ruta',
	'sort.by.parent': 'Padre',
	'sort.by.sub': 'Subelementos',
	'sort.by.subtags': 'Subetiquetas',
	'sort.by.custom': 'Personalizado',
	'sort.by.columns': 'Columnas',
	'sort.parents_first': 'Folders first',
	'sort.close': 'Cerrar orden',
	'sort.vertcol.by_values':
		'Ordenando por valores — clic para ordenar por props',
	'sort.vertcol.by_props':
		'Ordenando por props — clic para ordenar por valores',
	'sort.vertcol.by_nested':
		'Mostrando tags anidados — clic para mostrar solo raíz',
	'sort.vertcol.by_root': 'Mostrando tags raíz — clic para mostrar anidados',
	'sort.vertcol.props_values': 'Alternar props / valores',
	'sort.level.title': 'Por nivel',
	'content.pause_search': 'Pausar búsqueda',
	'content.resume_search': 'Reanudar búsqueda',
	'content.restart_search': 'Reiniciar búsqueda',
	'content.copy_results': 'Copiar resultados de búsqueda',
	'content.bookmark_search': 'Guardar búsqueda en marcadores',
	'content.result_actions': 'Más opciones',
	'content.show_more_context': 'Mostrar más contexto',
	'content.show_more_files': 'Mostrar {count} fichero(s) más',
	'content.show_more_matches': 'Mostrar {count} coincidencia(s) más',
	'settings.text_search_intercepts':
		'Buscar la selección en el explorador de Texto',
	'settings.text_search_intercepts.desc':
		'Añade una entrada de menú que busca el texto seleccionado en Vaultman en vez de en la búsqueda de Obsidian.',
	'content.search_selection': 'Buscar la selección en Vaultman',
	'content.current_note': 'Abierta ahora',
	'content.replace_occurrence': 'Reemplazar esta coincidencia',
	'content.replace_occurrence_needs_value':
		'Reemplazar esta coincidencia (escribe antes un reemplazo)',
	'content.more_context_here': 'Mostrar más contexto aquí',
	'content.reset_context_here': 'Restablecer el contexto aquí',
	'queue.guard.superseded':
		'Se reemplazó {count} operación(es) en cola sobre el mismo texto.',
	'settings.operations': 'Operaciones',
	'settings.queue_warn_supersede':
		'Avisar cuando se reemplaza una operación en cola',
	'settings.queue_warn_supersede.desc':
		'Encolar un segundo reemplazo del mismo texto sustituye al primero, porque el primero dejaría al segundo sin nada que coincidir. Esto decide si se avisa.',
	'content.copy_results_action': 'Copiar resultados',
	'content.copy_option_show_path': 'Mostrar ruta completa',
	'content.copy_option_link_style': 'Estilo de enlace',
	'content.copy_option_list_style': 'Estilo de lista',
	'content.copy_link_none': 'Ninguno',
	'content.copy_link_wikilink': 'Wikilink',
	'content.copy_link_markdown': 'Markdown',
	'content.copy_list_none': 'Ninguno',
	'content.copy_no_results': 'No hay resultados que copiar.',
	'content.bookmarked': 'Búsqueda guardada: {query}',
	'content.bookmarks_unavailable': 'El plugin Marcadores está desactivado.',
	'content.copy_unavailable':
		'La búsqueda de Obsidian no está disponible en esta bóveda.',
	'sort.level.nested': 'Anidado',
	'sort.level.filtered': 'Filtrado',
	'sort.reveal.current_file': 'Archivo actual',
	'sort.reveal.drill': 'Anclar una nota',
	'sort.reveal.pick_hint':
		'Haz clic en una nota para anclarla, o abre una en el editor. Esc cancela',
	'sort.reveal.pick_needs_note':
		'Elige una nota: una carpeta no se puede anclar',
	'sort.level.fixed_folders': 'Carpetas fijas',
	'settings.sort_level_inline': 'Opciones By level en línea',
	'settings.sort_level_inline.desc':
		'Muestra las opciones By level directamente en el menú de orden en vez de un submenú.',
	'settings.toc_drill_sync': 'El drill del índice define el scope del sort',
	'settings.toc_drill_sync.desc':
		'El scope drill del índice flotante también selecciona el scope del sort; cerrar el índice restaura el scope por defecto.',
	'sort.level.properties': 'Propiedades',
	'sort.level.values': 'Valores',
	'sort.level.all': 'Todos los niveles',
	'sort.level.drill': 'Scope: drill',
	'sort.level.pick_hint': 'Mantén pulsada una fila para elegir el scope drill',
	'sort.vertcol.node_level': 'Alternar nivel de nodos',
	'sort.vertcol.direct_toggle': 'Alternar dirección',
	'sort.vertcol.scope_drawer': 'Abrir filtro de tipo',
	'sort.type.all': 'Todos los tipos',
	'sort.type.folders': 'Carpetas',
	'sort.type.props_only': 'Props',
	'sort.type.tags': 'Etiquetas',
	'sort.type.list': 'Lista',
	'sort.type.text': 'Texto',
	'sort.type.number': 'Número',
	'sort.type.date': 'Fecha',
	'sort.type.datetime': 'Fecha y hora',
	'sort.type.checkbox': 'Casilla',
	'sort.type.aliases': 'Alias',
	'sort.type.cssclasses': 'Clases CSS',
	'sort.type.unknown': 'Desconocido',
	'sort.type.nested': 'Etiquetas anidadas',
	'sort.type.simple': 'Etiquetas simples',
	'sort.type.frontmatter': 'Etiquetas del frontmatter',
	'sort.type.inline': 'Etiquetas en el cuerpo',
	'viewmode.close': 'Cerrar modo de vista',
	'viewmode.mode.tree': 'Árbol',
	'viewmode.mode.dnd': 'Drag & Drop',
	'viewmode.mode.table': 'Tabla',
	'viewmode.mode.cards': 'Cards',
	'viewmode.pill.icon': 'Icono',
	'viewmode.pill.checkbox': 'Casilla',
	'viewmode.pill.text': 'Texto',
	'viewmode.pill.count': 'Cantidad',
	'viewmode.pill.prop_count': 'Props',
	'viewmode.pill.ext': 'Ext',
	'viewmode.pill.nested': 'Anidadas',
	'viewmode.pill.sub': 'Subelementos',
	'viewmode.pill.name': 'Nombre',
	'viewmode.pill.date': 'Fecha',
	'viewmode.pill.mtime': 'Modificación',
	'viewmode.pill.ctime': 'Creación',
	'viewmode.pill.type': 'Tipo',
	'viewmode.pill.tag_type': 'Escrita en',
	'tags.source.frontmatter': 'frontmatter',
	'tags.source.inline': 'cuerpo',
	'tags.source.both': 'ambos',
	'viewmode.pill.format': 'Formato',
	'viewmode.pill.opened': 'Última apertura',
	'viewmode.pill.path': 'Ruta',
	'viewmode.pill.parent': 'Padre',
	'viewmode.pill.words': 'Palabras',
	'viewmode.pill.state': 'Estado',
	'viewmode.pill.config': 'Config',
	'viewmode.pill.installed': 'Instalado',
	'viewmode.pill.updated': 'Actualizado',
	'stats.folders': 'Carpetas',
	'stats.files': 'Archivos',
	'stats.props': 'Propiedades',
	'stats.values': 'Valores',
	'stats.tags': 'Etiquetas',
	'stats.addons': 'Add-ons',
	'stats.total_links': 'Links totales',
	'stats.opened_today': 'Abiertas hoy',
	'stats.remaining_tasks': 'Tareas pendientes',
	'stats.word_count': 'Conteo de palabras',
	'stats.reconciling': 'Reconciliando',
	'viewmode.add_mode': 'Modo AGREGAR',
	'content.find_placeholder': 'Buscar en contenido...',
	'content.replace_placeholder': 'Reemplazar con...',
	'content.toggle_case': 'Distinguir mayusculas',
	'content.toggle_regex': 'Expresion regular',
	'content.toggle_replace': 'Mostrar campo de reemplazo',
	'content.scope_hint_selected': 'Alcance: {count} archivo(s) seleccionado(s)',
	'content.scope_hint_filtered':
		'Alcance: {count}/{total} archivos - {filters} filtro(s)',
	'content.scope_hint_searching':
		'Buscando {count}/{total} archivos - {filters} filtro(s)',
	'content.with_active_filters': 'con filtros activos',
	'content.with_excluded': 'con {count} excluidos',
	'queue.details.replace': 'Reemplazar',
	'content.preview': 'Vista previa',
	'content.queue_replace': 'Encolar reemplazo',
	'content.queue_no_matches': 'No hay coincidencias de contenido para encolar',
	'content.preview_count': '{matches} coincidencias en {files} archivo(s)',
	'content.preview_more': '{count} archivo(s) mas',
	'content.no_matches': 'Se encontraron 0 resultados',
	'content.invalid_regex': 'Expresion regular invalida',
	'content.reveal_no_active_file': 'No hay un archivo Markdown activo',
	'content.reveal_not_in_results':
		'El archivo activo esta fuera de los resultados de Content',
	'content.landing_title': 'Búsqueda de texto',
	'content.landing_desc': 'Escribe un término para explorar el alcance actual.',
	'content.empty_desc': 'Prueba otro término o ajusta los filtros actuales.',
	// U121-027: celdas de tiempo relativo
	'time.just_now': 'Ahora mismo',
	'time.minute_ago': 'hace {count} minuto',
	'time.minutes_ago': 'hace {count} minutos',
	'time.hour_ago': 'hace {count} hora',
	'time.hours_ago': 'hace {count} horas',
	// Los singulares se leen como "la unidad pasada" (y un día atrás es "Ayer"):
	// el count ahí siempre es 1, así que el texto nombra el periodo.
	'time.day_ago': 'Ayer',
	'time.days_ago': 'hace {count} días',
	'time.week_ago': 'La semana pasada',
	'time.weeks_ago': 'hace {count} semanas',
	'time.month_ago': 'El mes pasado',
	'time.months_ago': 'hace {count} meses',
	'time.quarter_ago': 'El trimestre pasado',
	'time.quarters_ago': 'hace {count} trimestres',
	'time.semester_ago': 'El semestre pasado',
	'time.semesters_ago': 'hace {count} semestres',
	'time.year_ago': 'El año pasado',
	'time.years_ago': 'hace {count} años',
	'settings.timestamp_format': 'Marcas de tiempo relativas',
	'settings.timestamp_format.desc':
		'Muestra Ultima apertura, Modificado y Creado como "hace 3 horas" en vez de la fecha exacta. Desactivalo para mostrar siempre la fecha exacta.',
	'settings.timestamp_window': 'Límite del tiempo relativo',
	'settings.timestamp_window.desc':
		'Hasta cuándo las marcas se muestran relativas. Las celdas más antiguas muestran la fecha exacta. "Sin límite" mantiene todas las marcas relativas.',
	'settings.timestamp_window.24h': 'Últimas 24 horas',
	'settings.timestamp_window.31d': 'Últimos 31 días',
	'settings.timestamp_window.year': 'Este año',
	'settings.timestamp_window.always': 'Sin límite',
	'settings.timestamp_cutoffs': 'Unidades del tiempo relativo',
	'settings.timestamp_cutoffs.desc':
		'Ajusta a fondo cuándo cambia la unidad — a partir de cuántos segundos se cuenta en minutos, minutos en horas, y así hasta años.',
	'settings.timestamp_cutoffs.configure': 'Configurar',
	'settings.timestamp_cutoffs.title': 'Unidades del tiempo relativo',
	'settings.timestamp_cutoffs.subtitle':
		'Los campos vacíos usan el valor por defecto. Los cambios se aplican al instante.',
	'settings.timestamp_cutoffs.reset': 'Restaurar valores por defecto',
	'settings.timestamp_cutoffs.minuteFromSeconds': 'Minutos desde (segundos)',
	'settings.timestamp_cutoffs.minuteFromSeconds.desc':
		'Por debajo de estos segundos la celda dice "Ahora mismo"; desde aquí cuenta en minutos.',
	'settings.timestamp_cutoffs.hourFromMinutes': 'Horas desde (minutos)',
	'settings.timestamp_cutoffs.hourFromMinutes.desc':
		'A partir de estos minutos la celda cuenta en horas.',
	'settings.timestamp_cutoffs.dayFromHours': 'Días desde (horas)',
	'settings.timestamp_cutoffs.dayFromHours.desc':
		'A partir de estas horas la celda cuenta en días.',
	'settings.timestamp_cutoffs.weekFromDays': 'Semanas desde (días)',
	'settings.timestamp_cutoffs.weekFromDays.desc':
		'A partir de estos días la celda cuenta en semanas.',
	'settings.timestamp_cutoffs.monthFromWeeks': 'Meses desde (semanas)',
	'settings.timestamp_cutoffs.monthFromWeeks.desc':
		'A partir de estas semanas la celda cuenta en meses.',
	'settings.timestamp_cutoffs.quarterFromMonths': 'Trimestres desde (meses)',
	'settings.timestamp_cutoffs.quarterFromMonths.desc':
		'A partir de estos meses la celda cuenta en trimestres.',
	'settings.timestamp_cutoffs.semesterFromQuarters':
		'Semestres desde (trimestres)',
	'settings.timestamp_cutoffs.semesterFromQuarters.desc':
		'A partir de estos trimestres la celda cuenta en semestres.',
	'settings.timestamp_cutoffs.yearFromSemesters': 'Años desde (semestres)',
	'settings.timestamp_cutoffs.yearFromSemesters.desc':
		'A partir de estos semestres la celda cuenta en años.',
	'settings.tooltip_time_section': 'Marcas de tiempo del tooltip',
	'settings.tooltip_timestamp_format.desc':
		'Muestra las entradas de tiempo del tooltip como texto relativo. Independiente de las opciones de los cells.',
	'settings.tooltip_timestamp_window.desc':
		'Hasta cuándo las entradas del tooltip se muestran relativas. Independiente de las opciones de los cells.',
};
