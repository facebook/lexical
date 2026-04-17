/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_ENTER_COMMAND,
} from 'lexical';

import {CodeHighlightNode} from './CodeHighlightNode';
import {$isCodeNode, CodeNode} from './CodeNode';

/**
 * Add code blocks to the editor (syntax highlighting provided separately)
 */
export const CodeExtension = defineExtension({
  name: '@lexical/code',
  nodes: () => [CodeNode, CodeHighlightNode],
  register(editor) {
    return editor.registerCommand<KeyboardEvent>(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        const {anchor} = selection;
        if (anchor.type !== 'element') {
          return false;
        }
        const codeNode = anchor.getNode();
        if (!$isCodeNode(codeNode)) {
          return false;
        }
        const children = codeNode.getChildren();
        const childrenLength = children.length;
        if (
          childrenLength >= 2 &&
          children[childrenLength - 1].getTextContent() === '\n' &&
          children[childrenLength - 2].getTextContent() === '\n' &&
          anchor.offset === childrenLength
        ) {
          event.preventDefault();
          children[childrenLength - 1].remove();
          children[childrenLength - 2].remove();
          const newElement = $createParagraphNode();
          codeNode.insertAfter(newElement, true);
          newElement.select();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  },
});
