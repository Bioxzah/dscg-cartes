#!/bin/bash
# DSCG pipeline: turns a law course dropped in Google Drive into a fiche (PDF, next to the course)
# and a deck of cards published in the app. Run by the folder watcher (see README.md); safe to run
# by hand: it only processes chapters that have a course but no fiche yet, one run at a time.
#
#   pipeline/bin/process.sh            process what is pending
#   DSCG_SETTLE=0 pipeline/bin/process.sh   same, without waiting for Drive to settle

set -uo pipefail

PIPE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(dirname "$PIPE")"
STATE="$HOME/Library/Application Support/dscg-pipeline"
mkdir -p "$STATE/logs" "$STATE/work" "$STATE/done" "$STATE/failed"
exec >>"$STATE/logs/$(date +%Y-%m).log" 2>&1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
renice -n 15 -p $$ >/dev/null 2>&1 || true

log() { echo "[$(date '+%F %T')] $*"; }
notify() { osascript -e "display notification \"${2//\"/\'}\" with title \"DSCG Cartes\" subtitle \"${1//\"/\'}\"" >/dev/null 2>&1 || true; }

# One run at a time. A stale lock (older than 4 h) is from a crashed run.
LOCK="$STATE/lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +240 2>/dev/null)" ]; then rmdir "$LOCK" && mkdir "$LOCK"; else exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# Let Google Drive finish downloading what was just dropped.
sleep "${DSCG_SETTLE:-60}"

DRIVE="$(ls -d "$HOME"/Library/CloudStorage/GoogleDrive-*/"Mon Drive"/DSCG "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"/DSCG 2>/dev/null | head -1)"
if [ -z "$DRIVE" ]; then log "Dossier DSCG introuvable dans Google Drive"; exit 0; fi

# Newest Claude Code binary: standalone install first, else the one shipped with the VS Code extension.
find_claude() {
  if [ -x "$HOME/.local/bin/claude" ]; then echo "$HOME/.local/bin/claude"; return; fi
  ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | sort -V | tail -1
}
CLAUDE="$(find_claude)"
if [ -z "$CLAUDE" ]; then log "Claude Code introuvable"; notify "Fiche non générée" "Claude Code est introuvable sur le Mac."; exit 1; fi

# UE folders handled automatically: "<Drive folder>|<UE code>".
UES=("UE 1 - droit|UE1")

chapter_number() { echo "$1" | sed -nE 's/.*[Cc]hap(itre)?[ ._-]*0*([0-9]+).*/\2/p' | head -1; }
is_fiche() { case "$(basename "$1")" in "Fiche - Chapitre"*) return 0 ;; *) return 1 ;; esac; }
signature() { ls -l "$@" 2>/dev/null | awk '{print $5, $9}' | shasum | cut -c1-12; }

# Runs a command with a time limit (no `timeout` on macOS).
with_timeout() { perl -e 'alarm shift; exec @ARGV' "$@"; }

