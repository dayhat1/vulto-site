# VULTO_BRIEF

## O que é
Site da Vulto (vulto.tech), estúdio de serviços digitais: automação, SaaS, assistentes de IA, Meta Ads, lojas Shopify, MVPs e auditoria de segurança. Cases: PsyGang, CriptoPassivo, Aion, LOBBY. Produtos: SaleStack, LOBBY.

## Regras fixas
- Resultado final é HTML/CSS/JS estático dentro de ./public, servido pelo Render sem build step.
- Preserve todos os textos, links, formulários, meta tags e URLs atuais.
- Construa com a skill scroll-craft (/nateherk-design:scroll-craft). Rode o doctor e o workspace --ensure antes. Nunca edite o engine: só tokens e fontes.
- Commits por etapa na branch redesign-v2. Nunca na main.

## Direção
- Nível de startup de infraestrutura/IA bilionária, sem copiar ninguém.
- Tema escuro, 1 cor de destaque, 1 gradiente de assinatura, tudo em tokens.
- Conceito "vulto": silhueta, presença que emerge do escuro.
- Estrutura da home: Nav → Hero → prova (números/logos) → Serviços → Processo (seção pinada) → Cases → Produtos → Blog → CTA final → Footer.

## 3D e motion
- Three.js somente no hero: uma peça autoral gerada por código, com shader customizado, reagindo a mouse e scroll. Lazy-load após o primeiro paint, pixelRatio máx 1.5, pausa fora da viewport.
- Todo o resto do motion vem do scroll-craft (pin, scrub, reveal por linha).
- Fallback obrigatório: sem WebGL, com prefers-reduced-motion ou em dispositivo fraco, troca o 3D por gradiente em CSS e o vídeo scrub por imagem estática.
- Se faltar vídeo ou imagem pra alguma seção, pare e me peça o asset. Não invente placeholder genérico.

## Critério de pronto
- Verificação do scroll-craft passando (sem scroll morto, contraste ok) e contact sheet gerada.
- Lighthouse mobile: Performance 85+, Acessibilidade 95+, SEO 100.
- Funciona em 375px, 768px e 1440px.
