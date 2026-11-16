#!/usr/bin/env bash
# DESATIVADO na home v3: public/index.html agora é a fonte (HTML/CSS/JS puros, sem build).
# O script antigo gerava o index.html a partir de src/vulto-landing.html e sobrescreveria a home nova.
echo "build.sh desativado: edite public/index.html direto. O blog continua: python3 tools/build_blog.py" >&2
exit 1
