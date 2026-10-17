#!/usr/bin/env bash
# Servidor local (simula Alias Apache /esquinablock, /esquinacut y /esquinaqr).
# Escucha en IPv4 e IPv6 para que localhost funcione en Windows + Docker/WSL.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p .dev-root
ln -sfn ../public .dev-root/esquinablock
ln -sfn ../public .dev-root/esquinacut
ln -sfn ../public .dev-root/esquinaqr

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
echo "  http://localhost:${PORT}/          (índice)"
if [[ -n "${IP}" ]]; then
  echo "  (si localhost falla con Docker: http://${IP}:${PORT}/esquinablock/)"
fi
echo ""
echo "Usa 127.0.0.1 si el navegador no resuelve localhost (IPv6/Docker)."
echo ""

exec php -S "${HOST}:${PORT}" -t .dev-root dev-router.php
