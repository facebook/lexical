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
  DEFAULT_PAGE_SETUP,
  MIN_CONTENT_HEIGHT,
  MIN_CONTENT_WIDTH,
} from '../../plugins/PagesExtension/constants';
import {
  computeGeometry,
  computePageBreakMarginBottom,
  computePageCount,
  computeZoom,
  pageContentHeight,
  pageContentTop,
  pageIndexAtY,
  slotHeight,
} from '../../plugins/PagesExtension/layoutMath';

const setup: PageSetup = {
  ...DEFAULT_PAGE_SETUP,
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

  it('snaps vertical geometry to whole pixels', () => {
    const fractional: PageSetup = {
      ...setup,
      margins: {bottom: 0.4, left: 0.4, right: 0.4, top: 0.4},
    };
    const geom = computeGeometry(fractional, 35.2, 20.7, 0);
    expect(geom.marginTop).toBe(38);
    expect(geom.marginBottom).toBe(38);
    expect(geom.headerHeight).toBe(36);
    expect(geom.footerHeight).toBe(21);
    expect(
      geom.marginTop +
        geom.headerHeight +
        geom.contentHeight +
        geom.footerHeight +
        geom.marginBottom,
    ).toBe(geom.pageHeight);
    expect(Number.isInteger(geom.breakHeight)).toBe(true);
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

  it('counts content below the rendered breaks by content height alone', () => {
    // Deep margins: each band is several times taller than a page's
    // content. Content below the last rendered break has no bands in it
    // yet, so assuming a band per page would undercount by a wide margin
    // and take many passes to converge.
    const deep = computeGeometry(
      {...setup, margins: {bottom: 4.3, left: 0.5, right: 0.5, top: 4.3}},
      0,
      0,
      24,
    );
    const c = deep.contentHeight;
    expect(deep.breakHeight).toBeGreaterThan(3 * c);
    expect(computePageCount(deep.firstTop + 10 * c - 1, deep, 0)).toBe(10);
    expect(computePageCount(pageContentTop(2, deep) + 3 * c - 1, deep, 2)).toBe(
      5,
    );
    // Without the rendered-break count, every page is assumed to have one.
    expect(computePageCount(pageContentTop(2, deep) + c - 1, deep)).toBe(3);
  });
});

describe('computeGeometry with extreme margins', () => {
  it('keeps the vertical geometry inside the page', () => {
    const geom = computeGeometry(
      {...setup, margins: {bottom: 6, left: 0.5, right: 0.5, top: 6}},
      0,
      0,
      24,
    );
    expect(geom.contentHeight).toBeGreaterThanOrEqual(MIN_CONTENT_HEIGHT);
    expect(geom.marginTop + geom.contentHeight + geom.marginBottom).toBe(
      geom.pageHeight,
    );
  });

  it('keeps room for the content with tall headers and footers', () => {
    const geom = computeGeometry(
      {...setup, margins: {bottom: 2, left: 0.5, right: 0.5, top: 2}},
      400,
      400,
      24,
    );
    expect(
      geom.marginTop +
        geom.headerHeight +
        geom.contentHeight +
        geom.footerHeight +
        geom.marginBottom,
    ).toBe(geom.pageHeight);
  });

  it('keeps room for a line of text between the side margins', () => {
    const geom = computeGeometry(
      {...setup, margins: {bottom: 0.5, left: 4.2, right: 4.2, top: 0.5}},
      0,
      0,
      24,
    );
    expect(
      geom.pageWidth - geom.marginLeft - geom.marginRight,
    ).toBeGreaterThanOrEqual(MIN_CONTENT_WIDTH);
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

describe('per-page slot heights', () => {
  const withVariants: PageSetup = {
    ...setup,
    header: {differentEvenPages: true, differentFirstPage: true, enabled: true},
  };
  const geom = computeGeometry(withVariants, 0, 0, 24, {
    footer: {},
    header: {default: 20, even: 30, first: 80},
  });

  it('gives each page the band of the variant it shows', () => {
    expect(slotHeight(geom, 'header', 0)).toBe(80);
    expect(slotHeight(geom, 'header', 1)).toBe(30);
    expect(slotHeight(geom, 'header', 2)).toBe(20);
    expect(geom.firstTop).toBe(geom.marginTop + 80);
    expect(pageContentHeight(geom, 0)).toBe(1056 - 96 - 80);
    expect(pageContentHeight(geom, 2)).toBe(1056 - 96 - 20);
  });

  it('accumulates page tops from the actual band heights', () => {
    const top1 =
      geom.firstTop + pageContentHeight(geom, 0) + 0 + 48 + 24 + 48 + 30;
    expect(pageContentTop(1, geom)).toBe(top1);
    expect(pageIndexAtY(top1 - 1, geom)).toBe(0);
    expect(pageIndexAtY(top1, geom)).toBe(1);
    expect(computePageCount(top1 + 10, geom)).toBe(2);
    expect(computePageCount(pageContentTop(2, geom) + 1, geom)).toBe(3);
  });

  it('falls back to the default height for variants without content', () => {
    const partial = computeGeometry(withVariants, 0, 0, 24, {
      footer: {},
      header: {default: 20},
    });
    expect(slotHeight(partial, 'header', 0)).toBe(20);
    expect(slotHeight(partial, 'header', 1)).toBe(20);
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
