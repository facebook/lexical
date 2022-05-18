/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ListItemNode, ListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

import {useList} from './shared/useList';

export function ListPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ListNode, ListItemNode])) {
      throw new Error(
        'ListPlugin: ListNode and/or ListItemNode not registered on editor',
      );
    }
  }, [editor]);

  useList(editor);

  return null;
}
