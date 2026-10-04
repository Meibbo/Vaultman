#!/data/data/com.termux/files/usr/bin/bash
# lane-run.sh <nombre> <workdir> <fichero-prompt>
#
# Envoltorio de oc-task.sh que lo ejecuta desde una INSTANTANEA.
#
# Por que existe (2026-09-06): bash lee un script por OFFSET mientras lo
# ejecuta. Si el fichero cambia a mitad, sigue leyendo desde el mismo byte
# sobre contenido distinto y revienta con errores que no tienen nada que ver
# con la tarea -- p.ej. `unexpected EOF while looking for matching '`.
# Paso: el coordinador parcheo oc-task.sh mientras un carril lo corria, y el
# carril murio con un error de sintaxis inventado.
#
# La regla "no edites el lanzador con carriles vivos" es una instruccion, y una
# instruccion no es un mecanismo. Esto si lo es: cada carril corre su propia
# copia inmutable, asi que el original se puede editar cuando se quiera.
set -u
NAME=${1:?nombre}; WORKDIR=${2:?workdir}; PROMPT=${3:?prompt}
SRC="$HOME/wt/oc-task.sh"
SNAP="${TMPDIR:-/tmp}/lane-$NAME-$$.sh"

# Los snapshots son evidencia de la versión exacta que ejecuta cada carril.
# No se siegan aquí: puede haber snapshots activos de otros procesos.

cp "$SRC" "$SNAP" || exit 1
chmod +x "$SNAP"
# La instantanea se borra al terminar pase lo que pase; el codigo de salida
# que se propaga es el del carril, no el del rm.
trap 'rm -f "$SNAP"' EXIT INT TERM

exec "$SNAP" "$NAME" "$WORKDIR" "$PROMPT"
