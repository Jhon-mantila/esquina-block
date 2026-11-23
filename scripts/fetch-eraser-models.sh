#!/usr/bin/env bash
# Descarga el modelo ONNX de Esquina Eraser a public/models/esquinaeraser/
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/models/esquinaeraser"
mkdir -p "$DIR"

FILE="$DIR/lama_webgpu.onnx"
URL="https://huggingface.co/toolsmonk/lama-webgpu/resolve/main/lama_webgpu.onnx"
SHA="75ddeeb344ca4603b261b09fce0e9323e17872042907f5ee205c9875464c8e3b"

if [[ -f "$FILE" && -s "$FILE" ]]; then
  echo "OK (ya existe): $(basename "$FILE")"
else
  echo "Descargando $(basename "$FILE")…"
  curl -L --fail --retry 3 -o "$FILE.partial" "$URL"
  mv "$FILE.partial" "$FILE"
fi

if command -v sha256sum >/dev/null 2>&1; then
  echo "$SHA  $FILE" | sha256sum -c -
fi

ls -lh "$FILE"
echo "Listo. Modelo en $DIR"
