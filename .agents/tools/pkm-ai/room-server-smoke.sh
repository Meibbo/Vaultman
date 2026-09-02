#!/usr/bin/env bash
# room-server-smoke.sh — puerta de aceptación de la ROOM ÚNICA HOSPEDADA (ADR 0008).
#
# Decisión del dev (2026-09-01): una sola room, servida por HTTP, para que un agente
# pueda unirse desde cualquier nodo. El anfitrión por defecto es m2.
#
# NO se escribe un servidor nuevo: se extiende `room-ui/server.ts`, que ya existe,
# ya tiene auth y ya expone un subconjunto de acciones.
#
# ESTE FICHERO NO SE TOCA. Se cambian server.ts y agent-room.ts hasta que salga TODO VERDE.

set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
ROOM="node $ROOT/agent-room.ts"
SRV="$ROOT/room-ui/server.ts"
STATE="${TMPDIR:-/tmp}/room-srv-$$"
LOCAL="${TMPDIR:-/tmp}/room-cli-$$"
PORT=$(( 18000 + RANDOM % 2000 ))
URL="http://127.0.0.1:$PORT"
PHRASE="puerta-de-prueba-9f2c"
# La puerta corre el servidor en modo LAN, que es como corre en m2: CON AUTH.
# Correrlo en modo local desactiva isAuthorized() y da falso verde.
export VAULTMAN_ROOM_PASSPHRASE="$PHRASE"
mkdir -p "$STATE" "$LOCAL"
LOG="$STATE/server.log"

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '  FAIL %s\n' "$1"; }

cleanup(){ [ -n "${SRVPID:-}" ] && kill "$SRVPID" 2>/dev/null; rm -rf "$STATE" "$LOCAL"; }
trap cleanup EXIT

echo "== Room única hospedada (ADR 0008) =="

# S1 — el servidor acepta --state-root Y SIRVE ESE ESTADO.
# Ojo: un flag desconocido se ignora en silencio, asi que arrancar no prueba nada.
# Se siembra una run en $STATE y se comprueba que /api/status la devuelve.
$ROOM run start --agent sembrador --title "semilla" --state-root "$STATE" >/dev/null 2>&1
node "$SRV" --lan --host 127.0.0.1 --port "$PORT" --passphrase "$PHRASE" --state-root "$STATE" > "$LOG" 2>&1 &
SRVPID=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do grep -q "room-ui-started" "$LOG" 2>/dev/null && break; sleep 1; done
GET(){ node -e "fetch('$URL'+process.argv[1],{headers:{'x-room-ui-passphrase':process.env.VAULTMAN_ROOM_PASSPHRASE}}).then(r=>r.text()).then(t=>process.stdout.write(t)).catch(()=>process.exit(1))" "$1" 2>/dev/null; }
GET /api/status | grep -q "sembrador" \
  && ok "S1 el servidor sirve el estado de --state-root" || bad "S1 el servidor NO sirve --state-root (lo ignora y usa el repo)"

# S2/S3 — un agente se une POR HTTP y el estado cae en el root del SERVIDOR.
# Hoy la lista blanca ACTIONS no incluye agent/join: la accion se rechaza.
$ROOM agent join --run current --agent remoto-1 --role worker --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
find "$STATE" -name 'status.json' -path '*remoto-1*' 2>/dev/null | grep -q . \
  && ok "S2 agent join por HTTP queda registrado en el servidor" || bad "S2 agent join por HTTP no llegó al servidor"
find "$LOCAL" -name 'status.json' -path '*remoto-1*' 2>/dev/null | grep -q . \
  && bad "S3 el cliente escribió copia local (room duplicada otra vez)" || ok "S3 el cliente no escribió copia local"

