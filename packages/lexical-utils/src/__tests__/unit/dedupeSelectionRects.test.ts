/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {dedupeSelectionRects} from '@lexical/utils';
import {describe, expect, it} from 'vitest';

function rect(left: number, top: number, width: number, height: number) {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  };
}

describe('dedupeSelectionRects', () => {
  it('keeps one of two identical rects (the doubled-opacity duplicate)', () => {
    const kept = dedupeSelectionRects([
      rect(128, 166, 394, 18),
      rect(128, 166, 394, 18),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].width).toBe(394);
  });

  it('keeps the smaller text rect when a wider rect contains it (#7106 extra area)', () => {
    const text = rect(128, 90, 368, 40);
    const wider = rect(128, 90, 1024, 40);
    const kept = dedupeSelectionRects([text, wider]);
    expect(kept).toHaveLength(1);
    expect(kept[0].width).toBe(368);
  });

  it('keeps the smaller rect regardless of input order', () => {
    const text = rect(128, 90, 368, 40);
    const wider = rect(128, 90, 1024, 40);
    expect(dedupeSelectionRects([wider, text])[0].width).toBe(368);
    expect(dedupeSelectionRects([text, wider])[0].width).toBe(368);
  });

  it('preserves genuine multi-line rects (different rows are not contained)', () => {
    const row1 = rect(128, 90, 368, 18);
    const row2 = rect(128, 112, 200, 18);
    const kept = dedupeSelectionRects([row1, row1, row2, row2]);
    expect(kept).toHaveLength(2);
    expect(kept.map(r => r.top).sort((a, b) => a - b)).toEqual([90, 112]);
  });

  it('drops zero-area rects', () => {
    const kept = dedupeSelectionRects([
      rect(0, 0, 0, 18),
      rect(0, 0, 100, 0),
      rect(0, 0, 100, 18),
    ]);
    expect(kept).toHaveLength(1);
  });

  it('returns empty for an empty list', () => {
    expect(dedupeSelectionRects([])).toHaveLength(0);
  });

  it('treats near-identical rects within 1px as duplicates', () => {
    const kept = dedupeSelectionRects([
      rect(128, 166, 394, 18),
      {
        bottom: 184.5,
        height: 18.2,
        left: 128.4,
        right: 522.1,
        top: 166.3,
        width: 393.7,
      },
    ]);
    expect(kept).toHaveLength(1);
  });
});
