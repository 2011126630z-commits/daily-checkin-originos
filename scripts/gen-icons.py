# -*- coding: utf-8 -*-
"""
Generate the full icon set for the "daily-checkin" app
(OriginOS 7 / liquid-glass, vivo blue #315EFB).

Design concept: a progress ring + check mark ("daily check-in / streak").

Everything is authored on a 1024x1024 logical canvas and rasterised at 4x
supersampling (4096x4096), then downsampled with LANCZOS for clean edges.

Outputs written by this script (and nothing else):
  PWA
    public/icons/icon-192.png            192x192  RGBA, rounded rect, transparent corners
    public/icons/icon-512.png            512x512  RGBA, rounded rect, transparent corners
    public/icons/icon-maskable-512.png   512x512  RGB,  full-bleed square, art @72%
    public/icons/apple-touch-icon.png    180x180  RGB,  full-bleed square, art @72%
  Android legacy launcher
    mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.png       48/72/96/144/192 RGBA rounded rect
    mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher_round.png 48/72/96/144/192 RGBA circle
  Android adaptive icon
    mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher_foreground.png 108/162/216/324/432 RGBA transparent
    mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher_background.png 108/162/216/324/432 RGB full-bleed
  Android splash (original pixel sizes preserved, background #E9EDF4)
    drawable/splash.png + drawable-{land,port}-{m,h,xh,xxh,xxxh}dpi/splash.png

Usage:
    python scripts/gen-icons.py
"""

from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# --------------------------------------------------------------------------
# Paths / constants
# --------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
PWA_DIR = os.path.join(PROJECT_ROOT, "public", "icons")
ANDROID_RES = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res")
SPLASH_DIRS = (
    "drawable",
    "drawable-land-mdpi", "drawable-land-hdpi", "drawable-land-xhdpi",
    "drawable-land-xxhdpi", "drawable-land-xxxhdpi",
    "drawable-port-mdpi", "drawable-port-hdpi", "drawable-port-xhdpi",
    "drawable-port-xxhdpi", "drawable-port-xxxhdpi",
)

BASE = 1024          # logical design canvas
SS = 4               # supersampling factor
W = BASE * SS        # 4096 working canvas

# Palette
BG_TOP = (0xF2, 0xF5, 0xFA)       # #F2F5FA
BG_BOTTOM = (0xD3, 0xDC, 0xEA)    # #D3DCEA
VIVO_BLUE = (0x31, 0x5E, 0xFB)    # #315EFB
SPLASH_BG = (0xE9, 0xED, 0xF4)    # #E9EDF4

# Geometry, as a fraction of the logical canvas
BG_RADIUS_FRAC = 0.22       # rounded-rect corner radius
RING_OUTER_FRAC = 0.325     # ring outer radius -> bbox half-side 32.5% (<=33% safe)
RING_STROKE_FRAC = 0.11     # ring line width
RING_GAP_DEG = 80.0         # opening in the ring
RING_GAP_CENTER_DEG = -45.0  # ...centred on the upper right (PIL: 0 deg = 3 o'clock, clockwise)
DISC_RADIUS_FRAC = 0.31     # glass disc diameter = 62%
DISC_ALPHA = int(round(255 * 0.55))
DISC_RIM_ALPHA = 235
CHECK_STROKE_FRAC = 0.09    # check mark line width
GLASS_TOPLEFT = (0.20, 0.14)  # centre of the faint white radial highlight
GLASS_TOPLEFT_ALPHA = 26      # ~10%

# Check-mark polyline on the 1024 canvas (centred afterwards by bounding box)
CHECK_PTS = ((386.0, 514.0), (456.0, 584.0), (600.0, 432.0))

# Content scale (ring outer diameter / canvas) for the different variants
FULL_CONTENT_FRAC = 2.0 * RING_OUTER_FRAC          # 0.65 on the standard icon
MASKABLE_CONTENT_FRAC = 0.72                       # maskable / apple safe area
# Adaptive icon: Android's safe zone is a 66dp circle on a 108dp canvas, i.e.
# content half-extent <= 33/108 = 0.3056 (NOT 0.33). Keep the art a little
# further inside so the LANCZOS antialias halo (measured ~3px at every
# density) also stays inside the visible 72dp circle (half-extent 0.3333).
ADAPTIVE_CONTENT_FRAC = 0.5895                     # ~0.90x of the 0.655 base
SPLASH_CONTENT_FRAC = 0.26                         # splash mark size

