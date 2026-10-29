#!/usr/bin/env python3
"""
MOTOR DO BLOG DA VULTO  (Ultron + Hermes)

Todo dia: pega notícias reais de feeds RSS, pede para o Hermes escrever o advertorial
da oferta do dia, confere tudo, gera a capa e manda a prévia no Telegram.
Você responde pro Ultron e ele publica.

Comandos:
    python3 motor/motor.py gerar              cria o rascunho do dia e manda a prévia no Telegram
    python3 motor/motor.py publicar           publica o rascunho (commit + push -> Render)
    python3 motor/motor.py refazer "texto"    reescreve o rascunho seguindo o seu comentário
    python3 motor/motor.py descartar          apaga o rascunho
    python3 motor/motor.py status             mostra se tem rascunho pendente
    python3 motor/motor.py auto               (9h) publica sozinho se AUTO_PUBLICAR=true e o rascunho passou na checagem
    python3 motor/motor.py testar             checa config, feeds, Hermes, Telegram e git

Opções do gerar:  --oferta meta-ads   (força a oferta)   --sem-telegram   --sem-pull

Config em motor/.env (copie de motor/config.example.env). Requer Python 3.8+ e Pillow (só para a capa).
"""

import argparse
import datetime as dt
import html
import importlib.util
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET

AQUI = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(AQUI)
BLOG_SRC = os.path.join(ROOT, "content", "blog")
IMG_DIR = os.path.join(ROOT, "public", "img", "blog")
ESTADO = os.path.join(AQUI, "estado.json")
SAIDAS = os.path.join(AQUI, "saidas")
LOCK = os.path.join(AQUI, ".lock")
UA = "Mozilla/5.0 (compatible; VultoBlogBot/1.0; +https://vulto.tech)"

CATEGORIAS = ["Mercado", "IA", "Vendas", "Marketing", "Negócios", "Segurança"]
OFERTAS = {
    "meta-ads": ("Gestão de Meta Ads", "anúncios no Instagram e Facebook estruturados por objetivo, que trazem conversa de venda e não curtida"),
    "salestack": ("SaleStack", "sistema que acha clientes do nicho na região, detecta o WhatsApp e manda a primeira mensagem sozinho"),
    "lobby": ("LOBBY", "sistema para pousadas pequenas: mapa de reservas, governança, preço dinâmico e FNRH/SISMATUR"),
    "assistente-ia": ("Atendente com IA no WhatsApp", "IA que responde dúvidas, preço e horário 24h, agenda e lembra o cliente, passando para o dono quando não sabe"),
    "shopify": ("Loja Shopify que converte", "loja virtual montada para vender, com página de produto, checkout e recuperação de carrinho"),
    "seguranca": ("Auditoria de segurança", "teste de invasão autorizado que acha as brechas do site/sistema antes do invasor"),
    "mvp": ("SaaS e MVP sob medida", "tirar uma ideia de software do papel e colocar no ar com login, pagamento e painel"),
}


# ------------------------------------------------------------------ util
def log(*a):
    print(time.strftime("[%H:%M:%S]"), *a, flush=True)


def carregar_env():
    cfg = {}
    p = os.path.join(AQUI, ".env")
    if os.path.exists(p):
        for ln in open(p, encoding="utf-8"):
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                cfg[k.strip()] = v.split(" #")[0].strip().strip('"').strip("'")
    for k, v in os.environ.items():
        if k.startswith(("HERMES_", "LLM_", "TELEGRAM_", "SITE_", "GIT_", "AUTO_", "MOTOR_")):
            cfg[k] = v
    cfg.setdefault("HERMES_URL", "http://127.0.0.1:8642")
    cfg.setdefault("HERMES_CAMPO_PROMPT", "input")
    cfg.setdefault("HERMES_TIMEOUT_MIN", "25")
    cfg.setdefault("SITE_URL", "https://vulto.tech")
    cfg.setdefault("GIT_BRANCH", "main")
    cfg.setdefault("AUTO_PUBLICAR", "false")
    cfg.setdefault("MOTOR_JANELA_HORAS", "72")
    return cfg


def http(url, data=None, headers=None, metodo=None, timeout=30):
    h = {"User-Agent": UA}
    h.update(headers or {})
    if isinstance(data, (dict, list)):
        data = json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=h, method=metodo)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def slugify(t, maxlen=64):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    if len(t) > maxlen:
        t = t[:maxlen].rsplit("-", 1)[0]
    return t


