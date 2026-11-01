#!/usr/bin/env bash
# Servidor local (simula Alias Apache de todas las herramientas Esquina).
# Escucha en IPv4 e IPv6 para que localhost funcione en Windows + Docker/WSL.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p .dev-root
ln -sfn ../public .dev-root/esquinablock
ln -sfn ../public .dev-root/esquinacut
ln -sfn ../public .dev-root/esquinaqr
ln -sfn ../public .dev-root/esquinapdf
ln -sfn ../public .dev-root/esquinaimg
ln -sfn ../public .dev-root/esquina2048

PORT="${PORT:-8000}"
HOST="${HOST:-[::]}"

# Liberar el puerto si ya hay un php -S nuestro
pkill -f "php -S .*${PORT}.*dev-router.php" 2>/dev/null || true
sleep 0.2

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo "Esquina local en el puerto ${PORT}"
echo "  http://127.0.0.1:${PORT}/esquinablock/"
echo "  http://127.0.0.1:${PORT}/esquinacut/"
echo "  http://127.0.0.1:${PORT}/esquinaqr/"
echo "  http://127.0.0.1:${PORT}/esquinapdf/"
echo "  http://127.0.0.1:${PORT}/esquinaimg/"
echo "  http://127.0.0.1:${PORT}/esquina2048/"
echo "  http://localhost:${PORT}/          (índice)"
if [[ -n "${IP}" ]]; then
  echo "  (si localhost falla con Docker: http://${IP}:${PORT}/esquinablock/)"
fi
echo ""
echo "Usa 127.0.0.1 si el navegador no resuelve localhost (IPv6/Docker)."
echo "Si 8000/8001 chocan con Docker u otro Apache, prueba PORT=8010."
echo ""

exec php -S "${HOST}:${PORT}" -t .dev-root dev-router.php
