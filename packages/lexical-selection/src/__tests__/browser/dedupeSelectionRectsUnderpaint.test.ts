/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {createRectsFromDOMRange} from '@lexical/selection';
import {dedupeSelectionRects} from '@lexical/utils';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * Characterizes the documented KNOWN LIMITATION of dedupeSelectionRects' keep-smaller
 * rule (see its docstring): for OVERLAPPING inline content it can drop a wide rect
 * that covers real selected text, under-painting the glyphs it uniquely covered.
 * Uses real browser layout (Chromium + WebKit) and the real createRectsFromDOMRange +
 * dedupeSelectionRects — the root is a real, laid-out element so getBoundingClientRect
 * / getComputedStyle are real; only `editor` is a getRootElement shim, which is all the
 * helper reads off it.
 */

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const ROOT_WIDTH = 600;

function setupRoot(): HTMLDivElement {
  const root = document.createElement('div');
  root.style.position = 'absolute';
  root.style.left = '0px';
  root.style.top = '0px';
  root.style.width = `${ROOT_WIDTH}px`;
  root.style.padding = '0px';
  root.style.margin = '0px';
  root.style.font = '16px/1.5 monospace';
  document.body.style.margin = '0px';
  document.body.appendChild(root);
  return root;
}

function editorFor(root: HTMLElement): LexicalEditor {
  return {getRootElement: () => root} as unknown as LexicalEditor;
}

const toRect = (r: DOMRect | Rect): Rect => ({
  bottom: r.bottom,
  height: r.height,
  left: r.left,
  right: r.right,
  top: r.top,
  width: r.width,
});

// Containment predicate matching dedupeSelectionRects (1px tolerance), used only to
// assert the survivors really are contained; the dedupe itself uses the REAL function.
function contains(a: Rect, b: Rect): boolean {
  return (
    b.left >= a.left - 1 &&
    b.top >= a.top - 1 &&
    b.right <= a.right + 1 &&
    b.bottom <= a.bottom + 1
  );
}

function selectAll(root: HTMLElement): Range {
  const r = document.createRange();
  r.selectNodeContents(root);
  return r;
}

describe('dedupeSelectionRects under-paints real text for overlapping inline content', () => {
  it('drops the wide text-run rect that uniquely covers selected glyphs', () => {
    const root = setupRoot();
    onTestFinished(() => root.remove());

    // "aaaaaaaaaa" then an inline-block pulled back 70px over it and raised 0.5px via
    // vertical-align (a plain CSS sub-pixel offset — no transform needed), then "cccc".
    // The negative margin makes content overlap; the raise defeats the asymmetric guard
    // so the overlapped rects all survive createRectsFromDOMRange.
    root.innerHTML = `<p style="margin:0">aaaaaaaaaa<span style="display:inline-block;width:10px;height:18px;margin-left:-70px;vertical-align:0.5px;background:rgba(255,0,0,.4)">N</span>cccc</p>`;
    void root.offsetHeight;

    const range = selectAll(root);
    const survivors = (
      createRectsFromDOMRange(editorFor(root), range) as unknown as DOMRect[]
    ).map(toRect);

    // createRectsFromDOMRange keeps the wide real-text run AND narrower contained rects.
    const wide = survivors.find(r => r.left <= 2 && r.width > 90);
    expect(
      wide,
      'wide text-run rect survived createRectsFromDOMRange',
    ).toBeTruthy();
    const contained = survivors.filter(
      r => r !== wide && wide != null && contains(wide, r),
    );
    expect(
      contained.length,
      'narrower rects are contained in the wide text rect, on the same row',
    ).toBeGreaterThan(0);

    // The REAL dedupeSelectionRects then drops the wide text-run rect (keep-smaller)...
    const deduped = dedupeSelectionRects(survivors);
    expect(
      deduped.every(r => r.width < 90),
      'the wide text-run rect was dropped by keep-smaller dedupe',
    ).toBe(true);

    // ...leaving BOTH edges of the run uncovered: the leading glyphs before the
    // pulled-back box (left 0..~26) and the trailing glyphs past it (right ~74..96)
    // get no rect at all → real selected text goes unpainted on both sides.
    const leftmostCovered = Math.min(...deduped.map(r => r.left));
    const rightmostCovered = Math.max(...deduped.map(r => r.right));
    expect(
      leftmostCovered,
      'leading glyphs at the line start are left uncovered (under-paint)',
    ).toBeGreaterThan(18);
    expect(
      rightmostCovered,
      'trailing glyphs at the line end are left uncovered (under-paint)',
    ).toBeLessThan(90);
  });
});
