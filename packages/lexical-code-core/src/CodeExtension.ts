/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  mergeRegister,
} from 'lexical';

import {CodeHighlightNode} from './CodeHighlightNode';
import {$exitCodeNodeOnEnter, $isCodeNode, CodeNode} from './CodeNode';

const $onEscapeUp = () => {
  const selection = $getSelection();
  if (
    $isRangeSelection(selection) &&
    selection.isCollapsed() &&
    selection.anchor.offset === 0
  ) {
    const code = $findMatchingParent(selection.anchor.getNode(), $isCodeNode);

    if ($isCodeNode(code)) {
      const parent = code.getParent();
      if (parent !== null && parent.getFirstChild() === code) {
        const contentParagraph = code.getFirstDescendant();
        if (
          contentParagraph !== null &&
          selection.anchor.key === contentParagraph.getKey()
        ) {
          code.insertBefore($createParagraphNode());
        }
      }
    }
  }

  return false;
};

const $onEscapeDown = () => {
  const selection = $getSelection();
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const code = $findMatchingParent(selection.anchor.getNode(), $isCodeNode);

    if ($isCodeNode(code)) {
      const parent = code.getParent();
      if (parent !== null && parent.getLastChild() === code) {
        const contentParagraph = code.getLastDescendant();
        if (
          contentParagraph !== null &&
          selection.anchor.key === contentParagraph.getKey() &&
          selection.anchor.offset === contentParagraph.getTextContentSize()
        ) {
          code.insertAfter($createParagraphNode());
        }
      }
    }
  }

  return false;
};

/**
 * Add code blocks to the editor (syntax highlighting provided separately)
 */
export const CodeExtension = defineExtension({
  name: '@lexical/code',
  nodes: () => [CodeNode, CodeHighlightNode],
  register(editor) {
    return mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ENTER_COMMAND,
        (event) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && $exitCodeNodeOnEnter(selection)) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      // When collapsible is the last child pressing down/right arrow will insert paragraph
      // below it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if trailing paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        $onEscapeDown,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        $onEscapeDown,
        COMMAND_PRIORITY_LOW,
      ),
      // When collapsible is the first child pressing up/left arrow will insert paragraph
      // above it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if leading paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        $onEscapeUp,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        $onEscapeUp,
        COMMAND_PRIORITY_LOW,
      ),
    );
  },
});
