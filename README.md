# vulto.tech

Landing page da Vulto (página que vende + atendente com IA no WhatsApp).

- `src/vulto-landing.html`: fonte da página. Edite aqui.
- `bash build.sh`: gera `public/index.html` a partir da fonte.
- `public/`: o que vai pro ar (Render, site estático).
- Número do WhatsApp: linha `const WHATSAPP` no final da fonte.

Deploy: o Render lê o `render.yaml` (site estático publicando `public/`, sem build).

## Efeitos (3D, transições)

- `public/css/vulto.css` e `public/js/vulto.js`: camada compartilhada da landing e do blog (tokens, nav, rodapé, revelar ao rolar, tilt, cursor, transições entre páginas). Tudo parado com "menos movimento".
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