DENSITIES = (
    ("mdpi", 48, 108),
    ("hdpi", 72, 162),
    ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324),
    ("xxxhdpi", 192, 432),
)


def logical(value: float) -> float:
    """Shorthand for readability (identity; kept for symmetry)."""
    return value


# --------------------------------------------------------------------------
# Building blocks
# --------------------------------------------------------------------------

def vertical_gradient(size: int, top: tuple, bottom: tuple) -> Image.Image:
    """Full-square vertical RGB gradient (top -> bottom)."""
    t = np.linspace(0.0, 1.0, size, dtype=np.float32)[:, None]
    arr = np.zeros((size, 1, 3), dtype=np.uint8)
    for i in range(3):
        arr[:, :, i] = np.clip(np.round(top[i] + (bottom[i] - top[i]) * t), 0, 255)
    return Image.fromarray(arr, "RGB").resize((size, size), Image.NEAREST).convert("RGBA")


def radial_highlight(size: int, center_frac: tuple, radius_frac: float, alpha: int) -> Image.Image:
    """Faint white radial glow (strong near `center_frac`, gone at `radius_frac`)."""
    n = 512
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    cx, cy = center_frac[0] * n, center_frac[1] * n
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (radius_frac * n)
    a = np.clip(1.0 - d, 0.0, 1.0) ** 2 * alpha
    grad = Image.fromarray(a.astype(np.uint8), "L").resize((size, size), Image.BICUBIC)
    layer = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    layer.putalpha(grad)
    return layer


def rounded_mask(w: int, h: int, radius: float, shape: str) -> Image.Image | None:
    """Alpha mask for the background shape ('rounded', 'circle', 'square')."""
    if shape == "square":
        return None
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        r = min(w, h) / 2.0
        cx, cy = w / 2.0, h / 2.0
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    else:
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    return m


def build_background(w: int, h: int, shape: str) -> Image.Image:
    """Gradient + faint top-left highlight, clipped to the requested shape."""
    size = max(w, h)
    bg = vertical_gradient(size, BG_TOP, BG_BOTTOM)
    bg = Image.alpha_composite(bg, radial_highlight(size, GLASS_TOPLEFT, 0.9, GLASS_TOPLEFT_ALPHA))
    if (w, h) != (size, size):
        bg = bg.crop((0, 0, w, h))
    mask = rounded_mask(w, h, BG_RADIUS_FRAC * min(w, h), shape)
    if mask is not None:
        bg.putalpha(mask)
    return bg


def _disc_layer(w: int, h: int, k: float) -> Image.Image:
    """White 55% glass disc with a thin bright rim, centred on the canvas."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = w / 2.0, h / 2.0
    r = DISC_RADIUS_FRAC * BASE * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, DISC_ALPHA))
    rim = max(2.0, 2.0 * k)
    r_in = r - rim / 2.0
    d.ellipse(
        [cx - r_in, cy - r_in, cx + r_in, cy + r_in],
        outline=(255, 255, 255, DISC_RIM_ALPHA),
        width=max(1, int(round(rim))),
    )
    return layer


def _ring_layer(w: int, h: int, k: float) -> Image.Image:
    """vivo-blue progress ring with a round-capped ~280 degree arc."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = w / 2.0, h / 2.0
    stroke = RING_STROKE_FRAC * BASE * k
    # PIL fills an `arc(..., width=)` INWARD from the bounding ellipse, so pass
    # the intended *outer* radius as the bbox radius; the band then spans
    # [outer - stroke, outer] and round caps sit on the centreline.
    outer = RING_OUTER_FRAC * BASE * k
    r = outer - stroke / 2.0
    start = RING_GAP_CENTER_DEG + RING_GAP_DEG / 2.0     # -5 deg
    end = RING_GAP_CENTER_DEG - RING_GAP_DEG / 2.0 + 360.0  # 275 deg
    d.arc([cx - outer, cy - outer, cx + outer, cy + outer], start, end,
          fill=VIVO_BLUE + (255,), width=max(1, int(round(stroke))))
    cap = stroke / 2.0
    for ang in (start, end):
        rad = math.radians(ang)
        px, py = cx + r * math.cos(rad), cy + r * math.sin(rad)
        d.ellipse([px - cap, py - cap, px + cap, py + cap], fill=VIVO_BLUE + (255,))
    return layer


