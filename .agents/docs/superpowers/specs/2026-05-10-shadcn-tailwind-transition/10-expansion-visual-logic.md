---
title: Spec 10 - Visual Polish & Gadgets
type: expansion-spec
parent: "[[index]]"
created: 2026-05-10
---

# Spec 10: Visual Polish & Gadgets

## 1. Animaciones de FAB
- **Queue Progress:** Al procesar la cola, el icono del FAB de Ops debe transformarse (morphing) en el `IndicatorOrbitingInk`.
- **Finalización:** Revertir la animación al icono original suavemente.

## 2. Faint Mode (Foco)
- Sincronizado con `serviceTheme`. 
- Si el usuario habilita la opción, todas las clases `.vm-accent` pasan a valores de gris/faint cuando el tab de Vaultman no tiene el foco del ratón/teclado.

## 3. ViewGadgets (Property Editors)
Utilizar componentes de shadcn-svelte/Bits UI para mejorar la edición de valores:
- **Date/DateTime:** Calendario flotante nativo de Bits UI.
- **Numbers:** Sliders y inputs con incremento/decremento.
- **Booleans:** Toggles integrados en la celda de la tabla.

## 4. Add-ons Island (Multi-modal)
- **Opción "Abrir Nota":** Abre el Quick Switcher nativo. Si se selecciona una nota, el contenido de la isla de Add-ons se reemplaza por el Markdown renderizado de esa nota (usando `MarkdownRenderer` de Obsidian).
- **Opción "Stats":** Vuelve a mostrar el dashboard de PageStats.
