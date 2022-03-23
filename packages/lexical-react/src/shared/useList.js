/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerLowPriority, LexicalEditor} from 'lexical';

import {
  $handleListInsertParagraph,
  indentList,
  insertList,
  outdentList,
  removeList,
} from '@lexical/list';
import {useEffect} from 'react';

const LowPriority: CommandListenerLowPriority = 1;

export default function useList(editor: LexicalEditor): void {
  useEffect(() => {
    return editor.registerCommandListener((type) => {
      if (type === 'indentContent') {
        const hasHandledIndention = indentList();
        if (hasHandledIndention) {
          return true;
        }
      } else if (type === 'outdentContent') {
        const hasHandledIndention = outdentList();
        if (hasHandledIndention) {
          return true;
        }
      } else if (type === 'insertOrderedList') {
        insertList(editor, 'ol');
        return true;
      } else if (type === 'insertUnorderedList') {
        insertList(editor, 'ul');
        return true;
      } else if (type === 'removeList') {
        removeList(editor);
        return true;
      } else if (type === 'insertParagraph') {
        const hasHandledInsertParagraph = $handleListInsertParagraph();
        if (hasHandledInsertParagraph) {
          return true;
        }
      }
      return false;
    }, LowPriority);
  }, [editor]);
}
