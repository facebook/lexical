/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerCheckList} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export function CheckListPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCheckList(editor);
  }, [editor]);
  return null;
}
