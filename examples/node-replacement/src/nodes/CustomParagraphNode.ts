/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $applyNodeReplacement,
  EditorConfig,
  ParagraphNode,
  SerializedParagraphNode,
} from 'lexical';

export class CustomParagraphNode extends ParagraphNode {
  static getType() {
    return 'custom-paragraph';
  }
  static clone(node: CustomParagraphNode): CustomParagraphNode {
    return new CustomParagraphNode(node.__key);
  }
  static importJSON(json: SerializedParagraphNode): CustomParagraphNode {
    return $createCustomParagraphNode().updateFromJSON(json);
  }
  createDOM(config: EditorConfig) {
    const el = super.createDOM(config);
    // Normally this sort of thing would be done with the theme, this is for
    // demonstration purposes only
    el.style.border = '1px dashed black';
    el.style.background = 'linear-gradient(to top, #f7f8f8, #acbb78)';
    return el;
  }
}

export function $createCustomParagraphNode() {
  return $applyNodeReplacement(new CustomParagraphNode());
}
