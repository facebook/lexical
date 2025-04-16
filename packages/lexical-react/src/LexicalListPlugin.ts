/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  ListItemNode,
  ListNode,
  registerListStrictIndentTransform,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

import {useList} from './shared/useList';

export interface ListPluginProps {
  /**
   * When `true`, enforces strict indentation rules for list items, ensuring consistent structure.
   * When `false` (default), indentation is more flexible.
   */
  hasStrictIndent?: boolean;
}

export function ListPlugin({hasStrictIndent = false}: ListPluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ListNode, ListItemNode])) {
      throw new Error(
        'ListPlugin: ListNode and/or ListItemNode not registered on editor',
      );
    }
  }, [editor]);

  useEffect(() => {
    if (!hasStrictIndent) {
      return;
    }

    return registerListStrictIndentTransform(editor);
  }, [editor, hasStrictIndent]);

  useList(editor);

  return null;
}
