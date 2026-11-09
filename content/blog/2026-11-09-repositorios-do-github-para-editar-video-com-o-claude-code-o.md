---
title: "Repositórios do GitHub para editar vídeo com o Claude Code: o top 5"
description: "Cinco repositórios do GitHub para editar vídeo com o Claude Code, com comando de instalação, prós, contras e estrelas conferidas em 09/11/2026."
date: 2026-11-09
oferta: "assistente-ia"
categoria: "IA"
autor: "Redação Vulto"
cta: "Quero meu diagnóstico grátis"
cover: "/img/blog/repositorios-do-github-para-editar-video-com-o-claude-code-o.webp"
cover_alt: "Arte da Vulto com o título do post: Repositórios do GitHub para editar vídeo com o Claude Code: o top 5"
cover_credito: "Arte: Vulto"
gate: "true"
minutos_total: "7"
draft: false
---
Editar vídeo toma tempo. Cortar pausa, tirar "é..." e "hã", legendar, exportar. O Claude Code pode fazer boa parte disso se você der a ele as ferramentas certas. Elas existem, são abertas e estão no GitHub.

Este guia é o conteúdo completo do reel. Reuni cinco repositórios, cada um com o que faz, o comando de instalação tirado do README, o que é bom e o que pesa. Os números de estrelas foram conferidos nas páginas dos repositórios em 09/11/2026.

Uma nota antes de começar: o GitHub mostra as estrelas de forma abreviada (30,8 mil, por exemplo). Por isso uso "cerca de" quando o número não é exato.

## Como escolhi os cinco

Procurei repositórios que ensinam o Claude Code a mexer em vídeo, seja cortando gravações, seja criando vídeos do zero. Abri a página de cada um, li o README e anotei licença, requisitos e instalação.

Dois tipos aparecem na lista:

- **Edição de gravação existente:** você tem o arquivo bruto e quer cortar, limpar e legendar.
- **Criação por código:** o vídeo é montado a partir de texto e componentes, sem gravação prévia.

Um "skill" é uma pasta de instruções que o Claude Code lê para aprender uma tarefa nova. A maioria destes repositórios funciona assim.

## Os 5 repositórios

### 1. video-use: edita a gravação conversando

[browser-use/video-use](https://github.com/browser-use/video-use) tem cerca de 30,8 mil estrelas no GitHub em 09/11/2026 e licença MIT. A descrição é "Edit videos with coding agents". Segundo o README, você joga o material bruto numa pasta, conversa com o Claude Code e recebe um `final.mp4`.

Como o README descreve a instalação manual:

```
git clone https://github.com/browser-use/video-use ~/Developer/video-use
ln -sfn ~/Developer/video-use ~/.claude/skills/video-use

cd ~/Developer/video-use
uv sync
brew install ffmpeg

cp .env.example .env
```

O `ffmpeg` é o programa que corta e junta vídeo por baixo dos panos. O `uv` instala as dependências em Python.

- **Prós:** é o mais popular da lista, tem licença livre e o fluxo é simples: pasta, conversa, arquivo final.
- **Contras:** exige uma chave da API do ElevenLabs, usada para transcrever cada vídeo. O README não informa preço ou limite. O comando `brew` é de macOS. Em outros sistemas, instale o ffmpeg do seu jeito.

### 2. Skills oficiais do Remotion: vídeo feito de código

[remotion-dev/skills](https://github.com/remotion-dev/skills) tem cerca de 6,7 mil estrelas em 09/11/2026. O Remotion é uma ferramenta para criar vídeo com código. Este repositório reúne skills com boas práticas para trabalhar nele. O README cita Claude Code, Codex, Kimi Code e Cursor como agentes compatíveis.
