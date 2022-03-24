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
    return editor.registerCommandListener(
      'indentContent',
      () => {
        const hasHandledIndention = indentList();
        if (hasHandledIndention) {
          return true;
        }
        return false;
      },
      LowPriority,
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommandListener(
      'outdentContent',
      () => {
        const hasHandledIndention = outdentList();
        if (hasHandledIndention) {
          return true;
        }
        return false;
      },
      LowPriority,
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommandListener(
      'insertOrderedList',
      () => {
        insertList(editor, 'ol');
        return true;
      },
      LowPriority,
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommandListener(
      'insertUnorderedList',
      () => {
        insertList(editor, 'ul');
        return true;
      },
      LowPriority,
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommandListener(
      'removeList',
      () => {
        removeList(editor);
        return true;
      },
      LowPriority,
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommandListener(
      'insertParagraph',
      () => {
        const hasHandledInsertParagraph = $handleListInsertParagraph();
        if (hasHandledInsertParagraph) {
          return true;
        }
        return false;
      },
      LowPriority,
    );
  }, [editor]);
}
