# Imagens do blog

Hoje os 5 posts usam **ilustrações próprias** (crédito "Ilustração: Vulto"), geradas por `gerar.py`.
Elas foram feitas assim porque o ambiente que montou o blog não tinha acesso ao Unsplash/Pexels.

## Trocar por foto real (10 minutos por post)

1. Baixe uma foto no **Unsplash** ou **Pexels** (licença livre para uso comercial).
2. Rode:

   ```bash
   pip install pillow   # só na primeira vez
   python3 tools/otimizar_imagem.py ~/Downloads/foto.jpg whatsapp-cobranca --capa
   ```

   Usando o **mesmo nome** da ilustração, a foto substitui a ilustração sem mexer no post.
3. No `.md` do post, troque só o crédito:

   ```yaml
   cover_alt: "Descrição real do que aparece na foto"
   cover_credito: "Foto: Nome do Autor / Unsplash"
   cover_link: "https://unsplash.com/photos/..."
   ```

4. `python3 tools/build_blog.py`, commit e push.

## Busca sugerida por imagem

| Arquivo | Post | Buscar no Unsplash/Pexels |
| --- | --- | --- |
| whatsapp-cobranca (capa) | WhatsApp cobra por mensagem | "small business owner smartphone counter" |
| whatsapp-filtro | WhatsApp cobra por mensagem | "customer service phone chat" |
| agentes-ia (capa) | Ano dos agentes de IA | "server room red light" / "ai chip" |
| agentes-loja-noite | Ano dos agentes de IA | "closed shop night storefront" |
| cinco-minutos (capa) | Regra dos 5 minutos | "stopwatch dark" |
| cinco-minutos-comparacao | Regra dos 5 minutos | manter (é gráfico com dado citado) |
| pousada-reservas (capa) | Pousada perde reserva | "guesthouse reception desk" / "pousada" |
| pousada-caderno-sistema | Pousada perde reserva | "hotel booking notebook" |
| impulsionar (capa) | Impulsionar queima dinheiro | "instagram phone hand dark" |
| impulsionar-rotas | Impulsionar queima dinheiro | "marketing analytics laptop" |

## Regras

- Foto ilustra o **tema**. Nunca apresentar como foto do fato, de empresa citada ou de cliente da Vulto.
- Nada de rosto de pessoa famosa, logo de marca de terceiros em destaque, nem print falso de conversa ou painel.
- Sempre crédito + link do autor.