process_chapter() {
  local ue_dir="$1" ue="$2" folder="$3" num="$4"; shift 4
  local pdfs=("$@")
  local key; key="$(echo "$ue-$(basename "$folder")" | tr ' /' '__')"
  local sig; sig="$(signature "${pdfs[@]}")"
  if [ -f "$STATE/failed/$key" ] && [ "$(cat "$STATE/failed/$key")" = "$sig" ]; then return; fi

  local work; work="$STATE/work/$(date +%Y%m%d-%H%M%S)-$key"
  mkdir -p "$work/entrees" "$work/modele"
  cp "$PIPE/CONVENTIONS.md" "$work/"
  cp "$PIPE/modele/"* "$work/modele/"
  log "Traitement de $(basename "$folder") ($ue) dans $work"

  # Text of every PDF of the chapter: the course and the teacher's documents.
  local main="" chars=0 list=""
  for pdf in "${pdfs[@]}"; do
    local name; name="$(basename "$pdf" .pdf)"
    "$PIPE/.build/pdftext" "$pdf" > "$work/entrees/$name.txt" || { log "Lecture impossible : $pdf"; continue; }
    chars=$((chars + $(wc -c < "$work/entrees/$name.txt")))
    list="$list, entrees/$name.txt"
    case "$name" in *[Cc]ours*) main="entrees/$name.txt" ;; esac
  done
  if [ "$chars" -lt 3000 ]; then
    log "Trop peu de texte ($chars caractères) : PDF scanné ?"
    echo "$sig" > "$STATE/failed/$key"
    notify "Fiche non générée" "$(basename "$folder") : le PDF ne contient pas de texte lisible (scan ?)."
    return
  fi
  [ -z "$main" ] && main="${list#, }" && main="${main%%,*}"

  local deck="" known
  [ -n "$num" ] && deck="$(printf '%s-ch%02d' "$(echo "$ue" | tr 'A-Z' 'a-z')" "$num")"
  known="$(cd "$REPO/cards" && ls *.json | sed 's/\.json$//' | tr '\n' ' ')"
  local check="node $PIPE/tools/check-cards.mjs"
  local prompt
  prompt="$(P_UE="$ue" P_NUM="${num:-à déduire du cours}" P_DECK="${deck:-<ue>-chNN, NN = numéro du chapitre sur deux chiffres>}" \
    P_FILES="${list#, }" P_MAIN="$main" P_KNOWN="$known" P_CHECK="$check" \
    node -e 'let t = require("fs").readFileSync(process.argv[1], "utf8");
      for (const k of ["UE", "NUM", "DECK", "FILES", "MAIN", "KNOWN", "CHECK"]) t = t.split("{" + k + "}").join(process.env["P_" + k]);
      process.stdout.write(t);' "$PIPE/PROMPT.md")"

  local tools="Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash($check:*)"
  log "Claude : $CLAUDE"
  (cd "$work" && with_timeout 10800 nice -n 15 "$CLAUDE" -p "$prompt" --permission-mode acceptEdits --allowedTools "$tools" --output-format text > claude.log 2>&1)
  log "Claude a terminé (code $?)"

  if [ ! -s "$work/fiche.html" ] || [ ! -s "$work/cartes.json" ] || [ ! -s "$work/meta.json" ]; then
    log "Livrables manquants"; echo "$sig" > "$STATE/failed/$key"
    notify "Fiche non générée" "$(basename "$folder") : livrables incomplets. Journal : $work"
    return
  fi
  local mnum titre slug
  mnum="$(node -e 'console.log(require(process.argv[1]).chapitre)' "$work/meta.json")"
  titre="$(node -e 'console.log(require(process.argv[1]).titre)' "$work/meta.json" | tr -d '/:')"
  slug="$(node -e 'console.log(require(process.argv[1]).slug)' "$work/meta.json" | tr -cd 'a-z0-9-')"
  [ -z "$num" ] && num="$mnum"
  deck="$(printf '%s-ch%02d' "$(echo "$ue" | tr 'A-Z' 'a-z')" "$num")"

  # Cards must pass the app's rules; one correction round if they do not.
  if ! (cd "$work" && $check cartes.json "$deck" > check.log 2>&1); then
    log "Cartes invalides, correction demandée"
    (cd "$work" && with_timeout 3600 nice -n 15 "$CLAUDE" -p "Le contrôle des cartes a échoué :
$(cat "$work/check.log")
Corrige cartes.json (et meta.json si besoin) jusqu'à ce que « $check cartes.json $deck » ne signale plus d'erreur. Ne touche pas aux autres fichiers." \
      --continue --permission-mode acceptEdits --allowedTools "$tools" --output-format text >> claude.log 2>&1)
    if ! (cd "$work" && $check cartes.json "$deck" > check.log 2>&1); then
      log "Cartes toujours invalides : $(head -5 "$work/check.log")"; echo "$sig" > "$STATE/failed/$key"
      notify "Cartes refusées" "Chapitre $num : les cartes ne passent pas le contrôle. Journal : $work"
      return
    fi
  fi
  grep -q "Ce qui change par rapport au cours" "$work/fiche.html" || log "Attention : synthèse de fin de fiche absente"

  # Fiche PDF, next to the course. A course dropped loose in the UE folder gets its chapter folder.
  local dest="$folder"
  if [ "$folder" = "$ue_dir" ]; then
    dest="$(ls -d "$ue_dir"/*/ 2>/dev/null | while read -r d; do [ "$(chapter_number "$(basename "$d")")" = "$num" ] && echo "${d%/}"; done | head -1)"
    [ -z "$dest" ] && dest="$ue_dir/Chap $num - $titre" && mkdir -p "$dest"
    for pdf in "${pdfs[@]}"; do mv "$pdf" "$dest/"; done
  fi
  local pdfname="Fiche - Chapitre $num - $titre.pdf"
  if ! (cd "$PIPE" && node tools/fiche-pdf.cjs "$work/fiche.html" "$work/$pdfname" >> "$work/claude.log" 2>&1); then
    log "PDF impossible"; echo "$sig" > "$STATE/failed/$key"
    notify "Fiche non générée" "Chapitre $num : le PDF n'a pas pu être créé. Journal : $work"
    return
  fi
  cp "$work/$pdfname" "$dest/$pdfname"
  log "Fiche rangée : $dest/$pdfname"

  # Cards into the app: commit only this file, then publish.
  local cardfile="cards/$deck-$slug.json"
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2], JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],"utf8")), null, 1)+"\n")' "$work/cartes.json" "$REPO/$cardfile"
  local count; count="$(node -e 'console.log(require(process.argv[1]).cards.length)' "$REPO/$cardfile")"
  if (cd "$REPO" && npm run -s validate:cards && git add "$cardfile" && git commit -q -m "Add $deck cards: $titre

Generated by the course pipeline from the chapter $num course." -- "$cardfile" && git pull -q --rebase --autostash && git push -q); then
    log "Cartes publiées : $cardfile ($count)"
    notify "Chapitre $num prêt" "Fiche rangée dans le Drive, $count cartes ajoutées à l'app."
  else
    log "Publication des cartes impossible"
    notify "Cartes non publiées" "Chapitre $num : la fiche est dans le Drive, mais les cartes n'ont pas pu être publiées. Journal : $work"
  fi
  touch "$STATE/done/$key"
  rm -f "$STATE/failed/$key"
}

