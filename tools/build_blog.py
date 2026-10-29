#!/usr/bin/env python3
"""
Gera o blog da Vulto em HTML estatico a partir de content/blog/*.md.
Sem dependencias externas: Python 3.8+ puro.

Uso:
    python3 tools/build_blog.py

Saida:
    public/blog/index.html              -> home do blog (manchete + grade + filtro)
    public/blog/<slug>/index.html       -> cada post
    public/rss.xml                      -> feed RSS
    public/blog-sitemap.xml             -> sitemap do blog

Frontmatter de um post:
    ---
    title: "Titulo de noticia"
    description: "Linha fina, ate 160 caracteres."
    date: 2026-10-29
    oferta: "meta-ads"        # meta-ads | salestack | lobby | assistente-ia | mvp | shopify | seguranca
    categoria: "Mercado"      # Mercado | IA | Vendas | Marketing | Negocios | Seguranca
    autor: "Redação Vulto"
    cta: "Quero meu diagnostico gratis"
    cover: "/img/blog/minha-capa.webp"
    cover_alt: "Descricao real do que aparece na imagem"
    cover_credito: "Foto: Nome / Unsplash"
    cover_link: "https://unsplash.com/photos/..."
    draft: false
    ---

Imagem no meio do texto (vira <figure> com legenda e credito):
    ![Legenda da foto](/img/blog/arquivo.webp "Foto: Nome / Pexels | https://link-do-autor")

Citacao em destaque (com autor opcional depois de " -- "):
    > Frase de impacto -- Nome, Veiculo

Publicar: crie o .md, rode este script, faca commit do .md + public/ gerado.
Imagens: use tools/otimizar_imagem.py para gerar os WebP nos tamanhos certos.
"""

import html
import json
import math
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

# ----- config -----
SITE = "https://vulto.tech"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "content", "blog")
PUB = os.path.join(ROOT, "public")
OUT = os.path.join(PUB, "blog")
DEFAULT_OG = "/img/og.jpg"
ASSET_V = "4"  # mude para forcar o navegador a baixar CSS/JS novos

OFERTAS = {
    "meta-ads": ("Gestão de Meta Ads", "Anúncio que traz conversa de venda, não curtida. Auditoria grátis da sua conta."),
    "salestack": ("SaleStack: prospecção automática", "Um sistema que acha clientes do seu nicho e manda a primeira mensagem por você."),
    "lobby": ("LOBBY: sistema para pousadas", "Reservas, governança e fiscal numa tela só, feito para pousadas pequenas."),
    "assistente-ia": ("Atendente com IA no WhatsApp", "Responde, agenda e lembra o cliente 24 horas, com o seu jeito de falar."),
    "mvp": ("SaaS e MVP sob medida", "Sua ideia virando produto no ar, sem montar time de desenvolvimento."),
    "shopify": ("Loja Shopify que converte", "Loja montada para vender, pronta para rodar anúncio."),
    "seguranca": ("Auditoria de segurança", "A gente acha a brecha antes do invasor achar."),
}

MESES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]
MESES_CURTO = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def esc(s):
    return html.escape(s or "", quote=True)


