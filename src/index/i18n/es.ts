export const es: Record<string, string> = {
	// General
	'plugin.name': 'Vaultman',
	'plugin.description': 'Editor masivo de propiedades y herramienta de gestión de vault',
	'plugin.open': 'Abrir Vaultman',
	'common.close': 'Cerrar',
	'common.cancel': 'Cancelar',
	'common.confirm': 'Confirmar',

	// Modales
	'modal.delete_conflict.title': 'Operaciones en conflicto',
	'modal.delete_conflict.body':
		'Esto descartará las operaciones [{ops}] sobre {label}. ¿Continuar?',

	// Herramientas
	'tools.ops_log.title': 'Registro de operaciones',
	'tools.ops_log.clear': 'Limpiar registro',
	'tools.ops_log.filter_kind': 'Filtrar por tipo',
	'tools.ops_log.filter_label': 'Filtrar por etiqueta',
	'tools.ops_log.empty': 'Sin registros todavía.',
	'ops.tabs.snippets': 'Snippets',
	'ops.tabs.plugins': 'Plugins',

	// View menu — independent leaves (phase 6 multifacet wave 2)
	'viewmenu.detach_to_leaf': 'Despegar a panel',
	'viewmenu.return_to_panel': 'Devolver al panel',
	'settings.leaf_toggle.all_independent': 'Todas las pestañas como paneles independientes',

	// Phase 7 — binding notes & set action
	'cmenu.binding_note.create_or_open': 'Crear / abrir nota de enlace',
	'cmenu.set.tag': 'Establecer etiqueta',
	'cmenu.set.prop': 'Establecer propiedad',
	'cmenu.set.value': 'Establecer valor',
	'cmenu.set.file': 'Set (añadir enlace)',
	'binding_note.notice.routed': 'Hay {count} notas con este alias. Filtrando…',
	'settings.binding_note_folder': 'Carpeta de notas de enlace',
	'settings.binding_note_folder.desc':
		'Carpeta donde se crean las nuevas notas de enlace. Vacío = raíz del vault.',
	'settings.binding_note_folder.invalid':
		'La carpeta "{folder}" no existe en este vault.',
	'settings.ops_log_retention': 'Retención del registro de operaciones',
	'settings.ops_log_retention.desc':
		'Número máximo de registros del ring buffer del registro de operaciones (100–10000).',
	'settings.fnr_regex_default': 'Buscar y reemplazar con regex por defecto',
	'settings.fnr_regex_default.desc':
		'Si está activo, las nuevas islas de Buscar y reemplazar empiezan con la opción regex activada.',

	// Sections
	'section.filters': 'Filtros',
	'section.files': 'Archivos',
	'section.operations': 'Operaciones',

	// Filter types
	'filter.has_property': 'Tiene propiedad',
	'filter.missing_property': 'Sin propiedad',
	'filter.specific_value': 'Valor específico',
	'filter.multiple_values': 'Valores múltiples',
	'filter.folder': 'En carpeta',
	'filter.folder_exclude': 'Excluir carpeta',
	'filter.file_name': 'Nombre contiene',
	'filter.file_name_exclude': 'Nombre excluye',

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

	// File list
	'files.search': 'Buscar archivos...',
	'files.select_all': 'Seleccionar todo',
	'files.select_none': 'Deseleccionar todo',
	'files.show_checked_only': 'Mostrar solo archivos marcados',
	'files.count': '{filtered} / {total} archivos',
	'files.count.short': 'archivos',
	'files.col.name': 'Nombre',
	'files.col.props': '# Props',
	'files.col.path': 'Ruta',

	// Operations
	'ops.properties': 'Propiedades',
	'ops.tools': 'Herramientas',
	'ops.queue': 'Cola ({count} pendientes)',
	'ops.queue.empty': 'Cola (vacía)',
	'ops.apply': 'Aplicar',
	'ops.clear': 'Limpiar cola',
	'ops.details': 'Ver detalles',

	// Property manager
	'prop.title': 'Gestor de Propiedades',
	'prop.scope': 'Alcance',
	'prop.scope.filtered': 'Todos los archivos filtrados',
	'prop.scope.selected': 'Solo archivos seleccionados',
	'prop.property': 'Propiedad',
	'prop.value': 'Valor',
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
	'queue.remove': 'Quitar cambio de la cola',

	// Queue counter
	'queue.summary': '{ops} ops · {files}',
	'queue.file_row': '{ops} ops',

	// Squircle labels
	'queue.clear': 'Limpiar cola',
	'queue.marks': 'Marcas / Plantillas',
	'queue.file_diff': 'Diff de archivo',
	'queue.execute': 'Ejecutar cola',

	// Placeholder
	'queue.file_diff_coming': 'Cargando vista de diff…',

	// Op-type group labels (acrónimos técnicos se mantienen en inglés)
	'queue.op_type.prop': 'PROP',
	'queue.op_type.content_replace': 'F&R',
	'queue.op_type.file_rename': 'RENOMBRAR ARCHIVO',
	'queue.op_type.file_move': 'MOVER ARCHIVO',
	'queue.op_type.file_delete': 'BORRAR ARCHIVO',
	'queue.op_type.template': 'TEMPLATE',
	'queue.op_type.tag': 'TAG',
	'queue.op_type.link_append': 'AGREGAR ENLACES',

	// viewDiff toggle labels
	'queue.view_diff.only_changes': 'Solo cambios',
	'queue.view_diff.full_document': 'Documento completo',
	'queue.view_diff.file_picker_placeholder': 'Seleccionar archivo…',
	'queue.view_diff.body_omitted': 'cuerpo modificado ({bytes} bytes) — diff omitido',
	'queue.view_diff.more_options': 'Más opciones',
	'queue.view_diff.frontmatter': 'Frontmatter',
	'queue.view_diff.no_frontmatter_changes': 'Sin cambios en frontmatter',
	'queue.view_diff.body': 'Cuerpo',
	'queue.view_diff.no_body_changes': 'Sin cambios en el cuerpo',
	'queue.view_diff.document': 'Documento',

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
	'settings.language': 'Idioma',
	'settings.language.desc': 'Idioma de la interfaz',
	'settings.default_type': 'Tipo de propiedad por defecto',
	'settings.default_type.desc': 'Tipo por defecto para nuevas propiedades',
	'settings.templates': 'Plantillas de filtros',
	'settings.templates.desc': 'Gestionar plantillas de filtros guardadas',
	'settings.layout_theme': 'Tema del layout',
	'settings.layout_theme.native': 'Nativo',
	'settings.layout_theme.default': 'Predeterminado',
	'settings.layout_theme.polish': 'Polish',
	'settings.layout_theme.glass': 'Glass',
	'settings.layout_theme.custom': 'Crear uno propio',
	'settings.island_dismiss_outside': 'Cerrar islas al hacer clic fuera',
	'settings.island_backdrop_blur': 'Desenfocar contenido detrás de islas',

	// Main view
	'view.main.title': 'Vaultman',
	'command.open_main': 'Abrir Vaultman (vista completa)',
	'command.open_sidebar': 'Abrir barra lateral de Vaultman',
	'command.apply_queue': 'Aplicar operaciones pendientes',

	// Toolbar
	'toolbar.filters': 'Filtros',
	'toolbar.queue': 'Cola',
	'toolbar.no_session': 'Sin sesión',
	'toolbar.new_session': '+ Nueva sesión...',
	'filters.active': 'Filtros activos',
	'filters.active.empty': 'No hay filtros activos',
	'filters.remove': 'Quitar filtro',

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
	'rename.pattern_desc': 'Usa marcadores: {basename}, {date}, {counter}, {propiedad}',

	// Status bar (extended)
	'statusbar.props_label': '{count} props',
	'statusbar.values_label': '{count} valores',

	// Property Explorer
	'explorer.title': 'Propiedades',
	'explorer.search': 'Buscar propiedades...',
	'explorer.empty': 'No se encontraron propiedades',
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
	'explorer.sort.values': 'Por cantidad de valores',

	// Explorer context menu — properties
	'explorer.ctx.rename': 'Renombrar propiedad',
	'explorer.ctx.type': 'Tipo de propiedad',
	'explorer.ctx.icon': 'Cambiar ícono (Iconic)',
	'explorer.ctx.delete_prop': 'Eliminar propiedad',
	'explorer.ctx.add_value': 'Agregar valor',

	// Explorer context menu — values
	'explorer.ctx.rename_value': 'Renombrar valor',
	'explorer.ctx.move_value': 'Mover a propiedad...',
	'explorer.ctx.convert': 'Convertir',
	'explorer.ctx.delete_value': 'Eliminar valor',

	// Explorer convert submenu
	'explorer.ctx.wikilink': 'A [[wikilink]]',
	'explorer.ctx.wikilink_alias': 'A [[nota|alias]]',
	'explorer.ctx.md_link': 'A [alias](nota)',
	'explorer.ctx.uppercase': 'MAYÚSCULAS',
	'explorer.ctx.lowercase': 'minúsculas',
	'explorer.ctx.capitalize': 'Primera Letra Mayúscula',

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
	'explorer.warn.no_files_selected': 'Selecciona archivos en el file tree primero',

	// Settings (new)
	'settings.ctrl_click_search': 'Ctrl+click abre búsqueda',
	'settings.ctrl_click_search.desc':
		'Ctrl+click en una propiedad o valor abre la búsqueda de Obsidian con la query',
	'settings.queue_preview': 'Vista previa de cola en explorador',
	'settings.queue_preview.desc':
		'Muestra cambios pendientes de la cola en el explorador de propiedades',
	'settings.explorer_matched_filter_decorations':
		'Decoración de nodos que coinciden con filtros',
	'settings.explorer_node_backgrounds': 'Fondos de nodos',
	'settings.explorer_node_borders': 'Bordes de nodos',
	'settings.content_search': 'Búsqueda de contenido',
	'settings.content_search.desc': 'Habilita búsqueda en contenido de archivos en el file tree',
	'settings.files_show_hidden': 'Mostrar archivos y carpetas ocultas',
	'settings.files_show_hidden.desc':
		'Incluye rutas que empiezan por punto, como .folder y .config, en el explorer Files.',
	'settings.operation_scope': 'Alcance de operaciones',
	'settings.operation_scope.desc': 'Alcance por defecto para operaciones del explorador',
	'settings.scope.auto': 'Auto (seleccionados > filtrados > todos)',
	'settings.scope.selected': 'Solo archivos seleccionados',
	'settings.scope.filtered': 'Archivos filtrados',
	'settings.scope.all': 'Todos los archivos',

	// File list (extended)
	'files.content_search': 'Buscar en contenido...',

	// Property type datetime
	'prop.type.datetime': 'Fecha y Hora',

	// Header bar
	'header.show_selected': 'Mostrar solo seleccionados',
	'header.queue_badge': '{count} pendientes',

	// Operations panel
	'ops.panel.title': 'Operaciones',
	'ops.tab.queue': 'Cola',
	'ops.tab.rename': 'Renombrar',
	'ops.tab.linter': 'Linter',
	'ops.tab.templates': 'Plantillas',
	'ops.tab.move': 'Mover',
	'ops.move.coming_soon': 'Próximamente',

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
	'sort.expand_all_nodes': 'Expandir todo',
	'sort.collapse_all_nodes': 'Colapsar todo',
	'sort.toggle_node_expansion': 'Alternar expansión de nodos',
	'sort.manual_dnd': 'Arrastre manual',
	'sort.manual_dnd.desc':
		'Arrastra nodos para reordenarlos o soltar su payload markdown en una nota',

	// Grid settings
	'settings.grid_render_mode': 'Modo de renderizado de la tabla',
	'settings.grid_render_mode.desc': 'Cómo se renderizan los valores de propiedades en la tabla',
	'settings.grid_render_mode.plain': 'Texto plano',
	'settings.grid_render_mode.chunk': 'Vista previa (por bloques)',
	'settings.grid_render_mode.all': 'Vista previa (todo a la vez)',
	'settings.grid_hierarchy_mode': 'Modo de jerarquía del grid',
	'settings.grid_hierarchy_mode.folder': 'Navegación por carpetas',
	'settings.grid_hierarchy_mode.inline': 'Expansión inline',
	'settings.grid_editable_columns': 'Columnas editables',
	'settings.grid_editable_columns.desc':
		'Columnas que permiten edición en línea (separadas por coma, incluir "name" para renombrar)',
	'settings.base_file': 'Ruta del archivo base',
	'settings.base_file.desc':
		'Ruta a un archivo .base para sincronización bidireccional con Obsidian Bases',
	'viewmode.mode.table': 'Tabla',
	'viewmode.add_mode': 'Modo AGREGAR',
	'stats.folders': 'Carpetas',
	'stats.files': 'Archivos',
	'stats.props': 'Propiedades',
	'stats.values': 'Valores',
	'stats.tags': 'Etiquetas',
	'stats.total_links': 'Enlaces totales',
	'stats.word_count': 'Conteo de palabras',
	'stats.show_pagestats': 'Mostrar PageStats',
	'filter.search_help': 'Ayuda de semántica de búsqueda',
	'filter.search_read_more': 'Leer más',
	'filter.search_history': 'Búsquedas recientes',
	'filter.tab.outline': 'Esquema',
	'filter.category.props': 'Props',
	'filter.category.values': 'Valores',
	'fnr.more_options': 'Búsqueda y reemplazo avanzado',
	'fnr.advanced': 'Búsqueda y reemplazo avanzado',
	'fnr.syntax': 'Sintaxis',
	'fnr.case_sensitive': 'Case',
	'fnr.whole_word': 'Palabra completa',
	'fnr.scope': 'Alcance de reemplazo',
	'fnr.scope.filtered': 'Filtrados',
	'fnr.scope.selected': 'Seleccionados',
	'fnr.scope.all': 'Todos',
	'fnr.scope_label': '{count} archivos · {scope}',
	'fnr.rename.title': 'Handoff de renombrado',
	'fnr.rename.context': 'Renombrar {kind} "{original}" · {count} archivos',
	'fnr.rename.context_value': 'Renombrar valor "{original}" en {prop} · {count} archivos',
	'fnr.rename.replacement': 'Reemplazo de renombrado',
	'fnr.rename.queue': 'Agregar renombrado a cola',
	'fnr.rename.cancel': 'Cancelar renombrado',
	'fnr.rename.kind.prop': 'propiedad',
	'fnr.rename.kind.value': 'valor',
	'fnr.rename.kind.tag': 'tag',
	'fnr.rename.kind.file': 'archivo',
	'fnr.syntax.plain': 'Texto',
	'fnr.syntax.regex': 'Regex',
	'fnr.syntax.obsidian-search': 'Obsidian',
	'fnr.syntax.obsidian-bases': 'Bases',
	'fnr.syntax.dataview-dql': 'Dataview',
	'fnr.syntax.ant-renamer': 'Ant',
};
