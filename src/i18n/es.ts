export const es: Record<string, string> = {
	// General
	'plugin.name': 'Vaultman',
	'plugin.description':
		'Editor masivo de propiedades y herramienta de gestión de vault',
	'plugin.open': 'Abrir Vaultman',
	'common.cancel': 'Cancelar',

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
	'filter.create': 'Crear',
	'filter.tabs_btn': 'Pestañas',
	'filter.auto_reveal': 'Auto-revelar archivo actual',
	'filter.expand_all': 'Expandir todo',
	'filter.collapse_all': 'Colapsar todo',

	// File list
	'files.search': 'Buscar archivos...',
	'files.select_all': 'Seleccionar todo',
	'files.select_none': 'Deseleccionar todo',
	'files.show_checked_only': 'Mostrar solo archivos marcados',
	'files.count': '{filtered} / {total} archivos',
	'files.col.name': 'Nombre',
	'files.col.file_name': 'file name',
	'files.col.props': '# Props',
	'files.col.ext': 'Ext',
	'files.col.file_ext': 'file extension',
	'files.col.path': 'Ruta',
	'files.col.file_folder': 'folder',
	'files.col.date': 'Fecha',
	'files.empty_filtered_title': 'No hay archivos que coincidan',
	'files.empty_filtered_desc': 'Prueba cambiar o limpiar los filtros activos.',

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
	'queue.template.templates': 'Presets de acción',
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
	'settings.background_blur': 'Intensidad de desenfoque del fondo',
	'settings.background_blur.desc':
		'Controla el desenfoque de cristal en la barra inferior y los popups.',
	'settings.minimal_style': 'Estilo minimal',
	'settings.minimal_style.desc':
		'Usa botones compactos nativos de Obsidian en headers y dock inferior.',
	'settings.bypass_operations': 'Omitir cola de operaciones',
	'settings.bypass_operations.desc':
		'Ejecuta operaciones inmediatamente en vez de prepararlas en la cola.',
	'settings.bulk_operation_warning': 'Aviso de operación masiva',
	'settings.bulk_operation_warning.desc':
		'Avisa antes de que los presets de acción preparen conjuntos muy grandes de archivos.',
	'settings.performance_monitor': 'Monitor de rendimiento',
	'settings.performance_monitor.desc':
		'Muestra el monitor flotante de FPS, long tasks, memoria y acciones.',
	'settings.default_type': 'Tipo de propiedad por defecto',
	'settings.default_type.desc': 'Tipo por defecto para nuevas propiedades',
	'settings.templates': 'Plantillas de filtros',
	'settings.templates.desc': 'Gestionar plantillas de filtros guardadas',
	'settings.queue_templates.desc':
		'Gestionar presets guardados de operaciones preparadas',

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
		'Usa marcadores: {basename}, {date}, {counter}, {propiedad}',

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
	'settings.content_search': 'Búsqueda de contenido',
	'settings.content_search.desc':
		'Habilita búsqueda en contenido de archivos en el file tree',
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
	'settings.open_mode.both': 'Ambas',

	// File list (extended)
	'files.content_search': 'Buscar en contenido...',

	// Property type datetime
	'prop.type.datetime': 'Fecha y Hora',

	// Header bar
	'header.show_selected': 'Mostrar solo seleccionados',
	'header.queue_badge': '{count} pendientes',
	'filter.tab.tags': 'Etiquetas',
	'filter.tab.props': 'Props',
	'filter.tab.files': 'Archivos',
	'filter.tab.content': 'Contenido',
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
	'sort.by.count': 'Cantidad',
	'sort.by.date': 'Fecha',
	'sort.by.ext': 'Extensión',
	'sort.by.path': 'Ruta',
	'sort.by.sub': 'Subelementos',
	'sort.by.subtags': 'Subetiquetas',
	'sort.by.columns': 'Columnas',
	'sort.close': 'Cerrar orden',
	'sort.vertcol.props_values': 'Alternar props / valores',
	'sort.vertcol.node_level': 'Alternar nivel de nodos',
	'sort.vertcol.direct_toggle': 'Alternar dirección',
	'sort.vertcol.scope_drawer': 'Abrir filtro de tipo',
	'sort.type.all': 'Todos los tipos',
	'sort.type.tags': 'Etiquetas',
	'sort.type.list': 'Lista',
	'sort.type.text': 'Texto',
	'sort.type.number': 'Número',
	'sort.type.date': 'Fecha',
	'sort.type.checkbox': 'Casilla',
	'sort.type.aliases': 'Alias',
	'sort.type.cssclasses': 'Clases CSS',
	'sort.type.unknown': 'Desconocido',
	'sort.type.nested': 'Etiquetas anidadas',
	'sort.type.simple': 'Etiquetas simples',
	'viewmode.close': 'Cerrar modo de vista',
	'viewmode.mode.tree': 'Árbol',
	'viewmode.mode.dnd': 'Drag & Drop',
	'viewmode.mode.grid': 'Grid',
	'viewmode.mode.table': 'Tabla',
	'viewmode.mode.cards': 'Cards',
	'viewmode.pill.icon': 'Icono',
	'viewmode.pill.text': 'Texto',
	'viewmode.pill.count': 'Cantidad',
	'viewmode.pill.ext': 'Ext',
	'viewmode.pill.nested': 'Anidadas',
	'viewmode.pill.name': 'Nombre',
	'viewmode.pill.date': 'Fecha',
	'viewmode.pill.type': 'Tipo',
	'viewmode.pill.path': 'Ruta',
	'stats.folders': 'Carpetas',
	'stats.files': 'Archivos',
	'stats.props': 'Propiedades',
	'stats.values': 'Valores',
	'stats.tags': 'Etiquetas',
	'stats.addons': 'Add-ons',
	'stats.total_links': 'Links totales',
	'stats.word_count': 'Conteo de palabras',
	'stats.reconciling': 'Reconciliando',
	'viewmode.add_mode': 'Modo AGREGAR',
	'content.queue_no_matches': 'No hay coincidencias de contenido para encolar',
};
