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
# Inline do CSS da home no HTML: tira uma viagem de rede do caminho do primeiro paint.
python3 - <<'PY'
import re
p = "public/index.html"
h = open(p, encoding="utf-8").read()
m = re.search(r'<link rel="stylesheet" href="/css/home\.css[^"]*">', h)
if m:
    css = open("public/css/home.css", encoding="utf-8").read()
    h = h.replace(m.group(0), "<style>\n" + css + "\n</style>", 1)
    open(p, "w", encoding="utf-8").write(h)
PY
echo "public/index.html gerado"
