/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, OutlineNode, EditorThemeClasses} from 'outline';

import {TextNode} from 'outline';

export class OutlineOverflowedTextNode extends TextNode {
  static deserialize(data: $FlowFixMe): TextNode {
    return new OutlineOverflowedTextNode(data.__text);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__type = 'overflowed';
  }

  clone(): OutlineOverflowedTextNode {
    return new OutlineOverflowedTextNode(this.__text, this.__key);
  }

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = super.createDOM(editorThemeClasses);
    if (editorThemeClasses.overflowed) {
      element.className = editorThemeClasses.overflowed;
    }
    return element;
  }
}

export function createOverflowedTextNode(text?: string = ''): TextNode {
  return new OutlineOverflowedTextNode(text);
}

export function isOverflowedTextNode(node: ?OutlineNode): boolean %checks {
  return node instanceof OutlineOverflowedTextNode;
}
