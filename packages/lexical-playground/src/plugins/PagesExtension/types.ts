/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {SerializedEditorState} from 'lexical';

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

/** Settings of one header or footer band. */
export interface PageSlotSetup {
  /** Render the band on every page. */
  enabled: boolean;
  /** Give page 1 its own content. */
  differentFirstPage: boolean;
  /** Give even page numbers (2, 4, ...) their own content. */
  differentEvenPages: boolean;
}

export interface PageSetup {
  pageSize: PageSize;
  orientation: Orientation;
  /** Margins in inches. */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header: PageSlotSetup;
  footer: PageSlotSetup;
}

export type PageSlotKind = 'header' | 'footer';

/**
 * Which header/footer content a page shows: `first` on page 1 when
 * `differentFirstPage` is on, `even` on even page numbers when
 * `differentEvenPages` is on, otherwise `default`.
 */
export type PageSlotVariant = 'default' | 'first' | 'even';

/** Serialized nested-editor states per variant, stored on the RootNode. */
export type PageSlotContent = Partial<
  Record<PageSlotVariant, SerializedEditorState | null>
>;

/** The header or footer slot currently open for editing. */
export interface ActivePageSlot {
  kind: PageSlotKind;
  variant: PageSlotVariant;
  pageIndex: number;
}

/**
 * Resolved page geometry in CSS px (in the page host's own coordinate space,
 * unaffected by zoom). Every value is derived from a {@link PageSetup} plus
 * the measured header/footer heights, see `computeGeometry`.
 */
/** Measured heights of header/footer content, per variant, in CSS px. */
export interface SlotHeights {
  header: Partial<Record<PageSlotVariant, number>>;
  footer: Partial<Record<PageSlotVariant, number>>;
}

export interface PageGeometry {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  /** Header/footer band heights of the `default` variant. */
  headerHeight: number;
  footerHeight: number;
  /** Band heights per variant (a missing variant falls back to `default`). */
  slotHeights: SlotHeights;
  headerSetup: PageSlotSetup;
  footerSetup: PageSlotSetup;
  gap: number;
  /**
   * Height of the editable area of a page showing the `default` header and
   * footer (`C`). Pages showing another variant may differ, see
   * `pageContentHeight`.
   */
  contentHeight: number;
  /**
   * Height of the non-editable band between two `default` pages (`Bk`):
   * footer, bottom margin, gap, top margin and header of the next page.
   */
  breakHeight: number;
  /** Distance from the host's top to the first page's content (`H0`). */
  firstTop: number;
}
