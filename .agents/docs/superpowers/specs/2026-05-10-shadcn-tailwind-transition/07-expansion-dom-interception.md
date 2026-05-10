---
title: Spec 07 - DOM Interception & Native Mimicry
type: expansion-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-10
---

# Spec 07: DOM Interception & Native Mimicry

## 1. Objetivo
Permitir que Vaultman "secuestre" comportamientos nativos de Obsidian (como clics en tags o breadcrumbs) e integre sus propias reglas de "A Note for a Node".

## 2. Referencia Técnica: Tag Wrangler (Mimetismo)
- **Lógica de Asociación:** Un nodo se vincula a una nota si la nota tiene el alias correspondiente en su YAML:
  - Tags: `#tagname`
  - Snippets: `$snippetname`
  - Plugins: `%pluginname`
- **Intercepción de Clics (Ctrl+Click):** 
  - Usar un listener global de eventos que detecte la clase `.cm-hashtag` o elementos dentro de `[data-type="file-properties"]`.
  - Si el usuario hace Ctrl+Click, Vaultman busca la nota con ese alias vía `MetadataCache`.

## 3. Clases de Obsidian a Mimetizar (Thin Mode)
Para que los snippets de la comunidad funcionen, Vaultman debe inyectar estas clases en sus componentes cuando el `activePreset === 'minimal'`:

- **Document Properties:** `.metadata-container`, `.metadata-property`, `.metadata-property-key`.
- **File Explorer:** `.nav-folder`, `.nav-file`, `.nav-file-title`.
- **Outline:** `.tree-item`, `.tree-item-self`, `.tree-item-inner`.

## 4. Notes for Nodes (Reglas de Creación)
Al crear una nota desde un nodo:
- **Filename:** Será exactamente el `label` del nodo.
- **Aliases:** Se inyectará el tipo según el contexto (`#`, `%`, `$`).
