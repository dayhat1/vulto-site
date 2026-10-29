#!/usr/bin/env python3
"""
Gera as ilustracoes editoriais do blog (SVG 1600x900) em content/blog/ilustracoes/svg/.
Depois cada SVG e renderizado para PNG e passado no tools/otimizar_imagem.py.

Sao ilustracoes conceituais (credito "Ilustração: Vulto"), nao fotos de fatos reais.
Para trocar por foto de banco (Unsplash/Pexels), veja content/blog/ilustracoes/LEIA.md.
"""
import os

W, H = 1600, 900
RED, SOFT, DEEP = "#e3172e", "#ff4a5c", "#5c0a14"
BG, SURF, SURF2, LINE, FG, MUTED = "#0b090a", "#151113", "#1d171a", "#2e2529", "#f1eaec", "#a8999e"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "svg")


def frame(inner, glow=(1150, 380), glow_r=620):
    gx, gy = glow
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <radialGradient id="bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1a1114"/><stop offset="1" stop-color="{BG}"/></radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="{RED}" stop-opacity=".55"/><stop offset=".55" stop-color="{RED}" stop-opacity=".12"/><stop offset="1" stop-color="{RED}" stop-opacity="0"/></radialGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2125"/><stop offset="1" stop-color="#120d0f"/></linearGradient>
  <linearGradient id="redg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{SOFT}"/><stop offset="1" stop-color="{RED}"/></linearGradient>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BG}" stop-opacity="0"/><stop offset="1" stop-color="{BG}" stop-opacity=".95"/></linearGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="{LINE}" stroke-width="1" opacity=".35"/></pattern>
  <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#000" flood-opacity=".7"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<rect width="{W}" height="{H}" fill="url(#grid)"/>