# ----- tamanho de imagem sem Pillow (WebP / PNG / JPEG) -----
def img_size(web_path):
    if not web_path or not web_path.startswith("/"):
        return None
    path = os.path.join(PUB, web_path.lstrip("/"))
    try:
        with open(path, "rb") as f:
            h = f.read(64)
            if h[:4] == b"RIFF" and h[8:12] == b"WEBP":
                kind = h[12:16]
                if kind == b"VP8 ":
                    return (int.from_bytes(h[26:28], "little") & 0x3FFF, int.from_bytes(h[28:30], "little") & 0x3FFF)
                if kind == b"VP8L":
                    bits = int.from_bytes(h[21:25], "little")
                    return ((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1)
                if kind == b"VP8X":
                    return (int.from_bytes(h[24:27], "little") + 1, int.from_bytes(h[27:30], "little") + 1)
            if h[:8] == b"\x89PNG\r\n\x1a\n":
                return (int.from_bytes(h[16:20], "big"), int.from_bytes(h[20:24], "big"))
            if h[:2] == b"\xff\xd8":
                f.seek(2)
                while True:
                    m = f.read(2)
                    if len(m) < 2 or m[0] != 0xFF:
                        return None
                    if m[1] in (0xC0, 0xC1, 0xC2):
                        f.read(3)
                        hh = int.from_bytes(f.read(2), "big")
                        ww = int.from_bytes(f.read(2), "big")
                        return (ww, hh)
                    f.seek(int.from_bytes(f.read(2), "big") - 2, 1)
    except OSError:
        return None
    return None


def small_variant(web_path):
    """Retorna o caminho da versao -800 se ela existir (para srcset no celular)."""
    if not web_path:
        return None
    base, ext = os.path.splitext(web_path)
    cand = f"{base}-800{ext}"
    return cand if os.path.exists(os.path.join(PUB, cand.lstrip("/"))) else None


def img_tag(src, alt, cls="", eager=False, sizes="(max-width: 760px) 100vw, 1120px", vt=None):
    size = img_size(src)
    attrs = [f'src="{esc(src)}"', f'alt="{esc(alt)}"']
    small = small_variant(src)
    if small and size:
        attrs.append(f'srcset="{esc(small)} 800w, {esc(src)} {size[0]}w"')
        attrs.append(f'sizes="{sizes}"')
    if size:
        attrs.append(f'width="{size[0]}" height="{size[1]}"')
    if eager:
        attrs.append('fetchpriority="high" decoding="async"')
    else:
        attrs.append('loading="lazy" decoding="async"')
    if cls:
        attrs.append(f'class="{cls}"')
    if vt:
        attrs.append(f'style="view-transition-name:{vt}"')
    return "<img " + " ".join(attrs) + ">"


def credit_html(credito, link):
    if not credito:
        return ""
    inner = f'<a href="{esc(link)}" target="_blank" rel="noopener">{esc(credito)}</a>' if link else esc(credito)
    return f'<span class="credito">{inner}</span>'


# ----- frontmatter + markdown -----
def parse_post(path):
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if not m:
        raise ValueError(f"{path}: frontmatter ausente")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" not in line or line.strip().startswith("#"):
            continue
        k, v = line.split(":", 1)
        v = v.split(" #")[0].strip() if not v.strip().startswith('"') else v.strip()
        meta[k.strip()] = v.strip().strip('"').strip("'")
    body_md = m.group(2).strip()
    meta["body_html"], meta["links"] = md_to_html(body_md)
    meta["slug"] = os.path.splitext(os.path.basename(path))[0]
    meta.setdefault("cta", "Quero meu diagnóstico grátis")
    meta.setdefault("autor", "Redação Vulto")
    meta.setdefault("categoria", "Negócios")
    meta["draft"] = str(meta.get("draft", "false")).lower() == "true"
    words = len(re.findall(r"\w+", re.sub(r"[#>*\[\]()!]", " ", body_md)))
    meta["minutos"] = max(1, math.ceil(words / 220))
    return meta


def md_to_html(md):
    out, lst, links = [], [], []

    def inline(text):
        text = html.escape(text, quote=False)

        def link(m):
            label, url = m.group(1), m.group(2)
            if url.startswith("http"):
                links.append((label, url))
                return f'<a href="{url}" target="_blank" rel="noopener">{label}</a>'
            return f'<a href="{url}">{label}</a>'

        text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, text)
        text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
        text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
        return text

    def flush():
        if lst:
            out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in lst) + "</ul>")
            lst.clear()

    for line in md.splitlines():
        s = line.strip()
        if not s:
            flush()
            continue
        img = re.match(r'^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$', s)
        if img:
            flush()
            alt, src, extra = img.group(1), img.group(2), img.group(3) or ""
            cred, _, clink = extra.partition("|")
            out.append(
                f'<figure><div class="frame">{img_tag(src, alt, sizes="(max-width: 760px) 100vw, 720px")}</div>'
                f"<figcaption><span>{inline(alt)}</span>{credit_html(cred.strip(), clink.strip())}</figcaption></figure>"
            )
        elif s.startswith("### "):
            flush(); out.append(f"<h3>{inline(s[4:])}</h3>")
        elif s.startswith("## "):
            flush(); out.append(f"<h2>{inline(s[3:])}</h2>")
        elif s.startswith("> "):
            flush()
            quote, _, who = s[2:].partition(" -- ")
            cite = f"<cite>{inline(who)}</cite>" if who else ""
            out.append(f"<blockquote>{inline(quote)}{cite}</blockquote>")
        elif s.startswith("- "):
            lst.append(s[2:])
        else:
            flush(); out.append(f"<p>{inline(s)}</p>")
    flush()
    # fontes unicas, na ordem em que aparecem
    seen, uniq = set(), []
    for label, url in links:
        if url not in seen:
            seen.add(url)
            uniq.append((label, url))
    return "\n".join(out), uniq


