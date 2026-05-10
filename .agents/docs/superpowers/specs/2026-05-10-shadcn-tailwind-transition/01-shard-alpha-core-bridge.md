---
title: Shard ALPHA - Core & SCSS Bridge
type: implementation-shard
parent: "[[index]]"
created: 2026-05-10
---

# Shard ALPHA: Core & SCSS Bridge

## 1. Objetivo Técnico
Establecer los cimientos de Tailwind v4 integrados con el pipeline de SCSS actual. El objetivo es que las variables de SCSS y las clases de Tailwind "hablen" el mismo idioma.

## 2. Acciones de Implementación

### 2.1. Configuración de Tailwind v4 (Sin Preflight)
Para evitar romper Obsidian, el archivo `src/main.scss` debe integrar Tailwind de forma quirúrgica:

```scss
// src/main.scss
@import "tailwindcss" preflight(none);
@import "tailwindcss" prefix(tw);

// Ingesta de Tokens en el Tema
@theme {
  --color-accent: var(--text-accent);
  --color-bg-primary: var(--background-primary);
  --radius-m: 8px;
}
```

### 2.2. El Patrón "Semantic @apply"
Para evitar contenedores vacíos, migraremos las primitivas usando este patrón:

```scss
// src/styles/components/_badges.scss
.vm-badge {
  @apply tw-inline-flex tw-items-center tw-rounded-full tw-px-2 tw-py-1 tw-text-xs tw-font-medium;
  
  // Mantenemos los mixins o lógica SCSS que Tailwind no cubre
  @include vaultman-glass-effect;
}
```

### 2.3. Porting de Primitivas shadcn-svelte
Se deben portar los siguientes componentes de shadcn al directorio `src/components/ui/`, asegurando que usen el prefijo `tw-`:
- **Button:** Reemplazará a `BtnSquircle` (manteniendo la interfaz de props).
- **Input:** Para los buscadores y renombrado inline.
- **Badge:** Para las insignias de estado y etiquetas.
- **Toggle:** Reemplazará al actual `Toggle.svelte`.

## 3. Contratos de Código (Ejemplo Badge)
```svelte
<!-- src/components/ui/badge/badge.svelte -->
<script lang="ts">
  let { class: className, variant, ...props } = $props();
</script>

<!-- Se mantiene la clase semántica base .vm-badge -->
<div class="vm-badge tw-badge {className}" {...props}>
  {@render props.children?.()}
</div>
```

## 4. Definición de Hecho (DoD)
- Tailwind v4 instalado y configurado con prefijo `tw-`.
- Las variables de Obsidian son accesibles vía clases `tw-text-accent`.
- Al menos 3 primitivas migradas sin pérdida de estilos SCSS originales.
