#!/usr/bin/env bash
# Descarga los modelos ONNX de Esquina BG a public/models/esquinabg/
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/models/esquinabg"
mkdir -p "$DIR"

download() {
  local url="$1" out="$2"
  if [[ -f "$out" && -s "$out" ]]; then
    echo "OK (ya existe): $(basename "$out")"
    return
  fi
  echo "Descargando $(basename "$out")…"
  curl -L --fail --retry 3 -o "$out.partial" "$url"
  mv "$out.partial" "$out"
  ls -lh "$out"
}

# Rápido (~4.4 MB)
download \
  "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx" \
  "$DIR/u2netp.onnx"

# Equilibrado (~43 MB) — silueta (rembg), tamaño del plan "isnet-quantized"
download \
  "https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx" \
  "$DIR/isnet-quantized.onnx"

# Alta Calidad (~44 MB)
download \
  "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx" \
  "$DIR/rmbg-quantized.onnx"

echo "Listo. Modelos en $DIR"
