#!/usr/bin/env bash
# Descarga los modelos ONNX de Esquina Upscale a public/models/esquinaupscale/
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/models/esquinaupscale"
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

# Ligero (~4,9 MB) — realesr-general-x4v3, BSD-3-Clause
download \
  "https://huggingface.co/CoderViking/realesr-general-x4v3-onnx/resolve/main/realesr-general-x4v3.onnx" \
  "$DIR/realesr-general-x4v3.onnx"

# Alta calidad (~67 MB) — RealESRGAN_x4plus, BSD-3-Clause
download \
  "https://huggingface.co/othytenk/realesrgan-x4plus/resolve/main/realesrgan_x4plus.onnx" \
  "$DIR/realesrgan-x4plus.onnx"

echo "Listo. Modelos en $DIR"
