---
title: "IA no negócio digital: do atendimento à venda, etapa por etapa"
description: "Veja onde a IA entra em cada etapa do negócio digital: atendimento no WhatsApp, página que vende, tráfego pago e medição, com links oficiais."
date: 2026-11-11
oferta: "assistente-ia"
categoria: "IA"
autor: "Redação Vulto"
cta: "Quero meu diagnóstico grátis"
cover: "/img/blog/ia-no-negocio-digital-do-atendimento-a-venda-etapa-por-etapa.webp"
cover_alt: "Arte da Vulto com o título do post: IA no negócio digital: do atendimento à venda, etapa por etapa"
cover_credito: "Arte: Vulto"
reel_id: "20261111-1917-vulto-tech-blog-post-sobre-ia"
reel_capa: "/img/blog/ia-no-negocio-digital-do-atendimento-a-venda-etapa-por-etapa-reel.webp"
gate: "true"
minutos_total: "6"
draft: false
---
No reel, eu disse que a IA no WhatsApp responde na hora e já manda o link. Também disse que ela sozinha não resolve. Este texto é a continuação: onde a IA entra em cada etapa, o que você precisa ter em volta dela e o que checar antes de ligar qualquer coisa.

Cada item do reel aparece aqui com detalhe: atendimento, página que converte, tráfego pago e medição. Os links são de documentação oficial, abertos em 11/11/2026. Onde há número ou regra, a fonte está no texto.

Você não precisa virar programador. Precisa entender o caminho do cliente e decidir quem faz o quê: a IA, a página, o anúncio ou você.

## Etapa 1: atendimento na hora, no WhatsApp

Cliente que espera resposta vai olhar o concorrente. A IA resolve a parte repetitiva: preço, horário, dúvida comum, agendamento e envio do link certo. Quando ela não sabe, passa a conversa para uma pessoa.

### Como o WhatsApp funciona por baixo

A [Cloud API do WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api) é a porta oficial para sistemas conversarem pelo WhatsApp Business. Ela envia mensagens (texto, mídia, botões) e recebe eventos, como mensagem recebida, por webhook. Webhook é um aviso automático que o WhatsApp manda ao seu sistema quando algo acontece.

Duas regras explicam o comportamento de qualquer atendente com IA, segundo a [documentação de envio de mensagens](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages):

- **Janela de 24 horas.** Ela abre quando o cliente escreve. Cada nova mensagem dele reinicia o cronômetro. Dentro dela, a empresa pode responder com texto livre, imagem, áudio, documento, botões e listas.
- **Fora da janela, só template.** Template é uma mensagem pré-configurada, em geral sujeita a aprovação. É o único tipo permitido fora das 24 horas. Antes de enviar, é preciso ter o consentimento (opt-in) do cliente.

Na prática: a IA responde livremente enquanto o cliente conversa. Para lembrar de um agendamento no dia seguinte, você usa template aprovado.

### Quanto custa

A [página de preços da Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) diz que a cobrança é por mensagem entregue, desde 1º de julho de 2025. Mensagens do cliente para a empresa não são cobradas. Os pontos que mudam o seu custo, conforme a página:

- Existem cinco categorias: Marketing, Utility e Authentication (todas por template), Service e Meta Business Agent (não-template, dentro da janela de 24h).
- Service passou a ter franquia de 1.000 mensagens gratuitas por número comercial por mês, sem acúmulo, a partir de 1º de outubro de 2026. Antes disso, era gratuito sem limite.
- Se o cliente chega por um anúncio que abre o WhatsApp (click-to-WhatsApp) pelo app no celular, a resposta da empresa não é cobrada e abre uma janela gratuita que pode durar até 7 dias. O Meta Business Agent continua cobrado nesse caso.
- Contas do Brasil precisam estar em BRL até 30 de junho de 2027, segundo a página.
