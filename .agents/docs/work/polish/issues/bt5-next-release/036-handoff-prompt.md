# BT5-036 remainder — agent handoff prompt

Worktree `C:/tmp/vaultman-release-beta2-final2`, rama `codex/bt5-next-10`, HEAD `e0945039` (limpio, sin push). Docs en sandbox. Gate: `pnpm run verify` (léelo, no el exit de un `tail`). Build+smoke: `pnpm run build` (sync a plugin-dev) → `obsidian vault=plugin-dev eval code="..."`. Bridge vivo. Two-commit (code vs `.agents` local).

## Ya hecho (no rehacer)
Content nodes: Rename/Delete configurables vía prompts nativos (`e0945039`, `src/logic/logicContentContextMenu.ts`). Snippet/plugin menús siguen inline (`explorerSnippets.ts` `openMenu` L336, `explorerPlugins.ts` `openMenu` L392).

## Research verificado (app.js real en `C:/Users/vic_A/Desktop/obsidian-web-lab/obsidian/app.js` + live)
- **File delete confirm nativo** = `app.fileManager.promptForDeletion(TFile)` (lee config `promptDelete`, arma `labelConfirmDeletion({filename})`). `promptForFileDeletion`/ `promptForFileRename` (=`new uI(app,file).open()`) lo envuelven. TFile-bound.
- **Plugin uninstall confirm** = clase interna `nb` (ConfirmModal genérico:
  `mod-confirmation` + `modal-button-container`, extiende `Modal`, `.setTitle().setContent() .addButton([cls],text,cb)`, usado 13×). NO exportada por `obsidian`. Disparado en `renderInstalledPlugin` desde botón trash: `new nb(app).setTitle(labelUninstallPlugin()) .setContent(labelUninstallPluginConfirmation()).addButton("mod-warning",labelUninstall(), ()=>plugins.uninstallPlugin(id))`.
- **Snippets NO son TFiles** (probado: 170 snippets, `getAbstractFileByPath('.obsidian/ snippets/x.css')`=null). `app.customCss.getSnippetPath(name)` da la ruta; `app.vault. adapter.remove/rename` operan config-dir. La queue (`serviceOperationQueue.ts`) usa `fileManager.trashFile/renameFile` (exigen TFile) → NO sirve para snippets sin extender.

## Plan (decisiones del dev fijadas)
1. **Plugin uninstall** — reconstruir el `nb` nativo con el `Modal` público de `obsidian` (subclase: `containerEl.addClass('mod-confirmation')`, `modal-button-container` con botón `mod-warning`), mismo texto (reusar i18n nativo vía `i18next.t` si está global, o string fiel "Are you sure you want to uninstall this plugin?"). onConfirm → `app.plugins.uninstallPlugin(id)`. Registrar como ActionDef nodeType `plugin`.
   **See details** → `app.setting.open()` + `openTabById('community-plugins')` + `tab.renderInstalledPlugin(manifest)`. Ambos por el service (configurables). `isVaultman` sigue protegido. Enrutar `explorerPlugins.openMenu` → `openPanelMenu({nodeType:'plugin'})`.
2. **Bypass-mode delete confirm (aprovechar)** — en `serviceOperationQueue.ts`, cuando `operationMode==='bypass'` y el change es `file_delete` de un TFile real, pasar por `fileManager.promptForDeletion(file)` (confirm nativo core) antes de ejecutar. Beneficia TODOS los deletes inmediatos.
3. **Snippets = OPCIÓN B (dev)** — extender la queue con un op-kind nuevo para targets config-dir. Snippet delete → op que hace `adapter.remove(getSnippetPath(name))` + `customCss.loadSnippets()`; snippet rename → `adapter.rename(old,new)` (+ preservar enabled state). En bypass mostrar un confirm nativo (replicar el fragment de `promptForDeletion` con el `Modal` público, ya que no hay TFile). Enrutar `explorerSnippets.openMenu` → `openPanelMenu({nodeType:'snippet'})`; registrar `snippet.change-icon` (existe), `snippet.toggle` (existe), `snippet.rename`, `snippet.delete`. **Delete de .css es destructivo: smoke con un snippet throwaway, nunca uno real del vault del dev.**

## Aceptación / gates
Tests por: registro+routing por kind (snippet/plugin), reconstrucción del confirm de uninstall, op-kind config-dir de snippets (delete/rename), gate bypass-delete. Verify completo verde + smoke plugin-dev de cada menú (sin ejecutar destroy en assets reales).
Actualizar issue 036 + index + status/handoff + shard nuevo. Sin push/tag.

## Contexto imprescindible
- Registry de acciones: `svc.registerAction({id,nodeTypes,surfaces,label,icon,submenu, when,run})`; `openPanelMenu({nodeType,node,surface,file?},event)`; kinds en `logicFilesContextMenu.ts` (`panelMenuKindForNodeType`); catálogo por kind = `panelActionCatalog(kind)`; layouts persistidos `contextMenuLayouts[kind]`.
- Patrón nodo mínimo para ctx: `{id,label,depth:0,meta}` (ver `contentMenuNode`).
- BLOCKER original resuelto: los modales SÍ existen (arriba); no abrir settings como workaround (añade clicks, rechazado por el dev).
