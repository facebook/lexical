#!/usr/bin/env -S uv run --script
#
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools", "brotli"]
# ///

# Regenerates the inline WOFF2 used by `VisibleNonPrintingExtension` for the
# space marker. The font has exactly one visible glyph: a round dot (a
# middot) of diameter 120 units, centered horizontally in the `U+0020`
# advance and sitting on the lowercase center line of a 1000 UPM em. Embedded
# as a base64 data URI in `PlaygroundEditorTheme.css` (`@font-face` block,
# see the comment above the inline `src`). Run this from the repo root with
# `uv` (auto-installs `fonttools` and `brotli`):
#
#     uv run packages/lexical-playground/scripts/build-space-dot-font.py
#
# The script prints the WOFF2 byte size and the base64 payload to paste into
# the `@font-face` `src` URL.
#
# Note: WOFF2 byte size and payload may shift slightly across fontTools /
# brotli versions for the same glyph input — commit the new base64 (and the
# byte size in the CSS comment) when you regenerate.

import base64
import math
import os
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

UPM = 1000
ADVANCE = 260
DOT_DIAMETER = 120
# Center the dot in the advance so it sits in the middle of the rendered
# space instead of hugging the left edge.
DOT_CX = ADVANCE // 2
DOT_CY = 350
# Quadratic segments used to approximate the circle. 8 is visually round at
# the sizes we render (sub-pixel deviation from a true circle) and still
# compresses to a tiny WOFF2.
DOT_SEGMENTS = 8


def draw_dot(pen, cx, cy, radius, segments):
    """Trace a circle as on-curve points joined by quadratic arcs.

    TrueType outlines are quadratic, so each arc uses a single off-curve
    control point pushed out to ``radius / cos(half-step)`` — the standard
    quadratic-Bezier circle approximation.
    """
    step = 2.0 * math.pi / segments
    control_radius = radius / math.cos(step / 2.0)
    pen.moveTo((round(cx + radius), round(cy)))
    for i in range(segments):
        mid_angle = (i + 0.5) * step
        end_angle = (i + 1) * step
        control = (
            round(cx + control_radius * math.cos(mid_angle)),
            round(cy + control_radius * math.sin(mid_angle)),
        )
        end = (
            round(cx + radius * math.cos(end_angle)),
            round(cy + radius * math.sin(end_angle)),
        )
        pen.qCurveTo(control, end)
    pen.closePath()


def main() -> None:
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder([".notdef", "space"])
    fb.setupCharacterMap({0x0020: "space"})

    pen = TTGlyphPen(None)
    draw_dot(pen, DOT_CX, DOT_CY, DOT_DIAMETER / 2.0, DOT_SEGMENTS)
    space_glyph = pen.glyph()

    notdef_glyph = TTGlyphPen(None).glyph()

    fb.setupGlyf({".notdef": notdef_glyph, "space": space_glyph})

    # The left side bearing must match the glyph's xMin. Browsers position the
    # outline by its advertised lsb, so leaving it at 0 while the dot starts
    # ~70 units in shoves the dot toward the left edge of the space instead of
    # centering it. Derive it from the compiled bounds so it always tracks the
    # geometry above.
    glyf_table = fb.font["glyf"]
    glyf_table["space"].recalcBounds(glyf_table)
    space_lsb = glyf_table["space"].xMin
    fb.setupHorizontalMetrics({".notdef": (ADVANCE, 0), "space": (ADVANCE, space_lsb)})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupOS2(
        sTypoAscender=800,
        sTypoDescender=-200,
        usWinAscent=800,
        usWinDescent=200,
        sCapHeight=700,
        sxHeight=500,
    )
    fb.setupNameTable({"familyName": "LexicalSpaceDot", "styleName": "Regular"})
    fb.setupPost()

    ttf_path = "/tmp/LexicalSpaceDot.ttf"
    woff2_path = "/tmp/LexicalSpaceDot.woff2"
    fb.save(ttf_path)

    font = TTFont(ttf_path)
    font.flavor = "woff2"
    font.save(woff2_path)

    size = os.path.getsize(woff2_path)
    with open(woff2_path, "rb") as f:
        payload = base64.b64encode(f.read()).decode("ascii")

    sys.stdout.write(f"WOFF2 size: {size} bytes\n")
    sys.stdout.write("Base64 payload (paste into @font-face src):\n")
    sys.stdout.write(payload + "\n")


if __name__ == "__main__":
    main()
