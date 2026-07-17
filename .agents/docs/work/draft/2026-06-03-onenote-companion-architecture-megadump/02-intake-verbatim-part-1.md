---
title: Megadump intake verbatim — part 1
type: backlog-intake-shard
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/backlog
  - initiative/draft
---

# Megadump Intake — Verbatim Part 1

Lossless capture of the dev's 2026-06-03 product dump (chat). Fenced to keep
wikilinks/tags/`***` inert in the vault graph. Do not edit the fenced text.
Classification lives in [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/01-triage-classification|01-triage-classification]].

```text
explorando la aplicación onenote me doy cuenta de que esta tiene ya muchas de las cosas  y funciones que quería agregar a vaultman como el dibujado sobre texto y editor propio de archivos xlsx (que básicamente sería el engine grid mode table que ya tenemos pero con un add-on de hojas de cálculo). el mayor problema que veo de directamente usar/mantener/import&export de archivos onenote es que son código propietario y que algo tal vez se rompa si llego el proveedor oficial hace alguna actualización que rete la fragilidad de nuestro esquemas patch/adapter

qué podemos hacer para que cada nodo pueda tener su propio tamaño, posición, rotación, etc. un sistema de coordenadas? un sistema de creación de clases css por id de nodo (o node identity, porque si reconstruye el índice de nodos puede sufrir pérdida, pero abría que gestionar la clase si el identity cambia) el branch dev será básicamente lo que es hoy sandbox (incluso, con cambiarle el nombre tendríamos), y partirá de ese punto de sandbox para ponernos creativos.

research de cómo funciona el plugin callout manager. también cómo funciona el plugin style settings. me interesa saber cómo parsea los archivos css y las carpetas de los temas para detectar patrones y métodos de representarlos para potenciar nuestra theme scene con los debidos providers de snippets y themes.

estoy entre que investigue con docs shardeados de unocss, bits ui y daisyui para crear por completo un theme builder poderoso.

podría hasta hacer que el motor de estilos sean plugin distintos pero companion. que vaultman tenga los controles del constructor y builder de temas y así, y que myspace sea una especie de companion plugin que se dedique a volver válidos y visibles en live preview y reading mode estas variables de los 

en vez de estar recreando la rueda hacer que con un convertidor html <-> markdown colocar la capacidad de que los codeblocks html que se coloquen puedan usar estas librerías. la idea es que el user escriba con total normalidad con markdown pero pueda transfomar los archivos a html para disfrutar de los componentes que bits-ui y daisyui ofrecen

qué realmente es lo que define en qué versión mínima es soportado mi plugin? las listas del manifest.json tienen versiones arbitrarias sin fundamento real. Lo mejor que se me ocurres es o fijarse en los lints de eslint y stylelint. Lo otro sería seguir manualmente online el changelog de obsidian para saber qué es compatible y qué no (especialmente por la capa compleja de monkeypatching que vamos a insertar)- is krita open source?
	- document/layout content layers (could use Krita if is open-source or any graphical editor for reference)
- "Redesign mode", layout live edition (reorder, resize, entire workspace as a canvas)
	- canvas (entire leaves) pan/zoom/rotation
		- concepts (app) extraction (research y grill)
- git add-on
	- git file version comparison
	- git line history
- una scenesmanagerscene, que sería una scene con un explorer de todas las scenes disponibles (incluyendo la core nativas de obsidian y sus leafs; tenerlas como provider supone más excavasión tanto del dom de obsidian desde el cli como del app.js y .css del web-lab); tal vez que trabaje en conjunto con el service unload y el layout builder
- tengo entendido que tenemos un action routing system para anexar acciones a inputs con su config general y un mediator para que estas acciones que se invocan desde una action node en una scene altere la configuración de otra scene ¿correcto? entonces tenemos
- un experimento de prueba del poder de nuestra lógica de surfaces sería poder hacer click derecho en alguna parte vacía del sidebar y que tengamos la opción de convertir todos los tabs que tenga en una scene con paginación/o un page (no recuerdo bien la terminología y sus diferenciadores) y que se pueda montar en otra surface como uno de nuestros floating windows y que con una simple acción pueda volverse a colocar todo ese contenido en el sidebar (probablemente involucre monkey patching para convertir la lógica hardcoded del leaf de los sidebars en una surface que nosotros controlemos y volverlo en un page/leaf genérico)(recordar que tanto los page/leaf como los tabs, bars y overlays son surfaces (solo que un page/leaf es una surface que puede tener otras surfaces dentro de sí con paginación o workspace splitting; con opción para conversión de surface kind).
- service unload debe tener la capacidad incluso de descargar partes internas de obsidian (su app.js y app.css) si así el power user lo desea (podría descargar de memoria todo lo que no sea el editor activo y obsidian quedaría tan simple/eficiente en recursos y rápido como el bloc de notas de windows; más o menos como lo hace su función nativa "restricted mode" al quitar la capacidad de correr plugins dentro de obsidian)
- create action (action to index a custom one) based on a file
- auto move node from rules (auto note move plugin takeover)
- [ ] Voy a quitar por completo todo rastro de ia y docs que no sean de "doc/" es no pues en todos los branches porque esa es información sensible y privada. la única documentación que abrá será la información que yo realmente quiera mostrar
***
una capa de devtools que tenga un performance meter, la capacidad de que el devtools de electron no solo se muestre en una ventana externa sino también en cualquier surface dentro de obsidian. una capa de edición para aprovechar el "select an element in the page to inspect it" de devtools para que no solo sirva de edición temporal de la dom, sino también para editar elementos de manera persistente aprovechando la api de vaultman para que el user tenga la capacidad de editar elementos visualmente con el layout design (vm-layout_editor) de vaultman como si de figma se tratase. todo esto en modos para no quitarle el propósito de la aplicación original del devtools o el workspace de toma de notas.

puedo juntar todos los plugins super útiles de devtools para obsidian o crear bridges de ellos hacia vaultman para no robarle el crédito a esos proyectos.

- pasar a que vaultman sea como el framework, lógica y funcionalidades complejas pero todo con el preset nativo y que las características de preset de tema con bits-ui, daisyui y unocss junto a otros presets sean released como companion plugins?
	- esto también lo volvería un plugin "bridge", porque si otro plugin expone los actions suyos al índice para la api de vaultman, otro plugin podría llamar esas funciones en vez de recrearlas ahorrando complejidad a la comunidad de obsidian en general y dejándolas accesibles al user para que lo defina como un action_node o un input_binding.
- podemos cambiar muchísimo más las fundaciones de vaultman de la siguiente manera: 
	- si ajustamos el provider de plugins para que también intercepte los plugins de la store (los que el user no tiene instalados) podemos hacer que vaultman se convierta en un mega plugin que tenga la opción de instalar companion plugins hechos por nosotros mismos que se alimenten de las apis de vaultman. 
	- Así conseguiríamos que vaultman sea un plugin más genérico y fomentar un ecosistema propio en el sentido de que ya no tendría elementos opinionated dentro del "core plugin" que disrumpan de la ui minimal que tiene el resto de obsidian como los presets que no sean barebones o native, que cambian apariencia y posiciones del layout
		- me explico, vaultman seguiría teniendo toda la lógica y las capacidades fundamentales para este plan; pero algo como la existencia de una scene explícita como el layout builder ¿es completamente necesario que forme parte del plugin principal? o perfectamente puede ser un add-on que se instale desde nuestro catalog-scene (nuestra abstracción del marketplace de obsidian, tanto de plugins como de themes) y se active/desactive/desinstale desde el plugins-scene a través del serviceunload) como un plugin externo llamado vm_layoutbuilder que yo me encargue de subir a la community obsidian store y por eso sea accesible desde la catalog-scene sin necesidad de colocarle funciones de llamadas a internet (lo que me hace pensar que todo el asunto de fetching para los cells de media podría ser un companion aparte para volver aún más seguro y confiable el plugin principal por ser 100% local) como "vm-online_fetch"
		- otro ejemplo sería la scene que teníamos planeada de un inputremapper según el input device disponible del usuario como pantalla de remapeo de controles de un videojuego que podría ser el companion "vm_input-remap"; e incluso podríamos hacerlo con toda la scene de queue y el vfs con view diff como "vm_operations"; otra cosa sería colocar los presets como companions, pero si son solamente archivos de configuración prefiero que crear y compartir presets sea exportando archivos json/yaml/html/xml (no se si y está, pero si no está hay que hacer grill de cómo será un archivo  .scene y cómo se vería con los distintos formatos brindados).
	- Esto volvería muchísimo más mantenible y atómico nuestro plugin para darle una identidad más clara y confiable. Aunque como podrás haber visto con los ejemplos que dí hay necesidad de researches y grill por posibles contradicciones. con los planes ya establecidos y dentro del mismo enunciado; porque aún no veo bien si exteriorizaríamos  cosas tan simples que perfectamente podría formar parte de los archivos exportables ".scene" (lo que teníamos como .vmscene) o si también lógica que prepararíamos con adapters y API a los providers/indexes 
		- por ejemplo con el caso que habíamos discutido de las youtube/spotify playlists, creo que podríaos hacer que el archivo .scene tenga la data de a qué providers -o de aqué fuentes online" debe hacer las llamadas para conseguir la información con que cargar los nodos; y el user para cargar dicha información tendría que haber instalado "vm-online_fecth"  (que ahora que lo pienso, también dará la capacidad de que el user use urls para los valores de los cell en general ya que quitamos toda capacidad de llamar a internet del core plugin "vaultman") darle la capacidad a las scenes de conseguir esa información online por llamadas exteriores (thumbnail, text, url, etc.); y el plugin "vm-layout_editor" para modificar visualmente la "youtube_scene" a su gusto con opciones de componentes y primitivos que ofrecen nuestros design libraries (unocss, sass, bits-ui, daisyui) y nosotros expondremos con providers/indexes; completando el círculo dando la opción de guardar los cambios hechos al estilo y el índice caché de esa scene en específico dentro del archivo "youtube.scene".
	- También estoy viendo la posibilidad de que los archivos ".scene" sean más bien de extensión ".preset" y esté construido más como un archivo svelte solo que sin pasar por un precompiler. 
		- Esto requeriría un researh intenso y profundo de cómo funciona obsidian realmente, porque hay que recordar que tanto el live preview como el render view convierte el markdown en html.
		- entonces ¿por qué no hacer algo parecido? o lo contrario, una forma de que el brindemos html y este sea convertido en tiempo real a markdown.
		- con pseudo cells (osea, que los cell los llena el provider/index y no son parte de un archivo físico) tipo badge que indique que un plugin es o no un companion de vaultman.
		- que sería más como un experimento, porque si al final el plugin "core" si gana mucha reputación y recibe aceptación masiva de funciones online se puede absorber esas capacidades (que deberán quedar bien documentadas para que el user sepa exactamente qué accede o no el plugin a través de internet) y dejar el companion con funciones muy específicas (lo que repito, si no es algo que requiera typescript o svelte o ser lógico en sí, puede colocarse simplemente dentro de un archivo .scene; que ahora que lo pienso, podría ser fácilmente un formato combinado como xhtml -html+xml- o -yaml+json- o algo así, pero eso significaría un sistema entero de abstracción de las scenes a través de todo obsidian + vaultman).
vaultman absorbería todos esos plugins "one trick" al facilitar una interfaz común (obsidian ya medio lo hacía) Seems like there's almost not any remaining puzzle piece to create a completely different app.
```