for entry in "${UES[@]}"; do
  ue_dir="$DRIVE/${entry%%|*}"; ue="${entry##*|}"
  [ -d "$ue_dir" ] || continue

  # Chapter folders with PDFs and no fiche yet.
  while IFS= read -r -d '' folder; do
    pdfs=(); has_fiche=0
    for f in "$folder"/*.pdf; do
      [ -e "$f" ] || continue
      if is_fiche "$f"; then has_fiche=1; else pdfs+=("$f"); fi
    done
    [ "$has_fiche" = 1 ] || [ ${#pdfs[@]} -eq 0 ] && continue
    num="$(chapter_number "$(basename "$folder")")"
    [ -z "$num" ] && num="$(chapter_number "$(basename "${pdfs[0]}")")"
    if [ -n "$num" ] && ls "$REPO/cards/$(echo "$ue" | tr 'A-Z' 'a-z')-ch$(printf '%02d' "$num")"-*.json >/dev/null 2>&1; then
      log "$(basename "$folder") : pas de fiche, mais les cartes du chapitre $num existent déjà dans l'app. Rien à faire automatiquement."
      continue
    fi
    process_chapter "$ue_dir" "$ue" "$folder" "$num" "${pdfs[@]}"
  done < <(find "$ue_dir" -mindepth 1 -maxdepth 1 -type d -print0)

  # A course dropped loose in the UE folder.
  for f in "$ue_dir"/*.pdf; do
    [ -e "$f" ] || continue
    process_chapter "$ue_dir" "$ue" "$ue_dir" "$(chapter_number "$(basename "$f")")" "$f"
  done
done

# Keep a month of working folders.
find "$STATE/work" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
exit 0
