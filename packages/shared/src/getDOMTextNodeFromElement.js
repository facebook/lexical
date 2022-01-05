/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export default function getDOMTextNodeFromElement(
  element: Node | null,
): null | Text {
  let node = element;
  while (node != null) {
    if (node.nodeType === 3) {
      // $FlowFixMe: nodeType === text node
      return node;
    }
    node = node.firstChild;
  }
  return null;
}
