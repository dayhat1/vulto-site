#!/usr/bin/env python3
"""
Otimiza uma imagem para o blog da Vulto.

Requer Pillow (so na sua maquina, o Render nao roda isto):
    pip install pillow

Uso:
    python3 tools/otimizar_imagem.py FOTO.jpg NOME [--capa] [--foco 0.5,0.4]

    FOTO.jpg   imagem original (jpg, png, webp...)
    NOME       nome do arquivo final, sem extensao (ex.: whatsapp-cobranca)
    --capa     gera a capa (1600px) + versao celular (800px) + JPG de compartilhamento (1200x630)
               sem --capa gera imagem interna (1200px) + versao celular (800px)
    --foco     ponto de interesse para o recorte 16:9 (x,y de 0 a 1). Padrao: centro.

Saida em public/img/blog/:
    NOME.webp, NOME-800.webp e, com --capa, NOME-og.jpg

Depois e so referenciar no post:
    cover: "/img/blog/NOME.webp"                       (capa)
    ![Legenda](/img/blog/NOME.webp "Foto: Autor / Unsplash | https://...")   (interna)
"""

import argparse
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Instale o Pillow primeiro: pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "img", "blog")

# Tetos de peso (KB). Se passar, a qualidade desce ate caber.
LIMITES = {"capa": 160, "interna": 110, "celular": 70, "og": 140}


def recorte(img, ratio, foco):
    w, h = img.size
    fx, fy = foco
    if w / h > ratio:
        nw = int(h * ratio)
        x = int(max(0, min(w - nw, fx * w - nw / 2)))
        return img.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = int(max(0, min(h - nh, fy * h - nh / 2)))
    return img.crop((0, y, w, y + nh))


def salvar(img, caminho, fmt, teto_kb):
    q = 82
    while True:
        if fmt == "WEBP":
            img.save(caminho, "WEBP", quality=q, method=6)
        else:
            img.save(caminho, "JPEG", quality=q, optimize=True, progressive=True)
        kb = os.path.getsize(caminho) / 1024
        if kb <= teto_kb or q <= 50:
            return kb
        q -= 6


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("foto")
    ap.add_argument("nome")
    ap.add_argument("--capa", action="store_true")
    ap.add_argument("--foco", default="0.5,0.5")
    a = ap.parse_args()

    foco = tuple(float(v) for v in a.foco.split(","))
    os.makedirs(OUT, exist_ok=True)
    img = ImageOps.exif_transpose(Image.open(a.foto)).convert("RGB")
    base = recorte(img, 16 / 9, foco)

    largura = 1600 if a.capa else 1200
    principal = base.resize((largura, round(largura * 9 / 16)), Image.LANCZOS)
    p1 = os.path.join(OUT, f"{a.nome}.webp")
    kb1 = salvar(principal, p1, "WEBP", LIMITES["capa" if a.capa else "interna"])

    celular = base.resize((800, 450), Image.LANCZOS)
    p2 = os.path.join(OUT, f"{a.nome}-800.webp")
    kb2 = salvar(celular, p2, "WEBP", LIMITES["celular"])

    print(f"{p1}  {principal.size[0]}x{principal.size[1]}  {kb1:.0f} KB")
    print(f"{p2}  800x450  {kb2:.0f} KB")

    if a.capa:
        og = recorte(img, 1200 / 630, foco).resize((1200, 630), Image.LANCZOS)
        p3 = os.path.join(OUT, f"{a.nome}-og.jpg")
        kb3 = salvar(og, p3, "JPEG", LIMITES["og"])
        print(f"{p3}  1200x630  {kb3:.0f} KB")


if __name__ == "__main__":
    main()
