/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageSetup} from '../../plugins/PagesExtension/types';

import {describe, expect, it} from 'vitest';

import {
  computeGeometry,
  computePageBreakMarginBottom,
  computePageCount,
  computeZoom,
  pageContentTop,
  pageIndexAtY,
} from '../../plugins/PagesExtension/layoutMath';

const setup: PageSetup = {
  margins: {bottom: 0.5, left: 0.5, right: 0.5, top: 0.5},
  orientation: 'portrait',
  pageSize: 'Letter',
};

describe('computeGeometry', () => {
  it('derives content, break and first-top heights from the setup', () => {
    const geom = computeGeometry(setup, 0, 0, 24);
    expect(geom.pageWidth).toBe(816);
    expect(geom.pageHeight).toBe(1056);
    expect(geom.marginTop).toBe(48);
    expect(geom.contentHeight).toBe(1056 - 96);
    expect(geom.breakHeight).toBe(48 + 24 + 48);
    expect(geom.firstTop).toBe(48);
  });

  it('accounts for header and footer heights', () => {
    const geom = computeGeometry(setup, 30, 20, 24);
    expect(geom.contentHeight).toBe(1056 - 96 - 50);
    expect(geom.breakHeight).toBe(20 + 48 + 24 + 48 + 30);
    expect(geom.firstTop).toBe(48 + 30);
  });

  it('swaps width and height in landscape', () => {
    const geom = computeGeometry({...setup, orientation: 'landscape'});
    expect(geom.pageWidth).toBe(1056);
    expect(geom.pageHeight).toBe(816);
  });

  it('never lets the content area collapse', () => {
    const geom = computeGeometry({
      ...setup,
      margins: {bottom: 6, left: 0, right: 0, top: 6},
    });
    expect(geom.contentHeight).toBeGreaterThan(0);
  });
});

describe('computePageCount', () => {
  const geom = computeGeometry(setup, 0, 0, 24);
  const {contentHeight: C, breakHeight: Bk, firstTop: H0} = geom;

  it('is 1 for an empty or short document', () => {
    expect(computePageCount(H0, geom)).toBe(1);
    expect(computePageCount(H0 + 10, geom)).toBe(1);
  });

  it('keeps content that ends exactly on a page boundary on that page', () => {
    expect(computePageCount(H0 + C, geom)).toBe(1);
    expect(computePageCount(H0 + C + 0.25, geom)).toBe(1);
    expect(computePageCount(pageContentTop(1, geom) + C, geom)).toBe(2);
  });

  it('opens a new page as soon as content crosses a boundary', () => {
    expect(computePageCount(H0 + C + 1, geom)).toBe(2);
    expect(computePageCount(pageContentTop(1, geom) + C + 1, geom)).toBe(3);
  });

  it('is exact when measured with the matching number of breaks', () => {
    // Three pages worth of lines laid out with two breaks in place.
    const bottom = H0 + 3 * C + 2 * Bk - 5;
    expect(computePageCount(bottom, geom)).toBe(3);
  });
});

describe('pageIndexAtY / computePageBreakMarginBottom', () => {
  const geom = computeGeometry(setup, 0, 0, 24);
  const {contentHeight: C, breakHeight: Bk, firstTop: H0} = geom;

  it('maps host-relative y to a page index', () => {
    expect(pageIndexAtY(0, geom)).toBe(0);
    expect(pageIndexAtY(H0 + C - 1, geom)).toBe(0);
    // inside the break band the y still belongs to the page above
    expect(pageIndexAtY(H0 + C + Bk / 2, geom)).toBe(0);
    expect(pageIndexAtY(H0 + C + Bk, geom)).toBe(1);
  });

  it('stretches a page break to the next page top', () => {
    const top = H0 + 100;
    const mb = computePageBreakMarginBottom(top, 0, geom);
    expect(top + mb).toBe(pageContentTop(1, geom));
  });

  it('is idempotent: the stretched break resolves to the same margin', () => {
    const top = H0 + 100;
    const first = computePageBreakMarginBottom(top, 4, geom);
    const second = computePageBreakMarginBottom(top, 4, geom);
    expect(second).toBe(first);
  });

  it('never returns a negative margin', () => {
    expect(computePageBreakMarginBottom(H0 + C + Bk + 5, 10, geom)).toBe(
      pageContentTop(2, geom) - (H0 + C + Bk + 15),
    );
    expect(computePageBreakMarginBottom(0, 10_000, geom)).toBe(0);
  });
});

describe('computeZoom', () => {
  it('fits the page into the available width, capped at 1', () => {
    expect(computeZoom(1000, 816)).toBe(1);
    expect(computeZoom(408, 816)).toBe(0.5);
    expect(computeZoom(0, 816)).toBe(1);
    expect(computeZoom(500, 0)).toBe(1);
  });
});
