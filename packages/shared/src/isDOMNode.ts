/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export const getDefaultView = (value: Node): Window | null => {
  return (
    (value && value.ownerDocument && value.ownerDocument.defaultView) || null
  );
};

/**
 * Check if a value is a DOM node.
 */
export default function isDOMNode(value: Node): value is Node {
  const window = getDefaultView(value);
  return !!window && value instanceof Node;
}
