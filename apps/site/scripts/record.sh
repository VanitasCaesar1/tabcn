#!/bin/zsh
# Records designs from the example app in Expo Go on one iOS simulator, for the site's videos,
# the README GIFs, the gallery loops and the link previews (docs/designs/site-redesign.md).
#
#   AGENT_DEVICE=<agent-device command bound to your simulator> \
#     apps/site/scripts/record.sh <out dir> <id> [<id> ...]
#
# The simulator must already be booted and prepared, with Expo Go installed and the example app's
# Metro server running (`cd apps/example && bunx expo start --clear`). This script never boots or
# picks a simulator: it only drives the one AGENT_DEVICE is bound to.
#
# A design opens on the tab in record-routes.json (default: its first tab). A design with steps in
# apps/example/src/demo-actions.ts plays them (open a panel, use it, close it); any other design
# taps two other tabs and comes back. Then run, for the same ids:
#   python3 apps/site/scripts/encode.py <out dir> <id>...      videos, posters, README GIFs, stills
#   python3 apps/site/scripts/bar-loops.py <out dir> --only <id>...   (add --panels for panels)
#   python3 apps/site/scripts/og-images.py <out dir>           then: git checkout apps/site/public/og.jpg
set -u
A=${AGENT_DEVICE:?set AGENT_DEVICE to the agent-device command for your simulator}
METRO=${METRO:-exp://127.0.0.1:8081}
OUT=${1:?usage: record.sh <out dir> <id>...}
shift
mkdir -p "$OUT"
HERE=${0:A:h}
ROOT=${HERE:h:h:h}

snap() { $=A snapshot -i 2>/dev/null; }
# The element whose accessibility label starts with $1 (a grep pattern).
ref() { snap | grep -o "@e[0-9]*\(~s[0-9]*\)\? \[[a-z-]*\] \"$1" | head -1 | cut -d' ' -f1; }
tap() { local r=$(ref "$1"); [ -n "$r" ] && $=A press $r >/dev/null 2>&1 || echo "  missing: $1"; }
long_press() { local r=$(ref "$1"); [ -n "$r" ] && $=A longpress $r 600 >/dev/null 2>&1 || echo "  missing: $1"; }
tab() { tap "[^\"]*, tab, $1 of"; }

for id in "$@"; do
  route=$(python3 -c "import json,sys;print(json.load(open('$HERE/record-routes.json')).get('$id','designs/$id'))")
  steps=$(cd "$ROOT" && bun -e "import { DEMO_ACTIONS } from './apps/example/src/demo-actions.ts'; console.log(JSON.stringify(DEMO_ACTIONS['$id'] ?? null))")

  $=A open host.exp.Exponent --relaunch >/dev/null 2>&1
  sleep 2
  $=A open host.exp.Exponent "$METRO/--/$route?record=1" >/dev/null 2>&1
  for i in $(seq 1 40); do snap | grep -q ", tab, 1 of" && break; sleep 2; done
  sleep 2.5

  $=A record start --scope device "$OUT/$id.mp4" >/dev/null 2>&1
  sleep 1.2
  if [ "$steps" != "null" ]; then
    # One step per line: tap <label> | longPress <label> | tab <index from 0> | wait <ms> | tapAt <x> <y>.
    # The steps carry their own waits, so taps don't sleep after themselves.
    python3 -c "
import json,sys
for s in json.loads(sys.argv[1]):
    k=next(iter(s)); v=s[k]; print(k, ' '.join(map(str, v)) if isinstance(v, list) else v)" "$steps" | while read -r kind arg; do
      case $kind in
        tap) tap "$arg" ;;
        longPress) long_press "$arg" ;;
        tab) tab $(( arg + 1 )) ;;
        wait) sleep $(( arg / 1000.0 )) ;;
        tapAt) $=A press $=arg >/dev/null 2>&1 ;;
      esac
    done
  else
    s=$(snap)
    n=$(echo "$s" | grep -o ', tab, 1 of [0-9]*' | head -1 | awk '{print $NF}')
    k=$(echo "$s" | grep '\[selected\]' | grep -o 'tab, [0-9]* of' | head -1 | awk '{print $2}')
    [ -z "$k" ] && k=1
    for step in 1 2; do
      t=$(( (k - 1 + step) % n + 1 ))
      [ $t -ne $k ] && { tab $t; sleep 1.4; }
    done
    tab $k
    sleep 1.4
  fi
  sleep 0.6
  $=A record stop >/dev/null 2>&1
  echo "$id $(ls -la "$OUT/$id.mp4" 2>/dev/null | awk '{print $5}') bytes"
done
