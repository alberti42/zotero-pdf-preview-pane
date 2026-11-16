#!/bin/sh
# Builds build/zotero-pdf-preview-pane-<version>.xpi from the files listed
# below. The version comes from manifest.json.
#
# The build is reproducible: the same commit gives the same bytes on any
# system, so the SHA-256 in updates.json can be computed before the release
# workflow builds the .xpi. Each file is stored uncompressed, in the order
# listed, with the date 1980-01-01 00:00 and mode 644.
set -eu
cd "$(dirname "$0")"
python3 -I - manifest.json bootstrap.js prefs.js pdf-preview-pane.js <<'EOF'
import json
import sys
import zipfile
from pathlib import Path

files = sys.argv[1:]
version = json.loads(Path('manifest.json').read_text())['version']
xpi = Path('build') / f'zotero-pdf-preview-pane-{version}.xpi'
xpi.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(xpi, 'w') as z:
    for name in files:
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_STORED
        info.create_system = 3  # Unix, so that external_attr holds the mode
        info.external_attr = 0o100644 << 16
        z.writestr(info, Path(name).read_bytes())
print(xpi)
EOF
