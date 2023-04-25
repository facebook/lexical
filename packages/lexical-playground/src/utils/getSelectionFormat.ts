/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$getRoot, ElementFormatType, RangeSelection} from 'lexical';

export function getSelectionFormat(
  selection: RangeSelection,
): ElementFormatType {
  const nodes = selection.getNodes();
  const formatSet = new Set<ElementFormatType>();

  for (let i = 0; i < nodes.length; i++) {
    const parent = nodes[i].getParent();

    if (parent !== $getRoot() && parent != null) {
      formatSet.add(parent.getFormatType());
    }
  }

  return formatSet.size === 1 ? formatSet.values().next().value : '';
}
