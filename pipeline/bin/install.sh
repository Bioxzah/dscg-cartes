#!/bin/bash
# Installs (or reinstalls) the folder watcher as a background agent of the current user.
# Uninstall: launchctl bootout gui/$(id -u)/com.dscg.pipeline && rm ~/Library/LaunchAgents/com.dscg.pipeline.plist
set -euo pipefail
PIPE="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$HOME/Library/Application Support/dscg-pipeline"
DRIVE="$(ls -d "$HOME"/Library/CloudStorage/GoogleDrive-*/"Mon Drive"/DSCG "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"/DSCG 2>/dev/null | head -1 || true)"
[ -n "$DRIVE" ] || { echo "Dossier DSCG introuvable dans Google Drive"; exit 1; }
mkdir -p "$STATE/logs" "$PIPE/.build" "$HOME/Library/LaunchAgents"

(cd "$PIPE" && npm install --silent)
swiftc -O "$PIPE/tools/pdftext.swift" -o "$PIPE/.build/pdftext"
swiftc -O "$PIPE/bin/watch.swift" -o "$PIPE/.build/dscg-watch"

PLIST="$HOME/Library/LaunchAgents/com.dscg.pipeline.plist"
sed -e "s|@WATCH@|$PIPE/.build/dscg-watch|" -e "s|@SCRIPT@|$PIPE/bin/process.sh|" -e "s|@FOLDER@|$DRIVE|" \
    -e "s|@LOG@|$STATE/logs/watch.log|" "$PIPE/launchd/com.dscg.pipeline.plist" > "$PLIST"
launchctl bootout "gui/$(id -u)/com.dscg.pipeline" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Surveillance active sur : $DRIVE"
