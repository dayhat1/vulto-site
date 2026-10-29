#!/usr/bin/env bash
# Gera public/index.html a partir de src/vulto-landing.html (a fonte que também vira a prévia no Claude).
set -euo pipefail
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  sed -n '1,/^<\/style>/p' src/vulto-landing.html
  printf '</head>\n<body>\n'
  sed -n '/^<\/style>/,$p' src/vulto-landing.html | tail -n +2
  printf '</body>\n</html>\n'
} > public/index.html
echo "public/index.html gerado"