# S4 — heartbeat por HTTP: tiene que MOVER el sello en el servidor, no solo salir 0.
H1="$(find "$STATE" -name 'status.json' -path '*remoto-1*' -exec cat {} \; 2>/dev/null | grep -o '"lastHeartbeatAt":"[^"]*"')"
sleep 1
$ROOM agent heartbeat --run current --agent remoto-1 --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
H2="$(find "$STATE" -name 'status.json' -path '*remoto-1*' -exec cat {} \; 2>/dev/null | grep -o '"lastHeartbeatAt":"[^"]*"')"
[ -n "$H2" ] && [ "$H1" != "$H2" ] && ok "S4 heartbeat por HTTP mueve el sello en el servidor" || bad "S4 heartbeat por HTTP no cambió nada en el servidor"

# S5 — brief por HTTP lee del servidor. Con el root local vacio de esa run, si ve al
# agente remoto es porque vino del servidor y no de disco local.
$ROOM brief --run current --agent remoto-1 --room-url "$URL" --state-root "$LOCAL" 2>/dev/null | grep -q "remoto-1" \
  && ok "S5 brief por HTTP ve al agente remoto" || bad "S5 brief por HTTP no ve al agente remoto"

# S6 — dos agentes con roots locales DISTINTOS se ven entre si. Es el punto entero.
$ROOM agent join --run current --agent remoto-2 --role scout --room-url "$URL" --state-root "$LOCAL/otro" >/dev/null 2>&1
$ROOM brief --run current --agent remoto-1 --room-url "$URL" --state-root "$LOCAL" 2>/dev/null | grep -q "remoto-2" \
  && ok "S6 dos agentes de roots distintos se ven en la misma room" || bad "S6 los dos agentes NO se ven entre si"

echo "== Destino por defecto: m2. Local es lo que hay que pedir (decision del dev) =="

# S7 — SIN ningun flag, la accion va al servidor. El destino por defecto sale de
# VAULTMAN_ROOM_URL, y en produccion ese valor lo fija pkmai apuntando a m2.
VAULTMAN_ROOM_URL="$URL" $ROOM agent join --run current --agent pordefecto-1 --role worker --state-root "$LOCAL" >/dev/null 2>&1
find "$STATE" -name 'status.json' -path '*pordefecto-1*' 2>/dev/null | grep -q . \
  && ok "S7 sin flags el join va al servidor" || bad "S7 sin flags el join NO fue al servidor"

# S8 — --local es la via de escape explicita: fuerza disco y NO toca el servidor.
VAULTMAN_ROOM_URL="$URL" $ROOM agent join --run current --agent solo-local --role worker --local --state-root "$LOCAL" >/dev/null 2>&1
find "$LOCAL" -name 'status.json' -path '*solo-local*' 2>/dev/null | grep -q . \
  && ok "S8a --local escribe en disco" || bad "S8a --local no escribió en disco"
find "$STATE" -name 'status.json' -path '*solo-local*' 2>/dev/null | grep -q . \
  && bad "S8b --local se coló en el servidor" || ok "S8b --local no tocó el servidor"

echo "== Una sola ventana: estados de tmux junto a la room (decision del dev) =="

FIX="$STATE/tmux-herdr-state.json"
cat > "$FIX" <<'JSON'
{"generated_at":"2026-09-01T16:54:45-05:00","target":"CONTROL","chip_count":4,
 "running_count":1,"blocked_count":0,"done_count":5,"idle_count":12,
 "windows":[{"id":"@6","index":"4","session":"CONTROL","name":"Claude","kind":"claude","state":"working",
 "panes":[{"id":"%1","index":5,"kind":"claude","state":"working","alive":1}]}]}
JSON
kill "$SRVPID" 2>/dev/null; sleep 1
node "$SRV" --lan --host 127.0.0.1 --port "$PORT" --passphrase "$PHRASE" --state-root "$STATE" --tmux-state "$FIX" > "$LOG" 2>&1 &
SRVPID=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do grep -q "room-ui-started" "$LOG" 2>/dev/null && break; sleep 1; done


# Fixture: la puerta no debe depender de que ESTE nodo tenga el bridge corriendo.
# Se siembra un state.json con la forma real que escribe tmux-herdr-bridge y se le
# pasa al servidor por --tmux-state.
# S9 — el servidor expone /api/tmux con los estados que YA calcula tmux-herdr-bridge
# en ~/.cache/tmux-herdr-state.json. No se inventa un recolector nuevo: se publica el
# que lleva meses funcionando y que hoy solo asoma en el chip del status bar.
GET /api/tmux | grep -qE '"(running_count|windows)"' \
  && ok "S9 el servidor publica /api/tmux con los estados del bridge" || bad "S9 no hay /api/tmux"

# S10 — y trae los cuatro contadores que el dev mira: running, blocked, done, idle.
T="$(GET /api/tmux)"
MISS=""
for k in running_count blocked_count done_count idle_count; do
  printf '%s' "$T" | grep -q "\"$k\"" || MISS="$MISS $k"
done
[ -z "$MISS" ] && ok "S10 /api/tmux trae running/blocked/done/idle" || bad "S10 a /api/tmux le faltan:$MISS"

echo "== Auth: el servidor de m2 corre en modo LAN y exige clave =="

# S11 — el cliente autentica. Sin esto, contra el m2 real todo responde
# "authentication required" aunque la puerta pase en local.
$ROOM agent join --run current --agent con-clave --role observer --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
find "$STATE" -name 'status.json' -path '*con-clave*' 2>/dev/null | grep -q . \
  && ok "S11 el cliente manda x-room-ui-passphrase" || bad "S11 el cliente no autentica (401 contra el servidor real)"

# S12 — y con clave equivocada NO entra. Si esto pasa, la auth es decorativa.
VAULTMAN_ROOM_PASSPHRASE="clave-mala" $ROOM agent join --run current --agent clave-mala --role observer --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
find "$STATE" -name 'status.json' -path '*clave-mala*' 2>/dev/null | grep -q . \
  && bad "S12 entró con clave equivocada: la auth no sirve" || ok "S12 la clave equivocada es rechazada"

echo "== Fallos que salen con rc=0 y lecturas que no llegan (hallados en produccion) =="

# S13 — UNA ACCION RECHAZADA DEBE SALIR CON CODIGO != 0.
# El 2026-09-02 el gerente creyo aparcar dos tareas: las dos peticiones fueron
# rechazadas, imprimieron "Error:" y salieron con rc=0. Nada quedo registrado y
# nadie se entero. Es el peor de los tres: un fallo indistinguible de un exito.
# Tiene que ser un rechazo DEL SERVIDOR y por la MISMA via que en produccion
# (variable de entorno), no por --room-url: los dos caminos no se comportan igual.
OUT="$(VAULTMAN_ROOM_URL="$URL" $ROOM objectives list --run current --state-root "$LOCAL" 2>&1)"; RC=$?
if printf '%s' "$OUT" | grep -qi "Error"; then
  [ "$RC" -ne 0 ] && ok "S13 un rechazo del servidor sale con rc distinto de 0" || bad "S13 el servidor rechazo, imprimio Error y aun asi salio con rc=0"
else
  ok "S13 la accion ya no la rechaza el servidor"
fi

# S14 — los flags BOOLEANOS pasan por HTTP. Hoy validateActionArgs recorre los
# argumentos en pares flag/valor, asi que un --json al final da "requires a value".
$ROOM task add --run current --agent remoto-1 --title "con json" --json --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
[ $? -eq 0 ] && ok "S14 --json funciona contra la room remota" || bad "S14 --json es rechazado por la room remota"

# S15 — las LECTURAS llegan. status/dashboard/handoff no estan en la lista blanca,
# asi que hoy responden "action is outside the MVP boundary" y el agente se queda ciego.
$ROOM status --run current --room-url "$URL" --state-root "$LOCAL" 2>/dev/null | grep -q "remoto-1" \
  && ok "S15 status remoto devuelve el estado de la room" || bad "S15 status remoto no llega (fuera de la lista blanca)"

echo "== Integridad: el guardia del token tiene que aplicarse tambien por HTTP =="

# S16 — un token invalido NO puede cambiar una tarea.
# El 2026-09-02, en produccion, `task status --token malo` respondio "ok" y
# CAMBIO task_001 de todo a done en la room real. No es comodidad: es integridad.
TASKS="$(command find "$STATE" -name tasks.json | head -1)"
$ROOM task add --run current --agent remoto-1 --title "protegida" --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
# El id sale del fichero del SERVIDOR, no de brief: una tarea recien creada esta en
# `todo` y brief solo lista in-progress, asi que sacarlo de ahi daba un id ajeno.
TK="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d[-1]['taskId'] if d else '')" "$TASKS" 2>/dev/null)"
TT="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d[-1].get('title','') if d else '')" "$TASKS" 2>/dev/null)"
if [ -n "$TK" ] && [ "$TT" = "protegida" ]; then
  $ROOM task status --run current --agent remoto-1 --task "$TK" --status done --token token-invalido --room-url "$URL" --state-root "$LOCAL" >/dev/null 2>&1
  ST="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));t=[x for x in d if x['taskId']==sys.argv[2]];print(t[0].get('status','') if t else '')" "$TASKS" "$TK" 2>/dev/null)"
  [ "$ST" = "done" ] && bad "S16 un token invalido cambio la tarea a done (fallo de integridad)" || ok "S16 el token invalido no cambia la tarea (quedo en $ST)"
else
  bad "S16 la tarea de prueba no llego al servidor (id=$TK titulo=$TT)"
fi

echo "== Regresión: sin --room-url todo sigue siendo local =="
$ROOM agent join --run current --agent local-1 --role worker --state-root "$LOCAL" >/dev/null 2>&1
[ $? -eq 0 ] && ok "R1 join local sigue funcionando" || bad "R1 join local roto"
find "$LOCAL" -name 'status.json' -path '*local-1*' 2>/dev/null | grep -q . \
  && ok "R2 el join local escribe en su propio root" || bad "R2 el join local no escribió local"

echo
echo "pasan: $PASS   fallan: $FAIL"
[ "$FAIL" -eq 0 ] && { echo "TODO VERDE"; exit 0; } || { echo "PUERTA ROJA"; exit 1; }
