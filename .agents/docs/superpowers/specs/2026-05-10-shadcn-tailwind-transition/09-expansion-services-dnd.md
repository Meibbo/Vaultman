---
title: Spec 09 - Advanced Services (DnD, Groups, Unload)
type: expansion-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-10
---

# Spec 09: Advanced Services (DnD, Groups, Unload)

## 1. ServiceDnD (Drag and Drop)
- **Stack:** `dnd-kit`.
- **Comportamientos Contextuales:**
  - **Nodo Archivo -> Workspace:** Crea `[[Link]]` o `![[Embed]]` según la tecla modificadora.
  - **Nodo Propiedad -> Nota:** Inyecta la metadata en el frontmatter de la nota destino.
  - **Nodo Bloque (Outline) -> Nota:** Mueve el bloque de texto real entre archivos.

## 2. ServiceGroups (Agrupación Dinámica)
- **Propósito:** Crear niveles de agrupación artificiales (ej. agrupar por la letra 'A', 'B', etc.).
- **Lógica:** Extiende `logicManualOrder`. Permite asignar nombres a grupos y colapsarlos.
- **Mimetismo:** Debe funcionar igual que las agrupaciones del plugin Bases.

## 3. ServiceUnload (Gestión de Memoria)
- **Propósito:** Permitir que el usuario desactive "módulos" de Vaultman.
- **Implementación:**
  - `tabPlugins`, `tabSnippets`, y `serviceDnD` deben ser opcionales.
  - Al desactivar un módulo, el service debe llamar a su `logicUnload` para limpiar el heap de memoria y destruir los índices asociados.

## 4. ServiceHelp & Helper Overlay
- **Tutoriales:** Flujo "Newbie" con guías paso a paso.
- **ToC:** Índice de ayuda integrado en un modal de shadcn.
