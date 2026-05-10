---
title: Spec - Elastic UI Architecture (Thin vs Thick Modes)
type: architecture-spec
status: draft
created: 2026-05-10
tags:
  - architecture/ui
  - design-philosophy
  - layout-presets
---

# Specification: Elastic UI & Mode-Aware Architecture

## 1. Filosofía: El Espectro de Vaultman
Vaultman no tiene una apariencia fija. Se define como un **espectro de capacidades y densidad visual** controlado por el usuario.

- **Modo THIN (Core Replacement):**
  - **Objetivo:** Ser indistinguible del File Explorer nativo de Obsidian.
  - **Compatibilidad:** 100% retrocompatible con CSS Snippets de la comunidad y temas (usando clases nativas `.nav-file`, `.nav-folder`).
  - **Uso de shadcn:** Mínimo. Solo lógica headless (Bits UI) para accesibilidad, sin estilos visuales intrusivos.
  
- **Modo THICK (The Powerhouse):**
  - **Objetivo:** Gestión de metadatos masiva, tablas de bases de datos y exploradores avanzados.
  - **Estética:** Industrial, consistente, basada en Tailwind v4 y componentes shadcn-svelte.
  - **Uso de shadcn:** Máximo. Aprovechamiento total de `Data Tables`, `Command Palettes` y `Dialogs`.

## 2. El Orquestador: `serviceLayout`
Un servicio reactivo basado en Runes que gestiona el estado de la elasticidad.

```typescript
// serviceLayout.svelte.ts (Conceptual)
export class LayoutService {
    // 0 = Ultra Thin, 1 = Balanced, 2 = Ultra Thick
    density = $state(1); 
    
    // Preset activo: 'native-mimic', 'db-manager', 'minimal-list'
    activePreset = $state('native-mimic'); 

    // Determina si se deben aplicar utilidades de Tailwind
    get useTailwind(): boolean {
        return this.density > 0;
    }
}
```

## 3. Estrategia de Componentes: Polimorfismo
Todo componente portado de shadcn debe soportar el contrato de **Nativismo**.

### Reglas de Construcción:
1. **Clases Duales:** Todo elemento raíz debe emitir una clase Obsidian nativa (para snippets) Y una clase Tailwind condicional (para funcionalidad).
   - Ejemplo: `class="nav-file-title {layoutService.useTailwind ? 'tw-text-sm tw-font-bold' : ''}"`.
2. **DOM Adaptativo:** Si un componente de shadcn inyecta demasiados wrappers que rompen los temas de la comunidad, el componente debe tener una rama `{#if layoutService.mode === 'thin'}` que renderice una estructura DOM plana e idéntica a la de Obsidian.

## 4. `logicUnload` y Performance
Para evitar que un plugin "engordado" penalice al usuario que solo quiere el "enflacado":
- Las funcionalidades pesadas (ej. motor de filtrado avanzado de contenidos, graficadores) se cargarán mediante **lazy-loading**.
- El `logicUnload` se encargará de limpiar listeners de eventos y liberar memoria de los índices que no se usen en el modo `thin`.

## 5. Riesgos y Mitigación
- **Riesgo:** El Preflight de Tailwind resetea estilos nativos de Obsidian.
- **Mitigación:** **PREFLIGHT: NONE** es obligatorio. No podemos permitir que Tailwind decida cómo se ve un `h1` o un `button` de forma global. Vaultman debe ser un ciudadano respetuoso del ecosistema CSS de Obsidian.