def _check_layer(w: int, h: int, k: float) -> Image.Image:
    """Bold vivo-blue check mark, optically centred on the canvas."""
    stroke = CHECK_STROKE_FRAC * BASE * k
    cx, cy = w / 2.0, h / 2.0
    ink = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ink)
    pts = [
        (cx + (x - BASE / 2.0) * k, cy + (y - BASE / 2.0) * k)
        for (x, y) in CHECK_PTS
    ]
    d.line(pts, fill=VIVO_BLUE + (255,), width=max(1, int(round(stroke))), joint="curve")
    cap = stroke / 2.0
    for (px, py) in (pts[0], pts[-1]):
        d.ellipse([px - cap, py - cap, px + cap, py + cap], fill=VIVO_BLUE + (255,))

    bbox = ink.getbbox()
    if bbox:
        ink = ink.crop(bbox)
        centred = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        centred.paste(ink, ((w - ink.width) // 2, (h - ink.height) // 2), ink)
        return centred
    return ink


def draw_content(w: int, h: int, content_frac: float, include_disc: bool = True) -> Image.Image:
    """Disc (optional) + ring + check, sized so the ring outer diameter equals
    `content_frac` * min(w, h)."""
    k = (content_frac * min(w, h)) / (2.0 * RING_OUTER_FRAC * BASE)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if include_disc:
        layer = Image.alpha_composite(layer, _disc_layer(w, h, k))
    layer = Image.alpha_composite(layer, _ring_layer(w, h, k))
    layer = Image.alpha_composite(layer, _check_layer(w, h, k))
    return layer


def compose_icon(shape: str, content_frac: float, include_disc: bool) -> Image.Image:
    """A full 4096 master icon (background + content)."""
    bg = build_background(W, W, shape)
    return Image.alpha_composite(bg, draw_content(W, W, content_frac, include_disc))


def save(img: Image.Image, path: str, size: tuple | int, *, opaque: bool = False) -> str:
    if isinstance(size, int):
        out = img.resize((size, size), Image.LANCZOS)
    else:
        out = img.resize(size, Image.LANCZOS)
    if opaque:
        out = out.convert("RGB")
    else:
        out = out.convert("RGBA")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, "PNG", optimize=True)
    return path


# --------------------------------------------------------------------------
# Splash screens
# --------------------------------------------------------------------------

def splash_work_scale(w: int, h: int) -> int:
    """Supersampling factor that keeps the working canvas reasonable."""
    if max(w, h) <= 800:
        return 4
    if max(w, h) <= 1600:
        return 3
    return 2


def render_splash(w: int, h: int) -> Image.Image:
    """Flat #E9EDF4 background with a centred ring + check mark @26%."""
    ss = splash_work_scale(w, h)
    ww, hh = w * ss, h * ss
    bg = Image.new("RGB", (ww, hh), SPLASH_BG).convert("RGBA")
    fg = draw_content(ww, hh, SPLASH_CONTENT_FRAC, include_disc=False)
    out = Image.alpha_composite(bg, fg).resize((w, h), Image.LANCZOS)
    return out.convert("RGB")


# --------------------------------------------------------------------------
# Generation
# --------------------------------------------------------------------------

def generate() -> list[tuple[str, int, int, str, int]]:
    """Write every icon; return a manifest for verification."""
    manifest: list[tuple[str, int, int, str, int]] = []  # (path, w, h, mode, corner)

    os.makedirs(PWA_DIR, exist_ok=True)

    # --- A. PWA ---------------------------------------------------------
    rounded_master = compose_icon("rounded", FULL_CONTENT_FRAC, include_disc=True)
    square_master = compose_icon("square", MASKABLE_CONTENT_FRAC, include_disc=True)

    manifest.append((save(rounded_master, os.path.join(PWA_DIR, "icon-192.png"), 192), 192, 192, "RGBA", 0))
    manifest.append((save(rounded_master, os.path.join(PWA_DIR, "icon-512.png"), 512), 512, 512, "RGBA", 0))
    manifest.append((save(square_master, os.path.join(PWA_DIR, "icon-maskable-512.png"), 512, opaque=True), 512, 512, "RGB", 255))
    manifest.append((save(square_master, os.path.join(PWA_DIR, "apple-touch-icon.png"), 180, opaque=True), 180, 180, "RGB", 255))

    # --- B. Android legacy launcher ------------------------------------
    for name, size, _ in DENSITIES:
        d = os.path.join(ANDROID_RES, "mipmap-" + name)
        rounded = compose_icon("rounded", FULL_CONTENT_FRAC, include_disc=True)
        circle = compose_icon("circle", FULL_CONTENT_FRAC, include_disc=True)
        manifest.append((save(rounded, os.path.join(d, "ic_launcher.png"), size), size, size, "RGBA", 0))
        manifest.append((save(circle, os.path.join(d, "ic_launcher_round.png"), size), size, size, "RGBA", 0))

    # --- C. Android adaptive icon ---------------------------------------
    bg_master = build_background(W, W, "square")
    fg_master = draw_content(W, W, ADAPTIVE_CONTENT_FRAC, include_disc=False)
    for name, _, adaptive in DENSITIES:
        d = os.path.join(ANDROID_RES, "mipmap-" + name)
        manifest.append((save(bg_master, os.path.join(d, "ic_launcher_background.png"), adaptive, opaque=True), adaptive, adaptive, "RGB", 255))
        manifest.append((save(fg_master, os.path.join(d, "ic_launcher_foreground.png"), adaptive), adaptive, adaptive, "RGBA", 0))

    # --- D. Splash ------------------------------------------------------
    for rel in SPLASH_DIRS:
        path = os.path.join(ANDROID_RES, rel, "splash.png")
        if not os.path.exists(path):
            raise FileNotFoundError("missing splash: " + path)
        w, h = Image.open(path).size
        out = render_splash(w, h)
        out.save(path, "PNG", optimize=True)
        manifest.append((path, w, h, "RGB", 255))

    return manifest


# --------------------------------------------------------------------------
# Verification
# --------------------------------------------------------------------------

def corner_alpha(img: Image.Image, corner: str = "tl") -> int:
    w, h = img.size
    xy = {"tl": (0, 0), "tr": (w - 1, 0), "bl": (0, h - 1), "br": (w - 1, h - 1)}[corner]
    px = img.getpixel(xy)
    return px if isinstance(px, int) else (px[3] if len(px) == 4 else 255)


def verify(manifest: list[tuple[str, int, int, str, int]]) -> bool:
    ok = True
    print("\n%-68s %-9s %-5s %-5s %-6s" % ("file", "size", "mode", "corner", "ok"))
    print("-" * 100)
    for path, w, h, mode, corner in manifest:
        if not os.path.exists(path):
            print("%-68s  MISSING" % os.path.relpath(path, PROJECT_ROOT))
            ok = False
            continue
        img = Image.open(path)
        size_ok = img.size == (w, h)
        mode_ok = img.mode in (mode, "P") or (mode == "RGB" and img.mode == "RGB")
        c = corner_alpha(img)
        alpha_ok = (c >= 250) if corner == 255 else (c <= 5)
        good = size_ok and mode_ok and alpha_ok
        ok = ok and good
        print("%-68s %-9s %-5s %-5s %-6s" % (
            os.path.relpath(path, PROJECT_ROOT), "%dx%d" % img.size, img.mode,
            "%d/%s" % (c, corner), "OK" if good else "FAIL"))
    return ok


def main() -> int:
    manifest = generate()
    print("wrote %d files" % len(manifest))
    if not verify(manifest):
        print("\nVERIFICATION FAILED")
        return 1
    print("\nAll icons generated and verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
