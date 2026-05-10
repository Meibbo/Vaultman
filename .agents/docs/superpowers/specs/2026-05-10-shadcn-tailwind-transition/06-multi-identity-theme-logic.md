---
title: Spec - Multi-Identity Architecture & Theme Logic
type: architecture-spec
status: draft
created: 2026-05-10
tags:
  - architecture/ui
  - design-philosophy
  - focus-management
  - mimicry
---

# Specification: Multi-Identity & Focus-Aware Architecture

## 1. Visión: El Plugin Multiforme
Vaultman no imita solo el Explorer. Su arquitectura debe permitir encarnar diferentes "Personalidades" de UI según el hito o preset activo.

### Identidades Soportadas:
- **ID_NATIVE:** Mimetismo total del Core File Explorer (para snippets de temas).
- **ID_BASES:** Estructura tabular densa con filtros avanzados.
- **ID_OUTLINE:** Estructura jerárquica con micro-iconos y guías visuales.
- **ID_BOOKMARKS:** Lista compacta con soporte de drag-and-drop visual.

## 2. El Nuevo `serviceTheme.svelte.ts`
Este servicio centralizará la estética y los estados de "Energía Visual".

```typescript
export class ThemeService {
    // ESTADOS GLOBALES
    isFocused = $state(true); // Controlado por window focus
    reducedMotion = $state(false); // Sincronizado con Obsidian settings
    
    // COMPORTAMIENTO DE FOCO (Faint Mode)
    // Al perder el foco, el servicio inyecta .vm-faint en el root.
    // Esto re-mapea variables: --text-accent -> --text-faint.

    // COMPORTAMIENTO DE ANIMACIONES
    // Inyecta --vm-transition-speed: 0ms si el usuario desactiva animaciones.
}
```

## 3. Integración de Componentes (Hybrid Model)
Usaremos un enfoque de **Capas de Abstracción**:

1.  **Capa Lógica (Headless):** Bits UI maneja el teclado y accesibilidad (WAI-ARIA).
2.  **Capa Estructural (Polimórfica):** Snippets de Svelte 5 cambian el HTML según la Identidad activa.
3.  **Capa de Estilo (UnoCSS/Tailwind + SCSS):**
    - Se usan clases semánticas de DaisyUI (`.btn`) para evitar contenedores vacíos.
    - Se aplican utilidades atómicas para ajustes finos.

## 4. El "Faint Effect" Transversal
Se implementará mediante **CSS Variables dinámicas**.

```scss
// En src/main.scss
.vm-root {
  --vm-accent: var(--text-accent);
  
  &.is-unfocused {
    --vm-accent: var(--text-faint);
    --vm-opacity: 0.7;
    filter: grayscale(0.5);
    transition: all 0.3s ease;
  }
}
```
Todos los componentes de Vaultman usarán `var(--vm-accent)` en lugar de `var(--text-accent)` directamente.

## 5. Retrocompatibilidad con Snippets
Para no "romper" los temas de la comunidad:
- Vaultman emitirá clases "espejo": `<div class="vm-node nav-file">`.
- El usuario podrá apuntar a `.nav-file` en sus snippets y Vaultman responderá igual que el core.
