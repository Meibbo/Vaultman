---
title: Shard ALPHA - Estilos & Camaleón Bridge
type: implementation-shard
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-10
---

# Shard ALPHA: Estilos & Camaleón Bridge

## 1. Objetivo Técnico
Sustituir el plan de Tailwind por **UnoCSS + DaisyUI**. Establecer el sistema de **Shortcuts** para mimetizar clases nativas de Obsidian sin ensuciar el DOM.

## 2. Acciones de Implementación

### 2.1. Configuración de UnoCSS
Instalar `@unocss/vite` con los siguientes presets:
- `presetWind3()`: Para utilidades compatibles con Tailwind 3 sin usar el
  alias deprecado `presetUno()`.
- `presetIcons()`: Para usar `i-lucide-*` como clases.
- `presetDaisy()`: Para componentes semánticos.
- `presetAttributify()`: Para mantener el HTML limpio.

### 2.2. Shortcuts de Mimetismo (The Chameleon Key)
Definir en `uno.config.ts` los mapeos para el modo **Thin**:
```typescript
shortcuts: {
  'obsidian-mimic-file': 'nav-file tw-flex tw-items-center tw-px-2',
  'obsidian-mimic-btn': 'clickable-icon tw-p-1 tw-rounded-md',
}
```

### 2.3. Ingesta de Tokens SCSS
Sincronizar las variables de `src/styles/_tokens.scss` con el tema de UnoCSS para que `tw-text-accent` use `var(--text-accent)` nativo.

## 3. El Componente Polimórfico (Contrato)
Las nuevas primitivas deben seguir este patrón de Svelte 5:

```svelte
<script lang="ts">
  import { themeService } from '$services/serviceTheme.svelte';
  let { children, ...props } = $props();
</script>

<div class="{themeService.isMinimal ? 'obsidian-mimic-file' : 'tw-card tw-bg-base-200'}">
  {@render children()}
</div>
```

## 4. Definición de Hecho (DoD)
- UnoCSS funcionando en el build de Vite+.
- Iconos Lucide renderizando mediante clases CSS (Zero SVG overhead).
- El plugin conserva el 100% de la compatibilidad con los snippets de la comunidad.
