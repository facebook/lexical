/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HashtagNode, registerLexicalHashtag} from '@lexical/hashtag';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type JSX, useEffect} from 'react';

/**
 * Enables hashtag support by transforming runs of text that begin with `#`
 * into {@link HashtagNode}s. The editor must have the {@link HashtagNode}
 * registered.
 *
 * This is a legacy plugin. When building an editor with the extension API,
 * configure {@link HashtagExtension} instead.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
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
