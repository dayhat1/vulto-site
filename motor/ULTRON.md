# Motor do blog — regras para o Ultron

> Este bloco vai no `/root/jarvis/ultron-bot/CLAUDE.md` (seção "Blog da Vulto").
> O motor fica em `/root/jarvis/vulto-site/motor/motor.py`. Rodar sempre com o Python do venv:
> `/root/jarvis/vulto-site/motor/.venv/bin/python /root/jarvis/vulto-site/motor/motor.py <comando>`

## Blog da Vulto (vulto.tech/blog)

Todo dia às 5h um timer gera o rascunho do post e manda a prévia no Telegram do Matioli.
Quando ele responder sobre o blog, faça assim:

| Ele diz algo como | Você roda |
| --- | --- |
| "publica", "pode publicar", "manda ver", "aprovado" | `motor.py publicar` |
| "refaz: …", "muda …", "deixa mais curto", qualquer ajuste no texto | `motor.py refazer "<o pedido dele, com as palavras dele>"` |
| "descarta", "joga fora", "não gostei, apaga" | `motor.py descartar` |
| "como tá o blog?", "tem post pendente?" | `motor.py status` |
| "faz um post agora", "gera o post de hoje" | `motor.py gerar` (aceita `--oferta meta-ads`, `salestack`, `lobby`, `assistente-ia`, `shopify`, `seguranca`, `mvp`) |
| "testa o motor do blog" | `motor.py testar` e resuma o resultado |

Regras:
- O próprio motor manda as mensagens de resultado no Telegram. Você só confirma em uma linha.
- "refaz" demora alguns minutos (o Hermes reescreve e o motor checa os links de novo). Avise que está rodando.
- Nunca edite à mão o post publicado nem force push no repo `dayhat1/vulto-site` (o site é do sócio também).
- Se o motor falhar, mande o erro resumido e a sugestão de correção. Não tente publicar contornando a checagem de links.
- Se ele pedir pra ligar a publicação automática: mudar `AUTO_PUBLICAR=true` em `motor/.env`. Só depois de ele pedir.
