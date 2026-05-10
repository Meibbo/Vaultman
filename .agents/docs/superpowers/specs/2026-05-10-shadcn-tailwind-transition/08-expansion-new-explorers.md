---
title: Spec 08 - New Explorers & Adopted Nodes
type: expansion-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-10
---

# Spec 08: New Explorers & Adopted Nodes

## 1. TabSnippets
- **Source:** `.obsidian/snippets/*.css`.
- **Comportamiento:** Cada archivo CSS es un nodo. 
- **Acción:** Abrir en el editor nativo de Obsidian. Nota vinculada usa `$filename` como alias.

## 2. TabPlugins
- **Source:** `app.plugins.manifests`.
- **Comportamiento:** Listado de plugins instalados.
- **Acción:** Abrir configuración del plugin. Nota vinculada usa `%pluginname` como alias.

## 3. TabOutlines (Nodos Adoptados)
- **Concepto:** Tratar archivos `.md` como carpetas que contienen headers, tareas y bloques.
- **Jerarquía:** 
  - H1 -> H2 -> Tarea.
- **Integración DnD:** Los bloques se pueden arrastrar fuera del outline para ser "embedidos" en otras notas.

## 4. Fix de Carpetas (Explorers)
- **Problema:** Los nodos de carpetas no muestran CMenu ni badges.
- **Solución:** Los `providers` deben habilitar `handleContextMenu` para tipos `folder`. Las carpetas deben soportar la creación de "Nota de Nodo".
- **Filtros:** Las carpetas seleccionadas NO van a la lista de filtros globales (para evitar colisiones de lógica), pero sí activan el filtro "is in folder" mediante el badge correspondiente.
