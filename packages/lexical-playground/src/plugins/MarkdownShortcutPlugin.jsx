/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @flow strict
 */

import {v2} from '@lexical/markdown';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

import {TRANSFORMERS} from './MarkdownTransformers';

const {registerMarkdownShortcuts} = v2;

export default function MarkdownPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerMarkdownShortcuts(editor, ...TRANSFORMERS);
  }, [editor]);

  return null;
}
