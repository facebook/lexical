/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {HashtagNode, registerLexicalHashtag} from '@lexical/hashtag';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export function HashtagPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([HashtagNode])) {
      throw new Error('HashtagPlugin: HashtagNode not registered on editor');
    }
    return registerLexicalHashtag(editor);
  }, [editor]);

  return null;
}
