/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line strict
declare type WindowSelection = {
  anchorNode: Node | null,
  anchorOffset: number,
  focusNode: Node | null,
  focusOffset: number,
  isCollapsed: boolean,
  // Note that this is non-exhaustive, I just defined
  // what we use. Used MDN for reference:
  // https://developer.mozilla.org/en-US/docs/Web/API/Selection
};
