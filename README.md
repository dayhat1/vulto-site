# vulto.tech

Landing page da Vulto (página que vende + atendente com IA no WhatsApp).

- `src/vulto-landing.html`: fonte da página. Edite aqui.
- `bash build.sh`: gera `public/index.html` a partir da fonte e embute `public/css/home.css` no HTML (mais rápido no primeiro paint). Mexeu no CSS da home? Rode o build de novo.
- `public/`: o que vai pro ar (Render, site estático).
- Número do WhatsApp: linha `const WHATSAPP` no final da fonte.

Deploy: o Render lê o `render.yaml` (site estático publicando `public/`, sem build).

## Home v2 (scroll-craft)

- `public/css/scrollcraft.css` e `public/js/scrollcraft.js`: engine do scroll-craft, copiado sem edição. Não mexa; tema só em `home.css` (tokens e fontes).
- `public/css/home.css`: tokens e CSS da home. `public/js/home.js`: liga o motion (todo `data-sc-*` é escrito lá) e carrega o 3D só na primeira interação.
- `public/js/hero3d.js`: figura 3D do hero (shader próprio). Sem WebGL, com menos movimento, aparelho fraco ou FPS < 30, o hero fica com o vulto em SVG.
- `public/fonts/`: Archivo e IBM Plex hospedadas aqui (subset latin).
- `scrollcraft/`: BRIEF, contact sheets e ferramentas de verificação (não vai pro ar).

## Efeitos (3D, transições)

- `public/css/vulto.css`, `public/css/blog.css` e `public/js/vulto.js`: visual v2 do blog e da /privacidade (mesmos tokens da home). O `build_blog.py` embute os dois CSS em cada página. Mexeu no CSS do blog? Rode `python3 tools/build_blog.py`.
- `public/js/hero3d.js` + `public/js/vendor/three.module.min.js` (Three.js 0.160, licença MIT): o 3D do hero. Só carrega no computador, depois que a página já apareceu.
- Mudou CSS/JS? Suba o `?v=` nos links (landing) e o `ASSET_V` em `tools/build_blog.py`.

## Blog (`/blog`)

- Posts em `content/blog/*.md` → `python3 tools/build_blog.py` gera `public/blog/`, `rss.xml` e `blog-sitemap.xml`.
- Imagens: `python3 tools/otimizar_imagem.py foto.jpg nome [--capa]` (precisa de `pip install pillow`).
- Ilustrações atuais e como trocar por foto: `content/blog/ilustracoes/LEIA.md`.

## Motor do blog (Ultron + Hermes)

Todo dia às 5h a VPS gera um advertorial a partir de notícia real, checa os links, faz a capa e manda a prévia no Telegram. Publica quando o Matioli aprova.

- Código: `motor/motor.py` (comandos `gerar`, `publicar`, `refazer`, `descartar`, `status`, `testar`).
- Instalação na VPS: `motor/INSTALAR-ULTRON.md`. Regras de operação do Ultron: `motor/ULTRON.md`.
- Commits do motor aparecem como "Ultron (motor do blog)" e só mexem em `content/blog`, `public/blog`, `public/img/blog` e nos feeds.
