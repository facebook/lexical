/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Transformer} from '@lexical/markdown';

import {registerMarkdownShortcuts} from '@lexical/markdown';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export default function LexicalMarkdownShortcutPlugin({
  transformers,
}: $ReadOnly<{transformers: Array<Transformer>}>): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerMarkdownShortcuts(editor, transformers);
  }, [editor, transformers]);
  return null;
}
