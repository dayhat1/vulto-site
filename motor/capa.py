#!/usr/bin/env python3
"""
Capa automatica de post: arte da marca com categoria + titulo (estilo card de manchete).
Requer Pillow. Fontes (OFL) em motor/fonts/.

Uso direto (teste):
    python3 motor/capa.py "Titulo do post" "Categoria" saida.png
"""
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
F_DISPLAY = os.path.join(AQUI, "fonts", "Archivo-Variable.ttf")
F_MONO = os.path.join(AQUI, "fonts", "IBMPlexMono-Medium.ttf")

W, H = 1600, 900
BG = (11, 9, 10)
RED = (227, 23, 46)
SOFT = (255, 74, 92)
FG = (241, 234, 236)
MUTED = (168, 153, 158)
LINE = (46, 37, 41)


def display(size, weight=850, width=72):
    f = ImageFont.truetype(F_DISPLAY, size)
    try:
        f.set_variation_by_axes([weight, width])
    except Exception:
        pass
    return f


def quebrar(draw, texto, fonte, largura_max):
    linhas, atual = [], ""
    for p in texto.split():
        teste = (atual + " " + p).strip()
        if draw.textlength(teste, font=fonte) <= largura_max:
            atual = teste
        else:
            if atual:
                linhas.append(atual)
            atual = p
    if atual:
        linhas.append(atual)
    return linhas


def gerar_capa(titulo, categoria, saida, semente=None):
    rnd = random.Random(semente or titulo)
    img = Image.new("RGB", (W, H), BG)

    # brilho vermelho (o "vulto") no lado direito
    glow = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(glow)
    cx, cy = 1250 + rnd.randint(-40, 40), 430 + rnd.randint(-40, 40)
    for r, a in ((520, 40), (380, 70), (250, 110)):
        g.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(int(RED[0] * a / 255) + 11, 9 + int(RED[1] * a / 255), 10 + int(RED[2] * a / 255)))
    glow = glow.filter(ImageFilter.GaussianBlur(110))
    img = Image.blend(img, glow, 1.0)

    d = ImageDraw.Draw(img, "RGBA")
    # grade fina
    for x in range(0, W, 40):
        d.line((x, 0, x, H), fill=LINE + (70,), width=1)
    for y in range(0, H, 40):
        d.line((0, y, W, y), fill=LINE + (70,), width=1)

    # aneis orbitando o vulto
    for i, (rx, ry, al) in enumerate(((330, 120, 150), (430, 160, 70))):
        bb = (cx - rx, cy - ry, cx + rx, cy + ry)
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse(bb, outline=SOFT + (al,), width=3 if i == 0 else 2)
        ring = ring.rotate(-18 + i * 30, center=(cx, cy), resample=Image.BICUBIC)
        img.paste(ring, (0, 0), ring)
    d = ImageDraw.Draw(img, "RGBA")
    core_r = 120
    d.ellipse((cx - core_r, cy - core_r, cx + core_r, cy + core_r), fill=(20, 12, 14, 255), outline=RED + (255,), width=6)
    d.ellipse((cx - 44, cy - 44, cx + 44, cy + 44), fill=SOFT + (255,))

    # particulas
    for _ in range(140):
        x, y = rnd.randint(0, W), rnd.randint(0, H)
        s = rnd.choice((1, 1, 2, 2, 3))
        d.ellipse((x, y, x + s, y + s), fill=SOFT + (rnd.randint(40, 160),))

    # escurece a coluna do texto pra leitura
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for x in range(0, 1100):
        a = int(200 * max(0.0, 1 - x / 1100) ** 1.4)
        sd.line((x, 0, x, H), fill=BG + (a,))
    img.paste(shade, (0, 0), shade)
    d = ImageDraw.Draw(img, "RGBA")

    # categoria + selo
    mono = ImageFont.truetype(F_MONO, 30)
    cat = categoria.upper()
    d.text((96, 118), " ".join(cat), font=mono, fill=SOFT)
    d.rectangle((96, 168, 96 + 80, 174), fill=RED)

    # titulo: tenta tamanhos ate caber em no maximo 5 linhas
    largura = 880
    for tam in (104, 96, 88, 80, 72, 64):
        f = display(tam)
        linhas = quebrar(d, titulo.upper(), f, largura)
        if len(linhas) <= 5:
            break
    y = 214
    for ln in linhas:
        d.text((96, y), ln, font=f, fill=FG)
        y += int(tam * 0.98)

    # assinatura
    d.text((96, H - 104), "VULTO.TECH  /  BLOG", font=ImageFont.truetype(F_MONO, 26), fill=MUTED)

    # grao
    noise = Image.effect_noise((W, H), 28).convert("L")
    img = Image.composite(Image.new("RGB", (W, H), (255, 255, 255)), img, noise.point(lambda v: 9 if v > 150 else 0))
    img.save(saida)
    return saida


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit('uso: python3 motor/capa.py "Titulo" "Categoria" saida.png')
    print(gerar_capa(sys.argv[1], sys.argv[2], sys.argv[3]))