def git(*args, check=True):
    r = subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} falhou: {r.stderr.strip() or r.stdout.strip()}")
    return r.stdout.strip()


def ler_estado():
    try:
        return json.load(open(ESTADO, encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def salvar_estado(e):
    if e:
        json.dump(e, open(ESTADO, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    elif os.path.exists(ESTADO):
        os.remove(ESTADO)


class Trava:
    def __enter__(self):
        if os.path.exists(LOCK) and time.time() - os.path.getmtime(LOCK) < 3600:
            sys.exit("Outro comando do motor está rodando (motor/.lock). Se travou, apague o arquivo.")
        open(LOCK, "w").write(str(os.getpid()))
        return self

    def __exit__(self, *a):
        try:
            os.remove(LOCK)
        except OSError:
            pass


def importar(caminho, nome):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ------------------------------------------------------------------ pauta (RSS)
def texto_limpo(s, n=400):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(re.sub(r"\s+", " ", s)).strip()
    return s[:n]


def ler_feed(url):
    _, raw = http(url, timeout=20)
    root = ET.fromstring(raw)
    itens = []
    ns = {"a": "http://www.w3.org/2005/Atom"}
    for it in root.iter("item"):
        itens.append({
            "titulo": texto_limpo(it.findtext("title"), 200),
            "link": (it.findtext("link") or "").strip(),
            "resumo": texto_limpo(it.findtext("description") or it.findtext("{http://purl.org/rss/1.0/modules/content/}encoded")),
            "data": it.findtext("pubDate") or it.findtext("{http://purl.org/dc/elements/1.1/}date") or "",
        })
    for it in root.findall("a:entry", ns):
        link = it.find("a:link", ns)
        itens.append({
            "titulo": texto_limpo(it.findtext("a:title", namespaces=ns), 200),
            "link": link.get("href") if link is not None else "",
            "resumo": texto_limpo(it.findtext("a:summary", namespaces=ns) or it.findtext("a:content", namespaces=ns)),
            "data": it.findtext("a:updated", namespaces=ns) or it.findtext("a:published", namespaces=ns) or "",
        })
    dominio = urllib.parse.urlparse(url).netloc.replace("www.", "")
    for i in itens:
        i["veiculo"] = dominio
    return itens


def parse_data(s):
    from email.utils import parsedate_to_datetime
    if not s:
        return None
    try:
        d = parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d


def links_ja_usados():
    usados = set()
    if os.path.isdir(BLOG_SRC):
        for f in os.listdir(BLOG_SRC):
            if f.endswith(".md"):
                usados |= set(re.findall(r"https?://[^\s)\"]+", open(os.path.join(BLOG_SRC, f), encoding="utf-8").read()))
    return usados


def buscar_pautas(oferta, cfg, n=8):
    conf = json.load(open(os.path.join(AQUI, "feeds.json"), encoding="utf-8"))
    palavras = [p.lower() for p in conf["ofertas"][oferta]["palavras"]]
    janela = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=int(cfg["MOTOR_JANELA_HORAS"]))
    usados = links_ja_usados()
    todos, falhas = [], []
    for url in conf["feeds"]:
        try:
            todos += ler_feed(url)
        except Exception as e:  # feed fora do ar não derruba o motor
            falhas.append(f"{url} ({type(e).__name__})")
    vistos, pontuados = set(), []
    for it in todos:
        if not it["link"].startswith("http") or it["link"] in usados or it["link"] in vistos:
            continue
        vistos.add(it["link"])
        d = parse_data(it["data"])
        if d and d < janela:
            continue
        corpo = f" {it['titulo']} {it['resumo']} ".lower()
        score = sum(3 if p in it["titulo"].lower() else 1 for p in palavras if p in corpo)
        if score:
            pontuados.append((score, d or janela, it))
    pontuados.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [p[2] for p in pontuados[:n]], falhas


# ------------------------------------------------------------------ Hermes
def extrair_texto(obj):
    """Acha o texto final na resposta do Hermes, seja qual for o formato."""
    if isinstance(obj, str):
        return obj
    if isinstance(obj, dict):
        for k in ("output", "result", "final_output", "response", "answer", "text", "content", "message"):
            if k in obj and obj[k]:
                t = extrair_texto(obj[k])
                if t:
                    return t
        if "choices" in obj:
            return extrair_texto(obj["choices"])
    if isinstance(obj, list):
        partes = [extrair_texto(x) for x in obj]
        partes = [p for p in partes if p]
        return partes[-1] if partes else ""
    return ""


def hermes(prompt, cfg):
    url = cfg["HERMES_URL"].rstrip("/")
    head = {"Authorization": f"Bearer {cfg.get('HERMES_KEY', '')}"}
    _, raw = http(f"{url}/v1/runs", data={cfg["HERMES_CAMPO_PROMPT"]: prompt}, headers=head, timeout=60)
    r = json.loads(raw)
    run_id = r.get("run_id") or r.get("id") or (r.get("run") or {}).get("id")
    if not run_id:
        t = extrair_texto(r)
        if t:
            return t
        raise RuntimeError(f"Hermes não devolveu run_id: {str(r)[:300]}")
    limite = time.time() + float(cfg["HERMES_TIMEOUT_MIN"]) * 60
    while time.time() < limite:
        time.sleep(10)
        _, raw = http(f"{url}/v1/runs/{run_id}", headers=head, timeout=60)
        r = json.loads(raw)
        st = str(r.get("status", "")).lower()
        if st in ("completed", "succeeded", "success", "done", "finished"):
            return extrair_texto(r)
        if st in ("failed", "error", "cancelled", "canceled", "expired"):
            raise RuntimeError(f"Hermes terminou com status {st}: {str(r)[:300]}")
    raise RuntimeError("Hermes passou do tempo limite")


def llm_reserva(prompt, cfg):
    """Plano B: qualquer endpoint compatível com OpenAI (ex.: o LiteLLM da VPS)."""
    url = cfg.get("LLM_FALLBACK_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("sem LLM_FALLBACK_URL configurado")
    body = {"model": cfg.get("LLM_FALLBACK_MODELO", "nous-primary"), "messages": [{"role": "user", "content": prompt}], "temperature": 0.7}
    _, raw = http(f"{url}/chat/completions", data=body, headers={"Authorization": f"Bearer {cfg.get('LLM_FALLBACK_KEY', '')}"}, timeout=600)
    return json.loads(raw)["choices"][0]["message"]["content"]


def escrever(prompt, cfg):
    try:
        log("pedindo ao Hermes...")
        return hermes(prompt, cfg), "Hermes"
    except Exception as e:
        log(f"Hermes falhou ({e}); tentando o plano B")
        return llm_reserva(prompt, cfg), "reserva"


# ------------------------------------------------------------------ validação
def separar(saida):
    saida = saida.strip()
    saida = re.sub(r"^```[a-z]*\n|\n```$", "", saida)
    if not saida.startswith("---"):  # modelo escreveu algo antes do frontmatter
        k = saida.find("---")
        if k != -1:
            saida = saida[k:]
    carrossel = ""
    if "---CARROSSEL---" in saida:
        saida, carrossel = saida.split("---CARROSSEL---", 1)
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", saida.strip(), re.S)
    if not m:
        raise ValueError("saída sem frontmatter (--- ... ---)")
    meta = {}
    for ln in m.group(1).splitlines():
        if ":" in ln:
            k, v = ln.split(":", 1)
            meta[k.strip()] = v.split("  (")[0].strip().strip('"').strip("'")
    corpo = m.group(2).strip()
    corpo = "\n".join(l for l in corpo.splitlines() if not re.match(r"^#\s", l))
    return meta, corpo, carrossel.strip()


def link_vivo(u):
    for metodo in ("HEAD", "GET"):
        try:
            st, _ = http(u, metodo=metodo, timeout=15)
            if st < 400:
                return True
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 405, 429) and metodo == "HEAD":
                continue
            if e.code in (401, 403, 429):  # site bloqueia robô, mas existe
                return True
        except Exception:
            pass
    return False


def validar(meta, corpo, pautas):
    erros, avisos = [], []
    t, d = meta.get("title", ""), meta.get("description", "")
    if not t:
        erros.append("sem título")
    elif len(t) > 110:
        erros.append(f"título longo demais ({len(t)} caracteres, máx. 110)")
    if not (60 <= len(d) <= 170):
        erros.append(f"description com {len(d)} caracteres (precisa de 60 a 170)")
    if meta.get("categoria") not in CATEGORIAS:
        avisos.append(f"categoria '{meta.get('categoria')}' trocada pela padrão")
    palavras = len(re.findall(r"\w+", corpo))
    if palavras < 450:
        erros.append(f"texto curto ({palavras} palavras, mín. 450)")
    if palavras > 1700:
        avisos.append(f"texto longo ({palavras} palavras)")
    links = sorted(set(re.findall(r"\]\((https?://[^)\s]+)\)", corpo)))
    if not links:
        erros.append("nenhum link de fonte no texto")
    mortos = [u for u in links if not link_vivo(u)]
    if mortos:
        erros.append("links que não abrem (possível URL inventada): " + ", ".join(mortos))
    candidatos = {p["link"] for p in pautas}
    if pautas and not (set(links) & candidatos):
        avisos.append("nenhum link aponta para as notícias candidatas")
    for padrao in (r"nosso cliente", r"cliente da vulto", r"depoimento", r"case de sucesso", r"aumentou (em )?\d+ ?%"):
        if re.search(padrao, corpo, re.I):
            avisos.append(f"conferir trecho suspeito de promessa/depoimento: '{padrao}'")
    return erros, avisos, links, palavras


# ------------------------------------------------------------------ arquivos
def montar_md(meta, corpo, oferta, data, slug, capa):
    cat = meta.get("categoria") if meta.get("categoria") in CATEGORIAS else json.load(open(os.path.join(AQUI, "feeds.json"), encoding="utf-8"))["ofertas"][oferta]["categoria"]
    cta = meta.get("cta") or "Quero meu diagnóstico grátis"
    q = lambda s: s.replace('"', "'")
    fm = [
        "---",
        f'title: "{q(meta["title"])}"',
        f'description: "{q(meta["description"])}"',
        f"date: {data}",
        f'oferta: "{oferta}"',
        f'categoria: "{cat}"',
        'autor: "Redação Vulto"',
        f'cta: "{q(cta)}"',
    ]
    if capa:
        fm += [
            f'cover: "/img/blog/{slug}.webp"',
            f'cover_alt: "Arte da Vulto com o título do post: {q(meta["title"])}"',
            'cover_credito: "Arte: Vulto"',
        ]
    fm += ["draft: true", "---", ""]
    return "\n".join(fm) + corpo.strip() + "\n"


def fazer_capa(titulo, categoria, slug):
    try:
        capa = importar(os.path.join(AQUI, "capa.py"), "capa")
        otm = importar(os.path.join(ROOT, "tools", "otimizar_imagem.py"), "otimizar_imagem")
    except Exception as e:
        log(f"sem capa (Pillow instalado? {e})")
        return False
    os.makedirs(SAIDAS, exist_ok=True)
    png = os.path.join(SAIDAS, f"{slug}.png")
    capa.gerar_capa(titulo, categoria, png)
    sys_argv = sys.argv
    try:
        sys.argv = ["otimizar_imagem.py", png, slug, "--capa"]
        otm.main()
    finally:
        sys.argv = sys_argv
    return True


def arquivos_do_post(slug, md_path):
    fs = [md_path]
    for suf in (".webp", "-800.webp", "-og.jpg"):
        p = os.path.join(IMG_DIR, slug + suf)
        if os.path.exists(p):
            fs.append(p)
    return fs


def rodar_build():
    for cmd in (["python3", os.path.join(ROOT, "tools", "build_blog.py")],):
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
        if r.returncode != 0:
            raise RuntimeError(f"build falhou: {r.stderr or r.stdout}")
        log(r.stdout.strip())


# ------------------------------------------------------------------ Telegram
def tg(metodo, cfg, campos=None, arquivo=None):
    tok, chat = cfg.get("TELEGRAM_TOKEN"), cfg.get("TELEGRAM_CHAT_ID")
    if not tok or not chat:
        log("(Telegram não configurado; mensagem só no terminal)")
        return None
    url = f"{cfg.get('TELEGRAM_API', 'https://api.telegram.org').rstrip('/')}/bot{tok}/{metodo}"
    campos = dict(campos or {}, chat_id=chat)
    if arquivo:
        b = uuid.uuid4().hex
        partes = []
        for k, v in campos.items():
            partes.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        nome, chave = os.path.basename(arquivo[1]), arquivo[0]
        partes.append(f'--{b}\r\nContent-Disposition: form-data; name="{chave}"; filename="{nome}"\r\nContent-Type: image/jpeg\r\n\r\n'.encode())
        partes.append(open(arquivo[1], "rb").read())
        partes.append(f"\r\n--{b}--\r\n".encode())
        _, raw = http(url, data=b"".join(partes), headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    else:
        _, raw = http(url, data=campos)
    return json.loads(raw)


def tg_texto(cfg, texto):
    for i in range(0, len(texto), 3900):
        try:
            tg("sendMessage", cfg, {"text": texto[i:i + 3900], "disable_web_page_preview": "true"})
        except Exception as e:
            log(f"Telegram falhou: {e}")
    print(texto)


def mandar_previa(cfg, est):
    md = open(est["arquivo"], encoding="utf-8").read()
    corpo = md.split("\n---\n", 1)[1] if "\n---\n" in md else md
    paragrafos = [p for p in corpo.split("\n\n") if p.strip() and not p.startswith(("#", "-", ">", "!"))][:3]
    dominios = sorted({urllib.parse.urlparse(u).netloc.replace("www.", "") for u in est.get("links", [])})
    leg = (f"RASCUNHO DO BLOG — {est['oferta']}\n\n{est['titulo']}\n\n{est['description']}\n\n"
           f"{est['categoria']} · {est['palavras']} palavras · escrito por {est['autor_ia']}\n"
           f"Fontes: {', '.join(dominios) or '—'}")
    og = os.path.join(IMG_DIR, est["slug"] + "-og.jpg")
    print(leg)
    try:
        if os.path.exists(og):
            tg("sendPhoto", cfg, {"caption": leg[:1000]}, arquivo=("photo", og))
        else:
            tg("sendMessage", cfg, {"text": leg})
    except Exception as e:
        log(f"Telegram falhou: {e}")
    avisos = ("\n\nAVISOS:\n- " + "\n- ".join(est["avisos"])) if est.get("avisos") else ""
    tg_texto(cfg, "Começo do texto:\n\n" + re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", "\n\n".join(paragrafos)) + avisos +
             "\n\nResponda pro Ultron:\n• publica\n• refaz: <o que mudar>\n• descarta")


# ------------------------------------------------------------------ comandos
def montar_prompt(oferta, categoria, pautas):
    tpl = open(os.path.join(AQUI, "prompts", "redator.md"), encoding="utf-8").read()
    nome, resumo = OFERTAS[oferta]
    lista = "\n".join(f"{i+1}. {p['titulo']} — {p['veiculo']}\n   Link: {p['link']}\n   Resumo: {p['resumo'] or '(sem resumo)'}" for i, p in enumerate(pautas))
    return (tpl.replace("{OFERTA_NOME}", nome).replace("{OFERTA_RESUMO}", resumo)
               .replace("{CATEGORIA}", categoria).replace("{PAUTAS}", lista))


def produzir(prompt, oferta, pautas, cfg, est_anterior=None):
    """Escreve, valida (com 1 correção automática) e grava o rascunho."""
    saida, autor = escrever(prompt, cfg)
    meta, corpo, carrossel = separar(saida)
    erros, avisos, links, palavras = validar(meta, corpo, pautas)
    if erros:
        log("checagem reprovou, pedindo correção:", "; ".join(erros))
        fix = (prompt + "\n\n## SUA VERSÃO ANTERIOR FOI REPROVADA NA CHECAGEM\nProblemas:\n- " + "\n- ".join(erros) +
               "\n\nReescreva corrigindo isso, no mesmo formato de saída.\n\nVersão anterior:\n" + saida)
        saida, autor = escrever(fix, cfg)
        meta, corpo, carrossel = separar(saida)
        erros, avisos, links, palavras = validar(meta, corpo, pautas)
    if erros:
        raise RuntimeError("rascunho reprovado na checagem: " + "; ".join(erros))

    hoje = dt.date.today().isoformat()
    slug = slugify(meta["title"])
    if est_anterior and est_anterior.get("slug") != slug:
        for f in arquivos_do_post(est_anterior["slug"], est_anterior["arquivo"]):
            if os.path.exists(f):
                os.remove(f)
    conf = json.load(open(os.path.join(AQUI, "feeds.json"), encoding="utf-8"))
    categoria = meta.get("categoria") if meta.get("categoria") in CATEGORIAS else conf["ofertas"][oferta]["categoria"]
    tem_capa = fazer_capa(meta["title"], categoria, slug)
    md_path = os.path.join(BLOG_SRC, f"{hoje}-{slug}.md")
    open(md_path, "w", encoding="utf-8").write(montar_md(meta, corpo, oferta, hoje, slug, tem_capa))
    os.makedirs(SAIDAS, exist_ok=True)
    open(os.path.join(SAIDAS, f"{slug}-carrossel.txt"), "w", encoding="utf-8").write(carrossel or "(o Hermes não mandou carrossel)")
    est = {
        "arquivo": md_path, "slug": slug, "oferta": oferta, "categoria": categoria,
        "titulo": meta["title"], "description": meta["description"], "links": links,
        "palavras": palavras, "avisos": avisos, "autor_ia": autor, "prompt": prompt,
        "pautas": pautas, "criado": dt.datetime.now().isoformat(timespec="minutes"),
    }
    salvar_estado(est)
    return est


def cmd_gerar(a, cfg):
    if ler_estado():
        sys.exit("Já existe um rascunho pendente. Use publicar, refazer ou descartar antes.")
    if not a.sem_pull:
        git("pull", "--rebase", "--autostash", "origin", cfg["GIT_BRANCH"])
    conf = json.load(open(os.path.join(AQUI, "feeds.json"), encoding="utf-8"))
    oferta = a.oferta or conf["rotacao"][str(dt.date.today().weekday())]
    categoria = conf["ofertas"][oferta]["categoria"]
    log(f"oferta do dia: {oferta}")
    pautas, falhas = buscar_pautas(oferta, cfg)
    if falhas:
        log(f"{len(falhas)} feed(s) fora do ar: {'; '.join(falhas)}")
    if len(pautas) < 2:
        log("pouca pauta específica; usando as notícias de IA/negócios mais recentes")
        extra, _ = buscar_pautas("assistente-ia", cfg)
        pautas = (pautas + extra)[:8]
    if not pautas:
        msg = "Motor do blog: nenhuma notícia encontrada nos feeds hoje. Nada foi gerado."
        if not a.sem_telegram:
            tg_texto(cfg, msg)
        sys.exit(msg)
    log(f"{len(pautas)} pautas candidatas")
    try:
        est = produzir(montar_prompt(oferta, categoria, pautas), oferta, pautas, cfg)
    except Exception as e:
        if not a.sem_telegram:
            tg_texto(cfg, f"Motor do blog falhou hoje: {e}")
        raise
    log(f"rascunho pronto: {est['arquivo']}")
    if not a.sem_telegram:
        mandar_previa(cfg, est)


def cmd_refazer(a, cfg):
    est = ler_estado()
    if not est:
        sys.exit("Não tem rascunho pendente.")
    atual = open(est["arquivo"], encoding="utf-8").read()
    prompt = (est["prompt"] + "\n\n## AJUSTE PEDIDO PELO DONO DA VULTO\n" + a.comentario +
              "\n\nVersão atual (reescreva aplicando o ajuste, mesmo formato de saída):\n" + atual)
    novo = produzir(prompt, est["oferta"], est["pautas"], cfg, est_anterior=est)
    novo["prompt"] = est["prompt"]
    salvar_estado(novo)
    if not a.sem_telegram:
        mandar_previa(cfg, novo)


def cmd_publicar(a, cfg):
    est = ler_estado()
    if not est:
        sys.exit("Não tem rascunho pendente.")
    md = open(est["arquivo"], encoding="utf-8").read().replace("\ndraft: true\n", "\ndraft: false\n", 1)
    open(est["arquivo"], "w", encoding="utf-8").write(md)
    git("pull", "--rebase", "--autostash", "origin", cfg["GIT_BRANCH"])
    rodar_build()
    git("add", *arquivos_do_post(est["slug"], est["arquivo"]),
        "public/blog", "public/rss.xml", "public/blog-sitemap.xml")
    git("commit", "-m", f"post: {est['titulo']}\n\nGerado pelo motor do blog (Ultron + {est['autor_ia']}).")
    git("push", "origin", cfg["GIT_BRANCH"])
    url = f"{cfg['SITE_URL'].rstrip('/')}/blog/{os.path.splitext(os.path.basename(est['arquivo']))[0]}/"
    carrossel = ""
    cp = os.path.join(SAIDAS, f"{est['slug']}-carrossel.txt")
    if os.path.exists(cp):
        carrossel = "\n\nCARROSSEL PRO INSTAGRAM:\n\n" + open(cp, encoding="utf-8").read()
    salvar_estado({})
    tg_texto(cfg, f"Publicado (o Render leva ~1 min): {url}{carrossel}")


def cmd_descartar(a, cfg):
    est = ler_estado()
    if not est:
        sys.exit("Não tem rascunho pendente.")
    for f in arquivos_do_post(est["slug"], est["arquivo"]):
        if os.path.exists(f):
            os.remove(f)
    salvar_estado({})
    tg_texto(cfg, f"Rascunho descartado: {est['titulo']}")


def cmd_status(a, cfg):
    est = ler_estado()
    if not est:
        print("Sem rascunho pendente.")
    else:
        print(json.dumps({k: est[k] for k in ("titulo", "oferta", "categoria", "palavras", "avisos", "criado", "arquivo")}, ensure_ascii=False, indent=2))
    print("Último commit:", git("log", "-1", "--format=%h %s (%cr)"))


def cmd_auto(a, cfg):
    est = ler_estado()
    if not est:
        return print("Nada pendente.")
    if cfg["AUTO_PUBLICAR"].lower() != "true":
        return print("AUTO_PUBLICAR=false: o rascunho espera sua resposta.")
    if est.get("avisos"):
        tg_texto(cfg, "Não publiquei sozinho porque o rascunho tem avisos. Responda 'publica' se estiver ok.")
        return
    cmd_publicar(a, cfg)


def cmd_testar(a, cfg):
    ok = lambda b: "OK " if b else "-- "
    print("== Motor do blog: checagem ==")
    print(ok(os.path.exists(os.path.join(AQUI, ".env"))), "motor/.env")
    try:
        import PIL  # noqa
        print(ok(True), "Pillow (capa)")
    except ImportError:
        print(ok(False), "Pillow (capa) -> pip install pillow")
    conf = json.load(open(os.path.join(AQUI, "feeds.json"), encoding="utf-8"))
    vivos = 0
    for u in conf["feeds"]:
        try:
            n = len(ler_feed(u))
            vivos += 1
            print(ok(True), f"feed {u} ({n} itens)")
        except Exception as e:
            print(ok(False), f"feed {u} ({type(e).__name__})")
    print(f"   {vivos}/{len(conf['feeds'])} feeds funcionando")
    try:
        t = hermes('Responda só com a palavra: pronto', cfg) if cfg.get("HERMES_KEY") else ""
        print(ok("pronto" in t.lower()), f"Hermes respondeu: {t.strip()[:60]!r}")
    except Exception as e:
        print(ok(False), f"Hermes: {e}")
    if cfg.get("LLM_FALLBACK_URL"):
        try:
            print(ok(True), "plano B respondeu:", llm_reserva("Responda só: pronto", cfg).strip()[:40])
        except Exception as e:
            print(ok(False), f"plano B: {e}")
    try:
        r = tg("getMe", cfg)
        print(ok(bool(r and r.get("ok"))), "Telegram", (r or {}).get("result", {}).get("username", "(não configurado)"))
    except Exception as e:
        print(ok(False), f"Telegram: {e}")
    try:
        git("push", "--dry-run", "origin", cfg["GIT_BRANCH"])
        print(ok(True), "git push liberado")
    except Exception as e:
        print(ok(False), f"git push: {e}")


def main():
    ap = argparse.ArgumentParser(description="Motor do blog da Vulto")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gerar")
    g.add_argument("--oferta", choices=list(OFERTAS))
    g.add_argument("--sem-telegram", action="store_true")
    g.add_argument("--sem-pull", action="store_true")
    r = sub.add_parser("refazer")
    r.add_argument("comentario")
    r.add_argument("--sem-telegram", action="store_true")
    for c in ("publicar", "descartar", "status", "auto", "testar"):
        sub.add_parser(c)
    a = ap.parse_args()
    cfg = carregar_env()
    fn = globals()["cmd_" + a.cmd]
    if a.cmd in ("status", "testar"):
        return fn(a, cfg)
    with Trava():
        fn(a, cfg)


if __name__ == "__main__":
    main()
