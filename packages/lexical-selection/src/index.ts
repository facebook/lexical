/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $addNodeStyle,
  $cloneWithProperties,
  $isAtNodeEnd,
  $patchStyleText,
  $sliceSelectedTextNodeContent,
  $trimTextContentFromAnchor,
} from './lexical-node';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $moveCaretSelection,
  $moveCharacter,
  $selectAll,
  $setBlocksType,
  $shouldOverrideDefaultCharacterSelection,
  $wrapNodes,
} from './range-selection';
import {
  createDOMRange,
  createRectsFromDOMRange,
  getStyleObjectFromCSS,
} from './utils';

export {
  $addNodeStyle,
  $cloneWithProperties,
  $isAtNodeEnd,
  $patchStyleText,
  $sliceSelectedTextNodeContent,
  $trimTextContentFromAnchor,
};
/** @deprecated renamed to {@link $trimTextContentFromAnchor} by @lexical/eslint-plugin rules-of-lexical */
export const trimTextContentFromAnchor = $trimTextContentFromAnchor;

export {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $moveCaretSelection,
  $moveCharacter,
  $selectAll,
  $setBlocksType,
  $shouldOverrideDefaultCharacterSelection,
  $wrapNodes,
};

export {createDOMRange, createRectsFromDOMRange, getStyleObjectFromCSS};