def parse_date(iso):
    try:
        return datetime.fromisoformat(iso)
    except ValueError:
        return datetime.strptime(iso, "%Y-%m-%d")


def data_longa(dt):
    return f"{dt.day:02d} de {MESES[dt.month]} de {dt.year}"


def data_curta(dt):
    return f"{dt.day} {MESES_CURTO[dt.month]} {dt.year}"


def vt_name(prefix, slug):
    return prefix + "-" + re.sub(r"[^a-z0-9-]", "", slug.lower())


def og_image(p):
    if p.get("cover"):
        base, _ = os.path.splitext(p["cover"])
        og = f"{base}-og.jpg"
        if os.path.exists(os.path.join(PUB, og.lstrip("/"))):
            return og
    return DEFAULT_OG


# ----- template -----
def head(title, desc, canonical, ogtype, og, schema="", preload=""):
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0b090a">
<link rel="canonical" href="{canonical}">
<link rel="alternate" type="application/rss+xml" title="Blog da Vulto" href="/rss.xml">
<meta property="og:type" content="{ogtype}">
<meta property="og:site_name" content="Vulto">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}{og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
{preload}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="/css/vulto.css?v={ASSET_V}">
<link rel="stylesheet" href="/css/blog.css?v={ASSET_V}">
{schema}
</head>
<body>
<header class="nav"><div class="wrap">
  <a class="mark" href="/" aria-label="Vulto, início"><img src="/img/vulto-nome.jpg" alt="Vulto" width="708" height="300"></a>
  <nav class="nav-links" aria-label="Seções">
    <a href="/#como-funciona">Como funciona</a>
    <a href="/#precos">Preços</a>
    <a href="/blog/" aria-current="page">Blog</a>
    <a class="btn btn-red" data-wa="Oi! Quero o diagnóstico grátis da Vulto." href="https://wa.me/5521951001137">Falar no WhatsApp</a>
  </nav>
</div></header>
"""


FOOT = f"""<footer><div class="wrap">
  <a class="mark" href="/" aria-label="Vulto, início"><img src="/img/vulto-nome.jpg" alt="Vulto" width="708" height="300" loading="lazy"></a>
  <nav aria-label="Rodapé">
    <a href="https://instagram.com/vulto.tech">@vulto.tech</a>
    <a href="/blog/">Blog</a>
    <a href="/rss.xml">RSS</a>
    <a href="/#precos">Preços</a>
  </nav>
  <p class="privacy">© <span id="ano">2026</span> Vulto.tech · Conteúdo próprio. Imagens com crédito de seus autores.</p>
</div></footer>
<script src="/js/vulto.js?v={ASSET_V}" defer></script>
</body></html>
"""


def card(p, cls="post-card", heading="h3", sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 360px", eager=False, vt=True):
    dt = parse_date(p["date"])
    thumb = ""
    if p.get("cover"):
        thumb = f'<div class="thumb">{img_tag(p["cover"], p.get("cover_alt", ""), sizes=sizes, eager=eager, vt=vt_name("img", p["slug"]) if vt else None)}</div>'
    vt_t = f' style="view-transition-name:{vt_name("t", p["slug"])}"' if vt else ""
    return (
        f'<a class="{cls}" href="/blog/{p["slug"]}/" data-cat="{esc(p["categoria"])}">'
        f"{thumb}"
        f'<div class="card-body"><span class="chip">{esc(p["categoria"])}</span>'
        f'<{heading}{vt_t}>{esc(p["title"])}</{heading}>'
        f'<p>{esc(p["description"])}</p>'
        f'<span class="card-meta">{data_curta(dt)} · {p["minutos"]} min de leitura</span></div></a>'
    )


def related_for(p, posts):
    others = [o for o in posts if o["slug"] != p["slug"]]
    score = lambda o: (o["categoria"] == p["categoria"]) * 2 + (o.get("oferta") == p.get("oferta"))
    others.sort(key=lambda o: (score(o), o["date"]), reverse=True)
    return others[:3]


def render_post(p, posts):
    dt = parse_date(p["date"])
    canonical = f"{SITE}/blog/{p['slug']}/"
    og = og_image(p)
    schema_obj = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": p["title"],
        "description": p["description"],
        "datePublished": dt.replace(tzinfo=timezone.utc).isoformat(),
        "author": {"@type": "Organization", "name": p["autor"]},
        "publisher": {"@type": "Organization", "name": "Vulto", "logo": {"@type": "ImageObject", "url": f"{SITE}/img/vulto-nome.jpg"}},
        "image": [f"{SITE}{p['cover']}"] if p.get("cover") else [f"{SITE}{DEFAULT_OG}"],
        "mainEntityOfPage": canonical,
        "articleSection": p["categoria"],
    }
    schema = '<script type="application/ld+json">' + json.dumps(schema_obj, ensure_ascii=False) + "</script>"
    preload = ""
    if p.get("cover"):
        small = small_variant(p["cover"])
        if small:
            preload = f'<link rel="preload" as="image" href="{esc(p["cover"])}" imagesrcset="{esc(small)} 800w, {esc(p["cover"])} 1600w" imagesizes="(max-width: 760px) 100vw, 1120px">\n'

    cover = ""
    if p.get("cover"):
        cover = (
            f'<figure class="cover"><div class="frame">'
            f'{img_tag(p["cover"], p.get("cover_alt", ""), eager=True, vt=vt_name("img", p["slug"]))}</div>'
            f'<figcaption><span>{esc(p.get("cover_alt", ""))}</span>{credit_html(p.get("cover_credito"), p.get("cover_link"))}</figcaption></figure>'
        )

    sources = ""
    if p["links"]:
        items = "".join(
            f'<li><a href="{esc(u)}" target="_blank" rel="noopener">{l}</a><span class="dom">{esc(urlparse(u).netloc.replace("www.", ""))}</span></li>'
            for l, u in p["links"]
        )
        sources = f'<aside class="sources" aria-label="Fontes"><h2>Fontes</h2><ol>{items}</ol></aside>'

    offer = ""
    if p.get("oferta") in OFERTAS:
        nome, resumo = OFERTAS[p["oferta"]]
        offer = (
            f'<div class="offer-box"><p class="eyebrow">Conheça</p><h3>{esc(nome)}</h3><p>{esc(resumo)}</p>'
            f'<a class="btn btn-ghost" data-wa="Oi! Li o post no blog e quero saber mais de {esc(nome)}." href="https://wa.me/5521951001137">Quero saber mais</a></div>'
        )

    rel = related_for(p, posts)
    related = ""
    if rel:
        related = (
            '<section class="related wrap" aria-label="Leia também"><h2>Leia também</h2><div class="related-grid">'
            + "".join(card(o, cls="related-card", vt=False, sizes="(max-width: 860px) 100vw, 360px") for o in rel)
            + "</div></section>"
        )

    body = f"""<div class="read-progress" aria-hidden="true"><span></span></div>
<main class="blog">
<article class="post">
  <div class="wrap narrow">
    <a class="back" href="/blog/">← todos os posts</a>
    <header class="post-head">
      <div class="kicker"><span class="cat">{esc(p['categoria'])}</span><span class="sep"></span><span class="brand-tag">Conteúdo Vulto</span></div>
      <h1 style="view-transition-name:{vt_name('t', p['slug'])}">{esc(p['title'])}</h1>
      <p class="dek">{esc(p['description'])}</p>
      <div class="byline">Por <b>{esc(p['autor'])}</b><span class="dot"></span><time datetime="{dt.date().isoformat()}">{data_longa(dt)}</time><span class="dot"></span><span>{p['minutos']} min de leitura</span></div>
    </header>
  </div>
  {cover}
  <div class="wrap narrow">
    <div class="body">
{p['body_html']}
    </div>
    {sources}
    {offer}
    <div class="cta-box">
      <h2>{esc(p['cta'])}</h2>
      <p>15 minutos no WhatsApp. Sem compromisso.</p>
      <a class="btn btn-red" data-wa="Oi! {esc(p['cta'])}" href="https://wa.me/5521951001137">Chamar agora</a>
    </div>
  </div>
</article>
{related}
</main>
"""
    return head(esc(p["title"]) + " · Vulto", esc(p["description"]), canonical, "article", og, schema, preload) + body + FOOT


def render_index(posts):
    cats = []
    for p in posts:
        if p["categoria"] not in cats:
            cats.append(p["categoria"])
    lead, rest = (posts[0], posts[1:]) if posts else (None, [])
    lead_html = card(lead, cls="lead-story", heading="h2", eager=True, sizes="(max-width: 860px) 100vw, 620px") if lead else '<p class="muted">Primeiro post sai em breve.</p>'
    filters = ""
    if len(cats) > 1:
        filters = '<div class="filters" role="group" aria-label="Filtrar por categoria"><button type="button" data-filter="todas" aria-pressed="true">Todas</button>' + "".join(
            f'<button type="button" data-filter="{esc(c)}" aria-pressed="false">{esc(c)}</button>' for c in cats
        ) + "</div>"
    grid = '<div class="grid">' + "".join(card(p) for p in rest) + "</div>" if rest else ""
    body = f"""<main class="blog"><div class="wrap">
  <header class="blog-head">
    <p class="eyebrow">Um post novo todo dia</p>
    <h1>Blog da Vulto</h1>
    <p>Tecnologia, IA, anúncios e vendas explicados para quem toca um negócio. Sem enrolação.</p>
  </header>
  {lead_html}
  {filters}
  {grid}
</div></main>
"""
    return head("Blog · Vulto", "Tecnologia, IA, anúncios e vendas para quem toca um negócio. Um post novo todo dia.",
                f"{SITE}/blog/", "website", DEFAULT_OG) + body + FOOT


def render_rss(posts):
    items = []
    for p in posts:
        dt = parse_date(p["date"]).replace(tzinfo=timezone.utc)
        enclosure = ""
        if p.get("cover"):
            enclosure = f'<enclosure url="{SITE}{esc(p["cover"])}" type="image/webp" length="0"/>'
        items.append(
            f"<item><title>{esc(p['title'])}</title>"
            f"<link>{SITE}/blog/{p['slug']}/</link>"
            f"<guid>{SITE}/blog/{p['slug']}/</guid>"
            f"<category>{esc(p['categoria'])}</category>"
            f"<pubDate>{dt.strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>"
            f"<description>{esc(p['description'])}</description>{enclosure}</item>"
        )
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
            f"<title>Blog da Vulto</title><link>{SITE}/blog/</link>"
            "<description>Tecnologia, IA, anúncios e vendas.</description><language>pt-BR</language>"
            + "".join(items) + "</channel></rss>\n")


def render_sitemap(posts):
    urls = [(f"{SITE}/blog/", None)] + [(f"{SITE}/blog/{p['slug']}/", parse_date(p["date"]).date().isoformat()) for p in posts]
    body = "".join(f"<url><loc>{u}</loc>" + (f"<lastmod>{d}</lastmod>" if d else "") + "</url>" for u, d in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + body + "</urlset>\n")


def main():
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".md")) if os.path.isdir(SRC) else []
    posts = [parse_post(os.path.join(SRC, f)) for f in files]
    posts = [p for p in posts if not p["draft"]]
    # mais novo primeiro; no mesmo dia, o slug decide (estavel)
    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)

    os.makedirs(OUT, exist_ok=True)
    for p in posts:
        d = os.path.join(OUT, p["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(render_post(p, posts))
        if p.get("cover") and not img_size(p["cover"]):
            print(f"  aviso: capa nao encontrada para {p['slug']}: {p['cover']}")

    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(render_index(posts))
    with open(os.path.join(PUB, "rss.xml"), "w", encoding="utf-8") as f:
        f.write(render_rss(posts))
    with open(os.path.join(PUB, "blog-sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(render_sitemap(posts))
    print(f"blog gerado: {len(posts)} post(s) -> public/blog/")


if __name__ == "__main__":
    main()
