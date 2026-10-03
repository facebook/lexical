/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export {
  DEFAULT_PAGE_SETUP,
  DEFAULT_SLOT_SETUP,
  PAGE_GAP,
  PAGE_SIZES,
} from './constants';
export {
  $getPageFooter,
  $getPageHeader,
  $getPageSlotContent,
  $setPageFooter,
  $setPageHeader,
  $setPageSlotContent,
  buildHeaderFooterEditor,
  CLOSE_PAGE_SLOT_COMMAND,
  EDIT_PAGE_SLOT_COMMAND,
  HeaderFooterEditorExtension,
  PAGE_SLOT_VARIANTS,
  pageFooterState,
  pageHeaderState,
  resolveSlotVariant,
  type SlotEditorBuilder,
  slotStateFor,
} from './headerFooter';
export {
  HeaderFooterSession,
  type HeaderFooterSessionOptions,
} from './HeaderFooterSession';
export {
  computeGeometry,
  computePageBreakMarginBottom,
  computePageCount,
  computeZoom,
  pageBreakHeight,
  pageContentHeight,
  pageContentTop,
  pageIndexAtY,
  slotHeight,
} from './layoutMath';
export {
  $createPageCountNode,
  $createPageNumberNode,
  $isPageCountNode,
  $isPageNumberNode,
  $writeCountersIntoEditor,
  INSERT_PAGE_COUNT_COMMAND,
  INSERT_PAGE_NUMBER_COMMAND,
  PAGE_COUNT_ATTRIBUTE,
  PAGE_NUMBER_ATTRIBUTE,
  PageCounterNodesExtension,
  PageCountNode,
  PageNumberNode,
  writeCountersIntoDOM,
} from './PageCounterNodes';
export {
  $getPageSetup,
  $setPageSetup,
  marginsIsEqual,
  pageSetupState,
  slotSetupIsEqual,
} from './pageSetup';
export {type PagesConfig, PagesExtension} from './PagesExtension';
export {
  PagesLayout,
  type PagesLayoutOptions,
  type PagesLayoutSlotProvider,
} from './PagesLayout';
export {registerPrintHandlers} from './print';
export type {
  ActivePageSlot,
  Orientation,
  PageGeometry,
  PageSetup,
  PageSize,
  PageSlotContent,
  PageSlotKind,
  PageSlotSetup,
  PageSlotVariant,
  SlotHeights,
} from './types';
