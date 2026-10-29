# Instalação do motor do blog na VPS (roteiro para o Ultron executar)

Objetivo: todo dia às 5h (horário de Brasília) gerar um advertorial com o Hermes a partir de
notícia real, mandar a prévia no Telegram do Matioli, e publicar quando ele aprovar.

Faça na ordem, confira cada passo e no fim mande um resumo no Telegram com o que deu OK e o que falta.

## 1. Clonar o site
```bash
cd /root/jarvis
git clone https://github.com/dayhat1/vulto-site.git   # se já existir, só: git -C vulto-site pull
cd vulto-site
git config user.name  "Ultron (motor do blog)"
git config user.email "ultron@vulto.tech"
```

## 2. Acesso de escrita no repo
Teste: `git push --dry-run origin main`.
- Se passou: ok, siga.
- Se falhou: crie uma deploy key só pra esse repo:
  ```bash
  ssh-keygen -t ed25519 -N "" -C "ultron-vulto-site" -f /root/.ssh/vulto_site_deploy
  cat >> /root/.ssh/config <<'EOF'
  Host github-vulto-site
    HostName github.com
    User git
    IdentityFile /root/.ssh/vulto_site_deploy
    IdentitiesOnly yes
  EOF
  git remote set-url origin git@github-vulto-site:dayhat1/vulto-site.git
  ```
  Mande a chave pública (`cat /root/.ssh/vulto_site_deploy.pub`) no Telegram e diga:
  "o dono do repo (dayhat1) precisa colar essa chave em github.com/dayhat1/vulto-site → Settings → Deploy keys → Add deploy key, marcando **Allow write access**". Espere ele confirmar e teste de novo.

## 3. Python e Pillow (venv próprio, não mexe no sistema)
```bash
python3 -m venv motor/.venv
motor/.venv/bin/pip install --quiet pillow
```

## 4. Configuração (`motor/.env`) — segredos NUNCA vão pro git nem pro vault
```bash
cp motor/config.example.env motor/.env && chmod 600 motor/.env
```
Preencha:
- `HERMES_KEY` = valor de `API_SERVER_KEY` do `.env` do usuário `hermes`.
- `HERMES_CAMPO_PROMPT`: abra `/root/jarvis/specs/HERMES_SETUP.md` e confira qual campo o `POST /v1/runs` espera
  para o texto do pedido (o motor usa `input` por padrão). Se a resposta do `GET /v1/runs/{id}` guardar o texto
  num campo com outro nome, o motor já procura em `output`, `result`, `final_output`, `response`, `text`, `content`.
- `LLM_FALLBACK_URL`: se o LiteLLM (`jarvis-litellm-1`, porta 4000) estiver acessível do host, use
  `http://127.0.0.1:4000/v1` com a master key dele em `LLM_FALLBACK_KEY`. Se não estiver exposto, deixe vazio.
- `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID`: os mesmos do bot do Ultron (`/root/jarvis/ultron-bot/.env`).
  O motor só ENVIA mensagens (sendMessage/sendPhoto); não usa getUpdates, então não briga com o webhook do n8n.
- `AUTO_PUBLICAR=false` (o Matioli aprova no 1º mês).

## 5. Testar
```bash
motor/.venv/bin/python motor/motor.py testar
```
Precisa: Hermes OK, Telegram OK, git push OK, e a maioria dos feeds OK.
Feed que falhar: tente achar a URL de RSS certa do mesmo site e corrija em `motor/feeds.json`; se não achar, remova.
Se o Hermes não responder "pronto", ajuste `HERMES_CAMPO_PROMPT` até responder.

## 6. Primeiro post (manual, pra ver funcionando)
```bash
motor/.venv/bin/python motor/motor.py gerar
```
Leva de 2 a 25 minutos (pesquisa + escrita do Hermes + checagem dos links). A prévia chega no Telegram.
NÃO publique: o Matioli decide.

## 7. Agendar (systemd, horário de Brasília)
```bash
cat > /etc/systemd/system/vulto-blog-gerar.service <<'EOF'
[Unit]
Description=Vulto blog - gerar rascunho do dia
After=network-online.target
[Service]
Type=oneshot
WorkingDirectory=/root/jarvis/vulto-site
ExecStart=/root/jarvis/vulto-site/motor/.venv/bin/python /root/jarvis/vulto-site/motor/motor.py gerar
TimeoutStartSec=45min
EOF
cat > /etc/systemd/system/vulto-blog-gerar.timer <<'EOF'
[Unit]
Description=Vulto blog - todo dia 5h
[Timer]
OnCalendar=*-*-* 05:00:00 America/Sao_Paulo
Persistent=true
[Install]
WantedBy=timers.target
EOF
cat > /etc/systemd/system/vulto-blog-auto.service <<'EOF'
[Unit]
Description=Vulto blog - publicar sozinho se AUTO_PUBLICAR=true
[Service]
Type=oneshot
WorkingDirectory=/root/jarvis/vulto-site
ExecStart=/root/jarvis/vulto-site/motor/.venv/bin/python /root/jarvis/vulto-site/motor/motor.py auto
EOF
cat > /etc/systemd/system/vulto-blog-auto.timer <<'EOF'
[Unit]
Description=Vulto blog - checagem das 9h
[Timer]
OnCalendar=*-*-* 09:00:00 America/Sao_Paulo
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now vulto-blog-gerar.timer vulto-blog-auto.timer
systemctl list-timers | grep vulto
```
Se o painel "Crons" do HUD lista timers do systemd, eles devem aparecer lá.

## 8. Ensinar você mesmo a operar o blog
Copie a seção "Blog da Vulto" de `motor/ULTRON.md` para o seu `/root/jarvis/ultron-bot/CLAUDE.md`.
Não precisa reiniciar o bridge (e NÃO reinicie o `ultron-bridge.service` enquanto estiver rodando este job).

## 9. Memória
Crie a nota `Projetos/Vulto-Blog.md` no vault com: onde o motor fica, os timers, os comandos e que o
repo é do sócio (dayhat1). Sem segredos.

## 10. Resumo no Telegram
Mande: o resultado do `testar`, se o push está liberado (ou se está esperando a deploy key),
os horários dos timers e se a prévia do primeiro post chegou.
