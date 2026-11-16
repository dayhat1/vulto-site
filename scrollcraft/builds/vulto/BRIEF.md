# BRIEF · vulto.tech v2

> Self-authored from the owner's written brief (VULTO_BRIEF.md + build prompt), not interviewed.
> Decisions the owner gave are quoted or paraphrased closely; the rest is authored and marked (authored).

## 1. Vibe
Escuro quase preto, startup de infraestrutura/IA, sem copiar ninguém. Conceito "vulto": silhueta, presença que emerge do escuro.

## 2. Journey (owner's order)
Nav → Hero → prova → Serviços → Processo (pinado, etapa por etapa) → Cases → Produtos → Blog → CTA final → Footer.
Cases e Produtos ficam de fora desta etapa (sem material do dono). (Dores e Dúvidas, que já existem no site, ficam: Dores entre prova e serviços, Dúvidas antes do CTA final.) (authored)

## 3. Energy curve
Calmo e tenso no hero, firme na prova, aberto nos serviços, intenso no processo, calmo no blog, quieto no fim. (authored)

## 4. Feeling curve and peak
| Ato | Sensação | Causa na tela |
|---|---|---|
| Hero | Presença | Uma figura escura emerge do preto, borda de luz vermelha, reage ao mouse |
| Prova | Firmeza | Poucos números reais, em mono, entrando em ordem |
| Dores | Reconhecimento | Três horas do dia em que o cliente escapa |
| Serviços | Alcance | Quatro planos em trilho lateral, preço fechado à vista |
| **Processo (pico)** | Revelação | A silhueta se completa, etapa por etapa, sob o dedo |
| Blog | Respiro | Cards calmos, posts reais |
| Dúvidas | Alívio | Respostas curtas, sem animação |
| CTA final | Convite em silêncio | O vulto inteiro, uma ação |

**Peak:** "Fui rolando e o vulto foi se completando a cada etapa até virar o emblema da Vulto." Vive no ato Processo, o maior trecho de scroll da página.

**It's the site where** a silhueta no escuro se completa conforme você rola até o seu negócio estar no ar.

## 5. Signature move
**"O vulto se completa."** Um SVG de silhueta com traço desenhado por `--sc-p` (stroke-dashoffset), uma parte por etapa, que termina como o emblema. O mesmo vulto reaparece inteiro no CTA final. Não é parâmetro de dispositivo do kit.

## 6. Aesthetic range
Premium-minimal escuro com grão leve, bordas de 1px translúcidas, títulos grandes e apertados em grotesca (Archivo condensada), números em mono (IBM Plex Mono).

## 7. World / grammar
Gramática: filmic one-shot (nav fixa com blur, hero com claim, seção pinada). Mundo: fotográfico não se aplica (sem assets de foto); o mundo é gerado em código (shader Three.js + SVG). Sem diorama de argila.

## 8. Assets
Já existem: logo (img/vulto-nome.jpg), emblema (img/vulto-emblema.jpg), capas dos posts. Não há vídeo nem chave kie.ai. O scrub do Processo é SVG/CSS, sem vídeo.

## Silêncios autorais
Dúvidas e rodapé não têm motion de scroll. O trecho de "dwell" da silhueta completa no fim do Processo é intencional.

## Regras que valem
Preservar textos, links, formulários, meta tags e URLs. Nunca editar o engine. 1 cor de destaque (vermelho da marca) + 1 gradiente de assinatura. Fallback sem 3D bonito. Estático em ./public, sem build step no Render (build.sh é local).
