/** @module @lexical/selection */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $addNodeStyle,
  $cloneContents,
  $cloneWithProperties,
  $isAtNodeEnd,
  $patchStyleText,
  $sliceSelectedTextNodeContent,
  trimTextContentFromAnchor,
} from './lexical-node';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $moveCaretSelection,
  $moveCharacter,
  $selectAll,
  $shouldOverrideDefaultCharacterSelection,
  $wrapNodes,
  $wrapNodesImpl,
} from './range-selection';
import {
  createDOMRange,
  createRectsFromDOMRange,
  getStyleObjectFromCSS,
} from './utils';

export {
  $addNodeStyle,
  $cloneContents,
  $cloneWithProperties,
  $isAtNodeEnd,
  $patchStyleText,
  $sliceSelectedTextNodeContent,
  trimTextContentFromAnchor,
};

export {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $moveCaretSelection,
  $moveCharacter,
  $selectAll,
  $shouldOverrideDefaultCharacterSelection,
  $wrapNodes,
  $wrapNodesImpl,
};

export {createDOMRange, createRectsFromDOMRange, getStyleObjectFromCSS};
