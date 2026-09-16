/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageGeometry, PageSetup} from './types';

import {
  MIN_CONTENT_HEIGHT,
  PAGE_GAP,
  PAGE_SIZES,
  PX_PER_INCH,
} from './constants';

/**
 * Tolerance, in CSS px, applied when deciding whether content that ends
 * exactly on a page boundary still fits on that page. Sub-pixel layout
 * rounding must not open a new empty page.
 */
const BOUNDARY_EPSILON = 0.5;

export function pageSizeInPixels(pageSetup: PageSetup): {
  width: number;
  height: number;
} {
  const size = PAGE_SIZES[pageSetup.pageSize];
  return pageSetup.orientation === 'portrait'
    ? {height: size.height, width: size.width}
    : {height: size.width, width: size.height};
}

export function inchesToPixels(inches: number): number {
  return Math.round(inches * PX_PER_INCH * 10) / 10;
}

/**
 * Derive the page geometry for a page setup and the measured header/footer
 * heights. All values are CSS px in the host's coordinate space.
 *
 * Vertical values are whole pixels, so that top margin + header + content +
 * footer + bottom margin is exactly the (whole) page height. The same
 * geometry is printed with the gap collapsed to zero, and browsers lay out
 * in 1/64 px units: a band that overshoots a printed page boundary by one
 * such unit is pushed to the next page, so every boundary must be exact.
 */
export function computeGeometry(
  pageSetup: PageSetup,
  headerHeight: number = 0,
  footerHeight: number = 0,
  gap: number = PAGE_GAP,
): PageGeometry {
  const {width: pageWidth, height: pageHeight} = pageSizeInPixels(pageSetup);
  const marginTop = Math.round(inchesToPixels(pageSetup.margins.top));
  const marginRight = inchesToPixels(pageSetup.margins.right);
  const marginBottom = Math.round(inchesToPixels(pageSetup.margins.bottom));
  const marginLeft = inchesToPixels(pageSetup.margins.left);
  headerHeight = Math.ceil(headerHeight);
  footerHeight = Math.ceil(footerHeight);
  const contentHeight = Math.max(
    MIN_CONTENT_HEIGHT,
    pageHeight - marginTop - marginBottom - headerHeight - footerHeight,
  );
  const breakHeight =
    footerHeight + marginBottom + gap + marginTop + headerHeight;
  return {
    breakHeight,
    contentHeight,
    firstTop: marginTop + headerHeight,
    footerHeight,
    gap,
    headerHeight,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    pageHeight,
    pageWidth,
  };
}

/** Host-relative top of the content area of the page at `pageIndex` (0-based). */
export function pageContentTop(pageIndex: number, geom: PageGeometry): number {
  return geom.firstTop + pageIndex * (geom.contentHeight + geom.breakHeight);
}

/**
 * Number of pages needed so that the content area of the last page reaches
 * `contentBottom` (the host-relative bottom of the editor root). Exact when
 * `contentBottom` was measured with `pageCount - 1` breaks in place; otherwise
 * the next measurement after applying the count is exact.
 */
export function computePageCount(
  contentBottom: number,
  geom: PageGeometry,
): number {
  const stride = geom.contentHeight + geom.breakHeight;
  return Math.max(
    1,
    Math.ceil(
      (contentBottom - geom.firstTop + geom.breakHeight - BOUNDARY_EPSILON) /
        stride,
    ),
  );
}

/** Index of the page whose stride contains the host-relative `y`. */
export function pageIndexAtY(y: number, geom: PageGeometry): number {
  return Math.max(
    0,
    Math.floor((y - geom.firstTop) / (geom.contentHeight + geom.breakHeight)),
  );
}

/**
 * Bottom margin that pushes whatever follows a manual page break (with
 * host-relative `top` and `height`) to the content top of the next page.
 * Depends only on the break's own position, so re-applying it is idempotent.
 */
export function computePageBreakMarginBottom(
  top: number,
  height: number,
  geom: PageGeometry,
): number {
  const nextPage = pageIndexAtY(top, geom) + 1;
  return Math.max(0, pageContentTop(nextPage, geom) - (top + height));
}

/** Scale that fits a page of `pageWidth` into `availableWidth`, capped at 1. */
export function computeZoom(availableWidth: number, pageWidth: number): number {
  if (!(pageWidth > 0) || !(availableWidth > 0)) {
    return 1;
  }
  return Math.min(1, Math.round((availableWidth / pageWidth) * 1e6) / 1e6);
}
