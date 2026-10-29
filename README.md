# vulto.tech

Landing page da Vulto (página que vende + atendente com IA no WhatsApp).

- `src/vulto-landing.html`: fonte da página. Edite aqui.
- `bash build.sh`: gera `public/index.html` a partir da fonte.
- `public/`: o que vai pro ar (Render, site estático).
- Número do WhatsApp: linha `const WHATSAPP` no final da fonte.

Deploy: o Render lê o `render.yaml` (site estático publicando `public/`, sem build).
