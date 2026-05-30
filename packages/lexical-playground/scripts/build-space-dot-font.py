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
# space marker. The font has exactly one glyph: a 120x120 unit square dot
# centered in the `U+0020` slot of a 1000 UPM em. Embedded as a base64 data
# URI in `PlaygroundEditorTheme.css` (`@font-face` block, see the comment
# above the inline `src`). Run this from the repo root with `uv` (auto-
# installs `fonttools` and `brotli`):
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
import os
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

UPM = 1000
ADVANCE = 260
DOT_SIZE = 120
DOT_CX = 130
DOT_CY = 350


def main() -> None:
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder([".notdef", "space"])
    fb.setupCharacterMap({0x0020: "space"})

    pen = TTGlyphPen(None)
    half = DOT_SIZE // 2
    pen.moveTo((DOT_CX - half, DOT_CY - half))
    pen.lineTo((DOT_CX + half, DOT_CY - half))
    pen.lineTo((DOT_CX + half, DOT_CY + half))
    pen.lineTo((DOT_CX - half, DOT_CY + half))
    pen.closePath()
    space_glyph = pen.glyph()

    notdef_glyph = TTGlyphPen(None).glyph()

    fb.setupGlyf({".notdef": notdef_glyph, "space": space_glyph})
    fb.setupHorizontalMetrics({".notdef": (ADVANCE, 0), "space": (ADVANCE, 0)})
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
