/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageSetup, PageSize, PageSlotSetup} from './types';

export const PAGE_SIZES: Record<
  PageSize,
  {width: number; height: number; label: string}
> = {
  A3: {height: 1587, label: 'A3 (11.69" x 16.54")', width: 1123},
  A4: {height: 1123, label: 'A4 (8.27" x 11.69")', width: 794},
  A5: {height: 794, label: 'A5 (5.83" x 8.27")', width: 559},
  B4: {height: 1334, label: 'B4 (9.84" x 13.90")', width: 945},
  B5: {height: 945, label: 'B5 (6.93" x 9.84")', width: 665},
  Executive: {height: 1008, label: 'Executive (7.25" x 10.5")', width: 696},
  Folio: {height: 1248, label: 'Folio (8.5" x 13")', width: 816},
  Legal: {height: 1344, label: 'Legal (8.5" x 14")', width: 816},
  Letter: {height: 1056, label: 'Letter (8.5" x 11")', width: 816},
  Statement: {height: 816, label: 'Statement (5.5" x 8.5")', width: 528},
  Tabloid: {height: 1632, label: 'Tabloid (11" x 17")', width: 1056},
};

export const DEFAULT_SLOT_SETUP: PageSlotSetup = {
  differentEvenPages: false,
  differentFirstPage: false,
  enabled: false,
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  footer: DEFAULT_SLOT_SETUP,
  header: DEFAULT_SLOT_SETUP,
  margins: {
    bottom: 0.4,
    left: 0.4,
    right: 0.4,
    top: 0.4,
  },
  orientation: 'portrait',
  pageSize: 'A4',
};

/** Pixels per CSS inch; margins are stored in inches. */
export const PX_PER_INCH = 96;
/** Visual gap between two pages on screen, in CSS px. */
export const PAGE_GAP = 24;
/**
 * Smallest content area a page may have, in CSS px. Guards the page-count
 * math against a page setup whose margins (plus header/footer) exceed the
 * page height, which would otherwise produce an unbounded page count.
 */
export const MIN_CONTENT_HEIGHT = 48;
/** A header or footer may take at most this fraction of the page height. */
export const MAX_SLOT_HEIGHT_RATIO = 0.4;
/**
 * Update tag on the parent editor updates that write header/footer content
 * back from the nested editors, so the write-back is not mistaken for an
 * external change (undo, collaboration) that must reload those editors.
 */
export const HEADER_FOOTER_COMMIT_TAG = 'pages-header-footer-commit';
/** Debounce for writing nested header/footer edits back to the root. */
export const SLOT_WRITE_BACK_DELAY_MS = 300;
