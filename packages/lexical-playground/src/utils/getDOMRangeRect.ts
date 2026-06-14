/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getDOMSelectionRangeAndPoints} from 'lexical';

export function getDOMRangeRect(
  nativeSelection: Selection,
  rootElement: HTMLElement,
): DOMRect {
  const {points, range} = getDOMSelectionRangeAndPoints(
    nativeSelection,
    rootElement,
  );
  if (points.anchorNode === rootElement || range === null) {
    let inner = rootElement;
    while (inner.firstElementChild != null) {
      inner = inner.firstElementChild as HTMLElement;
    }
    return inner.getBoundingClientRect();
  }
  return range.getBoundingClientRect();
}
