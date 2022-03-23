/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {$getSelection, $isRangeSelection} from 'lexical';
import {useEffect} from 'react';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function HorizontalRulePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommandListener((type) => {
      if (type === 'insertHorizontalRule') {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const focusNode = selection.focus.getNode();
        if (focusNode !== null) {
          const horizontalRuleNode = $createHorizontalRuleNode();
          selection.insertParagraph();
          selection.focus
            .getNode()
            .getTopLevelElementOrThrow()
            .insertBefore(horizontalRuleNode);
        }

        return true;
      }
      return false;
    }, EditorPriority);
  }, [editor]);

  return null;
}
