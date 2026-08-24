#!/bin/bash
# Regenerate js/emblem-data.js from assets/seal.svg (macOS: qlmanage + sips + python3).
# Usage: scripts/generate-emblem.sh [raster_px] [max_points]
set -e
cd "$(dirname "$0")/.."
PX="${1:-760}" MAX="${2:-26000}"
TMP=$(mktemp -d)
qlmanage -t -s 1400 -o "$TMP" assets/seal.svg >/dev/null 2>&1
sips -z "$PX" "$PX" "$TMP/seal.svg.png" --out "$TMP/seal.png" >/dev/null
sips -s format bmp "$TMP/seal.png" --out "$TMP/seal.bmp" >/dev/null
python3 scripts/generate-emblem.py "$TMP/seal.bmp" js/emblem-data.js "$MAX"
rm -rf "$TMP"
