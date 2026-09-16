/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export type PageSize =
  | 'Letter'
  | 'Tabloid'
  | 'Legal'
  | 'Statement'
  | 'Executive'
  | 'Folio'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B4'
  | 'B5';

export type Orientation = 'portrait' | 'landscape';

export interface PageSetup {
  pageSize: PageSize;
  orientation: Orientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export type PageSlotKind = 'header' | 'footer';

/**
 * Resolved page geometry in CSS px (in the page host's own coordinate space,
 * unaffected by zoom). Every value is derived from a {@link PageSetup} plus
 * the measured header/footer heights, see `computeGeometry`.
 */
export interface PageGeometry {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  headerHeight: number;
  footerHeight: number;
  gap: number;
  /** Height of the editable area of one page (`C`). */
  contentHeight: number;
  /**
   * Height of the non-editable band between two pages (`Bk`): footer, bottom
   * margin, gap, top margin and header of the next page.
   */
  breakHeight: number;
  /** Distance from the host's top to the first page's content (`H0`). */
  firstTop: number;
}