<circle cx="{gx}" cy="{gy}" r="{glow_r}" fill="url(#glow)"/>
{inner}
<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".09"/>
</svg>"""


def bubble(x, y, w, h, fill, tail="left", op=1):
    t = (f"M{x+14} {y+h} l-18 16 4-16z" if tail == "left" else f"M{x+w-14} {y+h} l18 16 -4-16z")
    return f'<g opacity="{op}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{fill}"/><path d="{t}" fill="{fill}"/></g>'


def lines(x, y, w, n, color=MUTED, gap=18, op=.55):
    out = []
    for i in range(n):
        ww = w * (0.92 if i < n - 1 else 0.55)
        out.append(f'<rect x="{x}" y="{y+i*gap}" width="{ww:.0f}" height="7" rx="3.5" fill="{color}" opacity="{op}"/>')
    return "".join(out)


def coin(cx, cy, r=34, op=1):
    return (f'<g opacity="{op}"><circle cx="{cx}" cy="{cy+6}" r="{r}" fill="{DEEP}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#redg)"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.72:.0f}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>'
            f'<text x="{cx}" y="{cy+r*0.3:.0f}" text-anchor="middle" font-family="Archivo, Arial Narrow, Arial" font-weight="800" font-size="{r*0.82:.0f}" fill="#fff">R$</text></g>')


def phone(x, y, w=380, h=720, rot=-8, content=""):
    return (f'<g transform="rotate({rot} {x+w/2} {y+h/2})" filter="url(#shadow)">'
            f'<rect x="{x-12}" y="{y-12}" width="{w+24}" height="{h+24}" rx="56" fill="#0f0b0d" stroke="{LINE}" stroke-width="2"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="44" fill="{SURF}"/>'
            f'<rect x="{x+w/2-50}" y="{y+16}" width="100" height="22" rx="11" fill="#0b090a"/>'
            f'{content}</g>')


# ---------------------------------------------------------------- 1. WhatsApp
def whatsapp_capa():
    px, py = 300, 90
    chat = (
        f'<rect x="{px}" y="{py}" width="380" height="96" rx="44" fill="{SURF2}"/>'
        f'<rect x="{px}" y="{py+60}" width="380" height="36" fill="{SURF2}"/>'
        f'<circle cx="{px+60}" cy="{py+66}" r="24" fill="{DEEP}"/>'
        + lines(px + 100, py + 56, 160, 2, FG, 16, .7)
        + bubble(px + 28, py + 140, 250, 74, SURF2)
        + lines(px + 50, py + 162, 200, 2)
        + bubble(px + 110, py + 250, 245, 92, "#3a1219", "right")
        + lines(px + 132, py + 272, 200, 3, FG, 18, .6)
        + bubble(px + 28, py + 380, 210, 60, SURF2)
        + lines(px + 50, py + 402, 160, 1)
        + bubble(px + 120, py + 470, 235, 92, "#3a1219", "right")
        + lines(px + 142, py + 492, 190, 3, FG, 18, .6)
        + bubble(px + 28, py + 600, 230, 60, SURF2)
        + lines(px + 50, py + 622, 170, 1)
    )
    flow = []
    pts = [(820, 300, 1), (930, 260, .95), (1040, 330, .9), (1150, 280, .85), (1260, 350, .8), (1360, 300, .75)]
    for i, (cx, cy, op) in enumerate(pts):
        flow.append(coin(cx, cy, 40 - i * 2, op))
    stack = "".join(coin(1250, 690 - i * 22, 58) for i in range(7))
    path = f'<path d="M700 330 C 800 330, 820 250, 900 260 S 1150 380, 1380 300" fill="none" stroke="{SOFT}" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" opacity=".7"/>'
    return frame(phone(px, py, content=chat) + path + "".join(flow) +
                 f'<ellipse cx="1250" cy="760" rx="120" ry="22" fill="#000" opacity=".6" filter="url(#soft)"/>' + stack,
                 glow=(1180, 420))


def whatsapp_interna():
    left = []
    import random
    random.seed(7)
    for i in range(22):
        x = 120 + random.random() * 420
        y = 150 + random.random() * 600
        w = 90 + random.random() * 70
        left.append(bubble(x, y, w, 44, SURF2, op=.35 + random.random() * .5))
    funnel = (f'<path d="M640 170 L980 170 L860 450 L860 730 L760 730 L760 450 Z" fill="url(#metal)" stroke="{LINE}" stroke-width="2" filter="url(#shadow)"/>'
              f'<path d="M640 170 L980 170" stroke="{SOFT}" stroke-width="4" opacity=".8"/>'
              f'<rect x="760" y="700" width="100" height="30" fill="{RED}" opacity=".35"/>')
    right = "".join(bubble(1080 + i * 40, 300 + i * 150, 260, 74, "#3a1219", "right") + lines(1104 + i * 40, 322 + i * 150, 200, 2, FG, 18, .6) for i in range(3))
    arrow = f'<path d="M880 600 C 960 600, 1000 520, 1060 470" fill="none" stroke="{SOFT}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>'
    return frame("".join(left) + funnel + arrow + right, glow=(1250, 450), glow_r=560)


# ---------------------------------------------------------------- 2. Agentes de IA
def agentes_capa():
    cx, cy = 800, 450
    traces = []
    import math
    for i in range(14):
        a = i / 14 * math.tau
        r1, r2 = 190, 330 + (i % 3) * 90
        x1, y1 = cx + math.cos(a) * r1, cy + math.sin(a) * r1
        xm, ym = cx + math.cos(a) * (r1 + 80), cy + math.sin(a) * (r1 + 80)
        x2, y2 = cx + math.cos(a) * r2, cy + math.sin(a) * r2 * 0.75
        traces.append(f'<path d="M{x1:.0f} {y1:.0f} L{xm:.0f} {ym:.0f} L{x2:.0f} {y2:.0f}" fill="none" stroke="{SOFT if i % 3 == 0 else '#5a474e'}" stroke-width="{3 if i % 3 == 0 else 2.2}" opacity="{.95 if i % 3 == 0 else .8}"/>')
        traces.append(f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="{10 if i % 3 == 0 else 7}" fill="{RED if i % 3 == 0 else SURF2}" stroke="{SOFT if i % 3 == 0 else '#5a474e'}" stroke-width="2"/>')
    pins = "".join(
        f'<rect x="{cx-150+i*30}" y="{cy-182}" width="10" height="26" rx="3" fill="{LINE}"/><rect x="{cx-150+i*30}" y="{cy+156}" width="10" height="26" rx="3" fill="{LINE}"/>'
        f'<rect x="{cx-182}" y="{cy-150+i*30}" width="26" height="10" rx="3" fill="{LINE}"/><rect x="{cx+156}" y="{cy-150+i*30}" width="26" height="10" rx="3" fill="{LINE}"/>'
        for i in range(11))
    chip = (f'<g filter="url(#shadow)"><rect x="{cx-160}" y="{cy-160}" width="320" height="320" rx="34" fill="url(#metal)" stroke="{LINE}" stroke-width="2"/></g>'
            f'<rect x="{cx-110}" y="{cy-110}" width="220" height="220" rx="22" fill="{BG}" stroke="{RED}" stroke-width="3"/>'
            f'<circle cx="{cx}" cy="{cy}" r="120" fill="{RED}" opacity=".35" filter="url(#blur)"/>'
            f'<circle cx="{cx}" cy="{cy}" r="46" fill="url(#redg)"/>'
            f'<circle cx="{cx}" cy="{cy}" r="74" fill="none" stroke="{SOFT}" stroke-width="2" opacity=".6"/>'
            f'<circle cx="{cx}" cy="{cy}" r="96" fill="none" stroke="{SOFT}" stroke-width="1.5" stroke-dasharray="4 10" opacity=".5"/>')
    return frame("".join(traces) + pins + chip, glow=(800, 450), glow_r=700)


def agentes_interna():
    # loja fechada a noite, com a tela do atendente acesa la dentro
    stars = "".join(f'<circle cx="{(i*137)%1600}" cy="{(i*61)%300+20}" r="{1.5 if i%3 else 2.4}" fill="{FG}" opacity="{.25 + (i%5)*.1}"/>' for i in range(60))
    moon = f'<circle cx="1320" cy="140" r="54" fill="{FG}" opacity=".9"/><circle cx="1342" cy="124" r="50" fill="#140d10"/>'
    street = f'<rect x="0" y="760" width="{W}" height="140" fill="#0e0a0c"/><rect x="0" y="756" width="{W}" height="4" fill="{LINE}"/>'
    shop = (f'<g filter="url(#shadow)"><rect x="380" y="250" width="840" height="510" fill="#130e10" stroke="{LINE}" stroke-width="2"/></g>'
            f'<rect x="360" y="215" width="880" height="64" fill="url(#metal)" stroke="{LINE}" stroke-width="2"/>'
            + "".join(f'<path d="M{360+i*88} 279 l44 34 l44-34z" fill="{DEEP if i%2 else "#2a1015"}"/>' for i in range(10))
            + f'<rect x="440" y="340" width="720" height="380" fill="#0b0809" stroke="{LINE}" stroke-width="3"/>'
            + "".join(f'<rect x="440" y="{340+i*30}" width="720" height="22" fill="#1b1416" opacity=".95"/>' for i in range(7))
            + f'<rect x="440" y="550" width="720" height="170" fill="#070506"/>'
            + f'<circle cx="800" cy="640" r="150" fill="{RED}" opacity=".45" filter="url(#blur)"/>'
            + f'<rect x="700" y="575" width="200" height="125" rx="12" fill="{SURF}" stroke="{SOFT}" stroke-width="3"/>'
            + bubble(718, 592, 120, 30, SURF2) + bubble(752, 634, 130, 30, "#3a1219", "right")
            + f'<rect x="785" y="700" width="30" height="18" fill="{LINE}"/>')
    return frame(stars + moon + shop + street, glow=(800, 620), glow_r=520)


# ---------------------------------------------------------------- 3. 5 minutos
def minutos_capa():
    import math
    cx, cy, r = 800, 480, 300
    ticks = []
    for i in range(60):
        a = i / 60 * math.tau - math.pi / 2
        l = 34 if i % 5 == 0 else 16
        x1, y1 = cx + math.cos(a) * (r - 22), cy + math.sin(a) * (r - 22)
        x2, y2 = cx + math.cos(a) * (r - 22 - l), cy + math.sin(a) * (r - 22 - l)
        ticks.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{SOFT if i <= 5 else MUTED}" stroke-width="{5 if i % 5 == 0 else 2.5}" stroke-linecap="round" opacity="{1 if i <= 5 else .55}"/>')
    a5 = 5 / 60 * math.tau - math.pi / 2
    ax, ay = cx + math.cos(a5) * (r - 70), cy + math.sin(a5) * (r - 70)
    arc_r = r - 70
    sx, sy = cx, cy - arc_r
    wedge = f'<path d="M{cx} {cy} L{sx} {sy} A{arc_r} {arc_r} 0 0 1 {ax:.1f} {ay:.1f} Z" fill="{RED}" opacity=".85"/>'
    hand = f'<line x1="{cx}" y1="{cy}" x2="{cx + math.cos(a5)*(r-60):.1f}" y2="{cy + math.sin(a5)*(r-60):.1f}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>'
    body = (f'<g filter="url(#shadow)"><circle cx="{cx}" cy="{cy}" r="{r+26}" fill="url(#metal)" stroke="{LINE}" stroke-width="3"/></g>'
            f'<rect x="{cx-36}" y="{cy-r-90}" width="72" height="70" rx="12" fill="url(#metal)" stroke="{LINE}" stroke-width="3"/>'
            f'<rect x="{cx-60}" y="{cy-r-110}" width="120" height="34" rx="12" fill="{RED}"/>'
            f'<g transform="rotate(40 {cx} {cy})"><rect x="{cx-20}" y="{cy-r-62}" width="40" height="50" rx="8" fill="url(#metal)" stroke="{LINE}" stroke-width="3"/></g>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{BG}" stroke="{LINE}" stroke-width="3"/>')
    motion = "".join(f'<path d="M{330 - i*40} {380 + i*55} H{470 - i*20}" stroke="{SOFT}" stroke-width="5" stroke-linecap="round" opacity="{.7 - i*.12}"/>' for i in range(5))
    center = f'<circle cx="{cx}" cy="{cy}" r="16" fill="#fff"/><circle cx="{cx}" cy="{cy}" r="6" fill="{RED}"/>'
    return frame(motion + body + wedge + "".join(ticks) + hand + center, glow=(820, 470), glow_r=640)


def minutos_interna():
    # Comparacao 5 min x 42 h (dados citados no post, fonte Rework/MIT)
    lab = 'font-family="IBM Plex Mono, DejaVu Sans Mono, monospace"'
    big = 'font-family="Archivo, Arial Narrow, Arial" font-weight="800"'
    x0 = 200
    rows = (
        f'<text x="{x0}" y="270" {lab} font-size="30" fill="{SOFT}" letter-spacing="3">JANELA QUE FECHA A VENDA</text>'
        f'<rect x="{x0}" y="300" width="1200" height="70" rx="12" fill="{SURF2}"/>'
        f'<rect x="{x0}" y="300" width="64" height="70" rx="12" fill="url(#redg)"/>'
        f'<text x="{x0+90}" y="352" {big} font-size="56" fill="{FG}">5 min</text>'
        f'<text x="{x0}" y="530" {lab} font-size="30" fill="{MUTED}" letter-spacing="3">TEMPO MÉDIO DE RESPOSTA (B2B)</text>'
        f'<rect x="{x0}" y="560" width="1200" height="70" rx="12" fill="{SURF2}"/>'
        f'<rect x="{x0}" y="560" width="1200" height="70" rx="12" fill="{MUTED}" opacity=".35"/>'
        f'<text x="{x0+1180}" y="612" text-anchor="end" {big} font-size="56" fill="{FG}">42 h</text>'
        f'<text x="{x0}" y="740" {lab} font-size="24" fill="{MUTED}" opacity=".8">Escala ilustrativa · dados: Rework / estudo MIT-InsideSales</text>'
    )
    return frame(rows, glow=(330, 330), glow_r=420)


# ---------------------------------------------------------------- 4. Pousada
def pousada_capa():
    # quadro de reservas em perspectiva, com duas reservas batendo no mesmo quarto
    cols, rws = 8, 6
    gx, gy, cw, rh = 0, 0, 132, 86
    cells = []
    for r in range(rws):
        for c in range(cols):
            cells.append(f'<rect x="{gx+c*cw}" y="{gy+r*rh}" width="{cw-6}" height="{rh-6}" rx="8" fill="{SURF if (r+c)%2 else SURF2}"/>')
    bars = [(0, 1, 3, "#3b2a2f"), (1, 4, 3, "#3b2a2f"), (2, 0, 2, "#3b2a2f"), (3, 5, 3, "#3b2a2f"), (4, 2, 4, "#3b2a2f"), (5, 5, 2, "#3b2a2f")]
    bar_svg = "".join(f'<rect x="{gx+c*cw+8}" y="{gy+r*rh+18}" width="{w*cw-22}" height="{rh-42}" rx="12" fill="{col}"/>' for r, c, w, col in bars)
    clash = (f'<rect x="{gx+2*cw+8}" y="{gy+2*rh+12}" width="{4*cw-22}" height="{rh-40}" rx="12" fill="{RED}" opacity=".95"/>'
             f'<rect x="{gx+4*cw+8}" y="{gy+2*rh+30}" width="{3*cw-22}" height="{rh-40}" rx="12" fill="{SOFT}" opacity=".85" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>'
             f'<rect x="{gx+4*cw+2}" y="{gy+2*rh+4}" width="{2*cw-10}" height="{rh-4}" rx="10" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 8"/>')
    board = (f'<g transform="translate(360 190) skewX(-14) scale(1 .92)" filter="url(#shadow)">'
             f'<rect x="-30" y="-30" width="{cols*cw+54}" height="{rws*rh+54}" rx="22" fill="#0f0b0d" stroke="{LINE}" stroke-width="2"/>'
             + "".join(cells) + bar_svg + clash + "</g>")
    warn = (f'<g transform="translate(1110 215)"><circle r="62" fill="{RED}"/><circle r="62" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3"/>'
            f'<rect x="-7" y="-34" width="14" height="40" rx="7" fill="#fff"/><circle cy="24" r="8" fill="#fff"/></g>')
    keys = "".join(
        f'<g transform="translate({240 + i*70} 760) rotate({-8 + i*4})"><circle r="20" fill="none" stroke="{MUTED}" stroke-width="6" opacity=".7"/><rect x="-4" y="18" width="8" height="54" rx="3" fill="{MUTED}" opacity=".7"/><rect x="4" y="54" width="14" height="7" fill="{MUTED}" opacity=".7"/></g>'
        for i in range(3))
    return frame(board + warn + keys, glow=(900, 400), glow_r=640)


def pousada_interna():
    # caderno rabiscado x tablet com grade limpa
    note = (f'<g transform="rotate(-6 470 470)" filter="url(#shadow)"><rect x="170" y="170" width="600" height="600" rx="14" fill="#e9e1d4"/>'
            + "".join(f'<line x1="200" y1="{240+i*46}" x2="740" y2="{240+i*46}" stroke="#b9c7d6" stroke-width="2"/>' for i in range(11))
            + f'<line x1="250" y1="180" x2="250" y2="760" stroke="#e08a8a" stroke-width="3"/>'
            + "".join(f'<path d="M280 {228+i*46} q 40 -18 80 0 t 80 0 t 80 0 t {60+ (i%3)*30} 0" fill="none" stroke="#3b3a55" stroke-width="4" stroke-linecap="round" opacity=".8"/>' for i in range(9))
            + f'<path d="M300 452 q 140 -40 300 10" fill="none" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>'
            + f'<path d="M300 470 q 140 30 300 -6" fill="none" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>'
            + "</g>")
    tab = (f'<g transform="rotate(5 1170 470)" filter="url(#shadow)"><rect x="880" y="190" width="600" height="560" rx="36" fill="#0f0b0d" stroke="{LINE}" stroke-width="2"/>'
           f'<rect x="908" y="218" width="544" height="504" rx="18" fill="{SURF}"/>'
           + "".join(f'<rect x="{930+c*86}" y="{250+r*78}" width="78" height="70" rx="8" fill="{SURF2}"/>' for r in range(6) for c in range(6))
           + f'<rect x="930" y="268" width="250" height="34" rx="10" fill="{RED}" opacity=".9"/>'
           + f'<rect x="1102" y="424" width="250" height="34" rx="10" fill="{RED}" opacity=".7"/>'
           + f'<rect x="1016" y="580" width="164" height="34" rx="10" fill="{SOFT}" opacity=".8"/>'
           + "</g>")
    return frame(note + tab, glow=(1180, 470), glow_r=520)


# ---------------------------------------------------------------- 5. Impulsionar
def impulsionar_capa():
    import math
    btn = (f'<g filter="url(#shadow)"><ellipse cx="560" cy="640" rx="300" ry="90" fill="#0f0b0d" stroke="{LINE}" stroke-width="3"/>'
           f'<path d="M300 610 v-40 a260 70 0 0 0 520 0 v40 a260 70 0 0 1 -520 0z" fill="{DEEP}"/>'
           f'<ellipse cx="560" cy="570" rx="260" ry="70" fill="url(#redg)"/>'
           f'<ellipse cx="520" cy="550" rx="160" ry="28" fill="#fff" opacity=".18"/></g>')
    hearts = []
    for i in range(12):
        x = 820 + (i % 4) * 150 + (i // 4) * 40
        y = 520 - (i // 4) * 150 - (i % 2) * 40
        s = 1.1 - (i // 4) * .25
        op = .95 - (i // 4) * .28
        hearts.append(f'<g transform="translate({x} {y}) scale({s:.2f})" opacity="{op:.2f}"><path d="M0 18 C -30 -6, -24 -34, 0 -18 C 24 -34, 30 -6, 0 18z" fill="{SOFT}"/></g>')
    notes = []
    for i in range(7):
        x = 520 + i * 60
        y = 430 - i * 55
        rot = -20 + i * 9
        op = .9 - i * .11
        notes.append(f'<g transform="translate({x} {y}) rotate({rot})" opacity="{op:.2f}"><rect x="-55" y="-28" width="110" height="56" rx="6" fill="#2c3b2f"/><rect x="-45" y="-18" width="90" height="36" rx="4" fill="none" stroke="#7fa287" stroke-width="2"/><circle r="11" fill="none" stroke="#7fa287" stroke-width="2"/></g>')
    cart = (f'<g transform="translate(1310 690)" opacity=".75"><path d="M-70 -50 h24 l26 90 h96 l22 -66 h-130" fill="none" stroke="{MUTED}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>'
            f'<circle cx="-12" cy="62" r="11" fill="{MUTED}"/><circle cx="66" cy="62" r="11" fill="{MUTED}"/>'
            f'<text x="10" y="-78" text-anchor="middle" font-family="Archivo, Arial" font-weight="800" font-size="52" fill="{MUTED}">0 vendas</text></g>')
    return frame(btn + "".join(notes) + "".join(hearts) + cart, glow=(560, 560), glow_r=560)


def impulsionar_interna():
    # duas rotas: curtida (larga e vazia) x conversa qualificada (estreita e cheia)
    lab = 'font-family="IBM Plex Mono, DejaVu Sans Mono, monospace"'
    top = (f'<text x="140" y="250" {lab} font-size="28" fill="{MUTED}" letter-spacing="3">IMPULSIONAR</text>'
           f'<path d="M140 290 H1300 L1460 340 L1300 390 H140 Z" fill="{SURF2}"/>'
           + "".join(f'<g transform="translate({220+i*120} 340)" opacity="{.9 - i*.07:.2f}"><path d="M0 14 C -24 -5, -19 -27, 0 -14 C 19 -27, 24 -5, 0 14z" fill="{MUTED}"/></g>' for i in range(10)))
    bot = (f'<text x="140" y="560" {lab} font-size="28" fill="{SOFT}" letter-spacing="3">CAMPANHA POR OBJETIVO</text>'
           f'<path d="M140 600 H1300 L1460 650 L1300 700 H140 Z" fill="#2a0f15"/>'
           + "".join(bubble(220 + i * 270, 622, 170, 52, "#4a1520", "right") for i in range(4))
           + f'<circle cx="1390" cy="650" r="36" fill="url(#redg)"/><path d="M1374 650 l12 12 l22 -26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>')
    return frame(top + bot, glow=(1300, 650), glow_r=480)


PECAS = {
    "whatsapp-cobranca": whatsapp_capa,
    "whatsapp-filtro": whatsapp_interna,
    "agentes-ia": agentes_capa,
    "agentes-loja-noite": agentes_interna,
    "cinco-minutos": minutos_capa,
    "cinco-minutos-comparacao": minutos_interna,
    "pousada-reservas": pousada_capa,
    "pousada-caderno-sistema": pousada_interna,
    "impulsionar": impulsionar_capa,
    "impulsionar-rotas": impulsionar_interna,
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for nome, fn in PECAS.items():
        with open(os.path.join(OUT, nome + ".svg"), "w", encoding="utf-8") as f:
            f.write(fn())
    print(f"{len(PECAS)} SVGs em {OUT}")
