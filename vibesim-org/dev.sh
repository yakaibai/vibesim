#!/usr/bin/env bash
set -euo pipefail

PORT=8080

if ! command -v entr >/dev/null 2>&1; then
  echo "entr is required for auto-reload. Install it (e.g., apt install entr) and retry." >&2
  exit 1
fi

FILES=$(ls *.html *.css *.js 2>/dev/null || true)
if [[ -z "$FILES" ]]; then
  echo "No files to watch." >&2
  exit 1
fi

echo "Starting dev server on http://localhost:${PORT}"
printf "%s\n" $FILES | entr -r bash -c "python3 -m http.server ${PORT}"
