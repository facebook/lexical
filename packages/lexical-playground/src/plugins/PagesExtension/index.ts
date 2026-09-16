/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export {DEFAULT_PAGE_SETUP, PAGE_GAP, PAGE_SIZES} from './constants';
export {
  computeGeometry,
  computePageBreakMarginBottom,
  computePageCount,
  computeZoom,
  pageContentTop,
  pageIndexAtY,
} from './layoutMath';
export {
  $createPageContentNode,
  $createPageNode,
  $isPageContentNode,
  $isPageNode,
  PageContentNode,
  PageNode,
  registerLegacyPageUnwrap,
} from './legacy';
export {$getPageSetup, $setPageSetup, pageSetupState} from './pageSetup';
export {type PagesConfig, PagesExtension} from './PagesExtension';
export {
  PagesLayout,
  type PagesLayoutOptions,
  type PagesLayoutSlotProvider,
} from './PagesLayout';
export type {
  Orientation,
  PageGeometry,
  PageSetup,
  PageSize,
  PageSlotKind,
} from './types';
