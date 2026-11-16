#!/bin/sh
# Builds build/zotero-pdf-preview-pane-<version>.xpi from the files listed below.
# The version comes from manifest.json.
set -eu
cd "$(dirname "$0")"
version=$(python3 -I -c 'import json; print(json.load(open("manifest.json"))["version"])')
xpi="build/zotero-pdf-preview-pane-$version.xpi"
mkdir -p build
rm -f "$xpi"
zip -X -q "$xpi" manifest.json bootstrap.js prefs.js pdf-viewer.js
echo "$xpi"
