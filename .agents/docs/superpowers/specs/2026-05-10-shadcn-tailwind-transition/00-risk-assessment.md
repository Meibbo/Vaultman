---
title: Spec - Risk Assessment & Technical Loss (shadcn-svelte Migration)
type: technical-risk-spec
status: draft
created: 2026-05-10
tags:
  - architecture/risks
  - technical-debt
  - obsidian/compatibility
---

# Technical Risk & Loss Specification: Vaultman UI Migration

Este documento detalla exhaustivamente qué perdemos al abandonar el sistema manual de Vaultman, los riesgos técnicos ordenados por severidad y los resultados directos (positivos y negativos) post-migración.

## 1. Inventario de "Lo que se va a Perder" (Losses)

### 1.1. Control Químico del DOM
Actualmente, Vaultman tiene una relación 1:1 entre el código Svelte y el DOM resultante.
- **Pérdida:** shadcn-svelte (vía Bits UI) inyecta múltiples capas de `divs` envoltorios, `portals` y elementos ocultos para accesibilidad.
- **Consecuencia:** Debuguear el layout en el inspector de Obsidian será más ruidoso. El selector CSS directo que usas hoy para un componente podría dejar de funcionar si Bits UI cambia la jerarquía interna del componente.

### 1.2. Pureza de la Integración Nativa (setIcon)
- **Pérdida:** El patrón actual `use:attachIcon={icon}` que invoca la API de Obsidian directamente sobre el elemento.
- **Consecuencia:** shadcn-svelte prefiere componentes Lucide Svelte. Para mantener la integración con la API de Obsidian (que soporta iconos personalizados del usuario), tendremos que crear "Icon Bridges", añadiendo una capa de abstracción inexistente hoy.

### 1.3. Jerarquía y Legibilidad SCSS (ITCSS Erosion)
- **Pérdida:** La capacidad de leer un archivo SCSS y entender el diseño completo del plugin mediante herencia y mixins.
- **Consecuencia:** El diseño se "atomiza". Parte del estilo vivirá en archivos SCSS (@apply) y otra parte estará "hardcoded" en las clases de los componentes Svelte. Esta fragmentación dificulta la creación de temas globales rápidos.

---

## 2. Riesgos Críticos (Ordenados por Severidad)

### Riesgo 1: Colisión de Portales en Multiventana (Severidad: CRÍTICA)
**Contexto:** Obsidian permite "Pop-out windows".
- **Peligro:** Bits UI usa portales que, por defecto, apuntan al `document.body`. En Obsidian, cada ventana tiene su propio `body`.
- **Impacto:** Un modal abierto en una ventana flotante podría renderizarse "invisible" en la ventana principal o causar un crash del proceso de renderizado.
- **Mitigación:** Configuración obligatoria de `target` en cada Portal apuntando al root del plugin.

### Riesgo 2: Inconsistencia de Accesibilidad con el Host (Severidad: ALTA)
- **Peligro:** Los componentes de shadcn traen su propio manejo de foco y ARIA que puede ser más estricto que el de Obsidian.
- **Impacto:** El usuario podría sentir que el "tabbing" (navegación por teclado) se comporta diferente dentro de Vaultman que en el resto de la aplicación, creando una "isla de UI" alienígena.

### Riesgo 3: Inflado del Bundle (Severidad: MEDIA)
- **Peligro:** Tailwind v4 genera una hoja de estilos considerable si no se purga agresivamente.
- **Impacto:** Tiempo de carga inicial del plugin (startup time) penalizado. Obsidian mide esto y avisa al usuario si un plugin tarda demasiado en cargar (`onload`).

---

## 3. Resultados Directos Post-Migración

### Resultados Negativos (The Cost)
1.  **Refactor masivo de Tests de Componentes:** Todos los tests actuales que buscan selectores como `.vm-btn-squircle` fallarán. Habrá que reescribirlos usando roles ARIA (ej. `getByRole('button')`).
2.  **Aumento de la curva de contribución:** Un nuevo desarrollador deberá saber Svelte 5, Tailwind v4, Bits UI y además cómo Vaultman los "scopea" para Obsidian.

### Resultados Positivos (The Gain)
1.  **A11y por defecto:** Vaultman pasará a ser uno de los plugins más accesibles del ecosistema sin esfuerzo manual.
2.  **Estética "Industrial":** Las sombras, transiciones y espaciados serán consistentes. Se elimina el efecto "hecho a mano" por uno de "producto comercial".
3.  **Velocidad de Feature-Delivery:** Crear una nueva vista de "Estadísticas" o "Settings" tomará horas en lugar de días, al tener una librería de componentes ya probada.

---

## 4. Matriz de Decisión Final

| Factor | Sistema Actual | Post-Migración | Ganador |
| :--- | :--- | :--- | :--- |
| **Control DOM** | Total (Manual) | Mediado (Bits UI) | Actual |
| **Accesibilidad** | Básica / Parcial | Total (WAI-ARIA) | Migración |
| **Mantenibilidad** | Alta carga SCSS | Alta carga Props | Empate |
| **Startup Perf** | Óptima (Ligero) | Buena (Tailwind) | Actual |
| **UI UX Feel** | Custom / Orgánico | Industrial / Standard | Migración |

**Veredicto del Arquitecto:** La migración es un "mal necesario" para escalar. El sistema actual es óptimo para la versión 1.0, pero insostenible para la versión 2.0. Si decidimos proceder, el foco debe ser el **Riesgo 1 (Portales)** para no romper la experiencia de usuario pro en Obsidian.
