/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Selection, TextNode} from 'outline';

import {isTextNode} from 'outline';
import {getStyleObjectFromCSS} from 'outline/SelectionHelpers';

export function getSelectionFontSize(
  selection: Selection,
  defaultValue: string = '',
): string {
  let fontSize = null;
  const nodes = selection.getNodes();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isTextNode(node)) {
      const nodeFontSize = getNodeFontSize(node, defaultValue);
      if (fontSize === null) {
        fontSize = nodeFontSize;
      } else if (fontSize !== nodeFontSize) {
        // multiple text nodes are in the selection and they don't all
        // have the same font size.
        fontSize = '';
        break;
      }
    }
  }
  return fontSize || '';
}

function getNodeFontSize(node: TextNode, defaultValue: string): string {
  const css = node.getStyle();
  const styleObject = getStyleObjectFromCSS(css);
  return styleObject ? styleObject['font-size'] : defaultValue;
}
