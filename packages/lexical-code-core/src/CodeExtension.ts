/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_ENTER_COMMAND,
} from 'lexical';

import {CodeHighlightNode} from './CodeHighlightNode';
import {$exitCodeNodeOnEnter, CodeNode} from './CodeNode';

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
        if ($isRangeSelection(selection) && $exitCodeNodeOnEnter(selection)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  },
});
