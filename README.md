# vulto.tech

Landing page da Vulto (página que vende + atendente com IA no WhatsApp).

- `public/index.html`: a home (v3). Edite direto; não há mais build. `build.sh` foi desativado (sobrescreveria a home com a fonte antiga em `src/`, mantida só como histórico).
- `public/`: o que vai pro ar (Render, site estático, sem build).
- Número do WhatsApp: `const WHATSAPP` no topo de `public/js/main.js`.

Deploy: o Render lê o `render.yaml` (site estático publicando `public/`, sem build).

## Home v3 (feat/site-3d)

- `public/css/tokens.css` (cores, fontes, medidas), `base.css` (reset, botões, tag, card, nav, rodapé) e `home.css` (seções).
- `public/js/main.js`: nav, WhatsApp, tilt dos cases, posts do blog (lê `/blog/posts.json`) e animações GSAP/ScrollTrigger.
- `public/js/scenes.js`: as cenas 3D. UM canvas fixo (`#scenes-canvas`) desenha todos os slots `[data-scene]` do HTML (viewport + scissor): `globe-hero` (planeta de partículas, mini PCs nos países, arcos de energia, satélites), `constellation` (serviços), `pipeline` (como funciona, acende com o scroll), `globe-cases` e `beacon` (CTA). Só carrega em desktop (>= 768px, ponteiro fino), com WebGL e sem reduced-motion; no resto o hero usa o planeta em SVG com CSS.
- Blog e /privacidade também usam o `scenes.js` (boot em `public/js/vulto.js`). Cada post ganha uma cena no topo escolhida por `cena_for()` em `tools/build_blog.py` (override com `cena: "funnel"` no frontmatter; valores: neural, relay, funnel, shield, conveyor, building, radar, pipeline, globe-news) e a cena `beacon` acima da caixa de CTA.
- Para criar uma cena nova: adicione um builder em `BUILDERS` e um `<div class="scene-slot ..." data-scene="nome">` na seção.
- Three.js 0.160.0 e GSAP 3.12.5 vêm da CDN (jsDelivr) pelo import map do `index.html`, com versão fixada.
- `?fps=off` na URL desliga o vigia de fps do 3D (útil para testar em máquina sem GPU).
- `scrollcraft.*` e `hero3d.js` (home v2) ficam no repo mas a home não os usa mais.

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
