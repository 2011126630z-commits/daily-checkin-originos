# -*- coding: utf-8 -*-
"""
Generate the PWA / App icon set for the daily-checkin app (OriginOS 7 style:
"misty grey-blue liquid glass + vivo blue").

Design is authored in a 1024x1024 logical canvas and rasterised at 4x
supersampling (4096x4096), then downsampled with LANCZOS for clean edges.

Outputs (only files written by this script):
    public/icons/icon-192.png            192x192  rounded, transparent corners
    public/icons/icon-512.png            512x512  rounded, transparent corners
    public/icons/icon-maskable-512.png   512x512  opaque full-bleed square, art @72%
    public/icons/apple-touch-icon.png    180x180  opaque full-bleed square

Usage:
    python scripts/gen-icons.py
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# --------------------------------------------------------------------------
# Paths / constants
# --------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(PROJECT_ROOT, "public", "icons")

BASE = 1024          # logical design canvas
SS = 4               # supersampling factor
W = BASE * SS        # 4096 working canvas

# Palette
BG_TOP = (0xEE, 0xF2, 0xF8)      # #EEF2F8
BG_BOTTOM = (0xD6, 0xDE, 0xEA)   # #D6DEEA
VIVO_BLUE = (0x31, 0x5E, 0xFB)   # #315EFB
BLOB_COLOR = (0xB9, 0xC6, 0xDA)  # #B9C6DA

# Geometry (logical px, multiplied by SS when drawing)
BG_RADIUS = int(BASE * 0.22)          # 225
CARD_SIZE = int(BASE * 0.56)          # 573
CARD_RADIUS = int(BASE * 0.20)        # 204
CARD_ALPHA = int(255 * 0.55)          # white @ 55%
HIGHLIGHT_ALPHA = int(255 * 0.08)     # diagonal white sheen @ 8%
BLOB_ALPHA = int(255 * 0.12)          # #B9C6DA @ 12%
STROKE = int(BASE * 0.09)             # checkmark stroke width, 92
SAFE_SCALE = 0.72                     # maskable / apple content safe area


def s(v: float) -> int:
    """Scale a logical value into supersampled space."""
    return int(round(v * SS))


# --------------------------------------------------------------------------
# Building blocks
# --------------------------------------------------------------------------

def vertical_gradient(size: int, top: tuple, bottom: tuple) -> Image.Image:
    """Full-canvas vertical RGB gradient."""
    col = Image.new("RGB", (1, size))
    px = []
    for y in range(size):
        t = y / max(1, size - 1)
        px.append(tuple(int(round(top[i] + (bottom[i] - top[i]) * t)) for i in range(3)))
    col.putdata(px)
    return col.resize((size, size), Image.NEAREST).convert("RGBA")


def diagonal_sheen(size: int, color: tuple, alpha: int) -> Image.Image:
    """White sheen: strongest at the top-left corner, fading to transparent
    toward the bottom-right (135deg linear ramp)."""
    n = 256  # build small, upscale: the ramp is smooth, so this is lossless enough
    axis = np.linspace(0.0, 1.0, n, dtype=np.float32)
    ramp = 1.0 - np.clip((axis[:, None] + axis[None, :]) / 2.0, 0.0, 1.0)
    small = Image.fromarray((ramp * alpha).astype(np.uint8), "L")
    grad = small.resize((size, size), Image.BICUBIC)
    layer = Image.new("RGBA", (size, size), color + (0,))
    layer.putalpha(grad)
    return layer


def rounded_mask(size: int, radius: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def soft_blob(size: int, center: tuple, radius: int, color: tuple, alpha: int) -> Image.Image:
    """Faint circular glow with a soft edge."""
    m = Image.new("L", (size, size), 0)
    cx, cy = center
    ImageDraw.Draw(m).ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=alpha)
    m = m.filter(ImageFilter.GaussianBlur(radius * 0.35))
    layer = Image.new("RGBA", (size, size), color + (0,))
    layer.putalpha(m)
    return layer


def build_background(size: int, rounded: bool) -> Image.Image:
    """Gradient + blob + diagonal sheen, masked to a rounded rect (or full square)."""
    bg = vertical_gradient(size, BG_TOP, BG_BOTTOM)

    blob = soft_blob(
        size,
        center=(int(size * 0.78), int(size * 0.80)),
        radius=int(size * 0.30),
        color=BLOB_COLOR,
        alpha=BLOB_ALPHA,
    )
    bg = Image.alpha_composite(bg, blob)

    sheen = diagonal_sheen(size, (255, 255, 255), HIGHLIGHT_ALPHA)
    bg = Image.alpha_composite(bg, sheen)

    if rounded:
        bg.putalpha(rounded_mask(size, s(BG_RADIUS)))
    return bg


def build_foreground(size: int) -> Image.Image:
    """Glass card + top highlight + vivo blue checkmark, on transparency."""
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    card_px = int(CARD_SIZE * SS)
    card_r = int(CARD_RADIUS * SS)
    x0 = (size - card_px) // 2
    y0 = (size - card_px) // 2

    # --- card body -------------------------------------------------------
    card = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle(
        [x0, y0, x0 + card_px, y0 + card_px],
        radius=card_r,
        fill=(255, 255, 255, CARD_ALPHA),
    )
    fg = Image.alpha_composite(fg, card)

    # --- bright top edge (glass rim light) -------------------------------
    # card mask minus a copy of itself pushed down => a thin band hugging the
    # top edge, arcs included, without the degenerate thin rounded-rect issue.
    rim_h = max(1, int(round(1.6 * SS)))
    card_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(card_mask).rounded_rectangle(
        [x0, y0, x0 + card_px, y0 + card_px], radius=card_r, fill=255
    )
    a = np.asarray(card_mask, dtype=np.int16)
    shifted = np.zeros_like(a)
    shifted[rim_h:, :] = a[:-rim_h, :]
    rim_a = Image.fromarray(np.clip(a - shifted, 0, 255).astype(np.uint8), "L")
    rim = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    rim.putalpha(rim_a.point(lambda v: int(v * 0.74)))
    fg = Image.alpha_composite(fg, rim)

    # --- checkmark -------------------------------------------------------
    stroke = int(STROKE * SS)
    ink = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    idr = ImageDraw.Draw(ink)
    pts = [
        (s(345), s(516)),
        (s(462), s(633)),
        (s(672), s(405)),
    ]
    idr.line(pts, fill=VIVO_BLUE + (255,), width=stroke, joint="curve")
    r = stroke / 2.0
    for (px_, py_) in (pts[0], pts[-1]):
        idr.ellipse([px_ - r, py_ - r, px_ + r, py_ + r], fill=VIVO_BLUE + (255,))

    bbox = ink.getbbox()
    ink = ink.crop(bbox)
    # centre the ink's bounding box exactly on the canvas centre
    ox = (size - ink.width) // 2
    oy = (size - ink.height) // 2
    centred = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    centred.paste(ink, (ox, oy), ink)
    fg = Image.alpha_composite(fg, centred)

    return fg


def compose(rounded: bool, content_scale: float) -> Image.Image:
    """Full 4096 master image."""
    bg = build_background(W, rounded=rounded)
    fg = build_foreground(W)

    if content_scale != 1.0:
        new = int(round(W * content_scale))
        fg = fg.resize((new, new), Image.LANCZOS)
        canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        off = (W - new) // 2
        canvas.paste(fg, (off, off), fg)
        fg = canvas

    return Image.alpha_composite(bg, fg)


def save(master: Image.Image, name: str, size: int) -> str:
    out = master.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT_DIR, name)
    out.save(path, "PNG", optimize=True)
    return path


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)

    rounded_master = compose(rounded=True, content_scale=1.0)
    square_master = compose(rounded=False, content_scale=SAFE_SCALE)

    written = [
        save(rounded_master, "icon-192.png", 192),
        save(rounded_master, "icon-512.png", 512),
        save(square_master, "icon-maskable-512.png", 512),
        save(square_master, "apple-touch-icon.png", 180),
    ]
    for p in written:
        print("wrote", p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
