/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import {registerMarkdownShortcuts, TRANSFORMERS} from '@lexical/markdown';
import {useEffect} from 'react';

export default function useLexicalAutoFormatter(editor: LexicalEditor): void {
  useEffect(() => {
    return registerMarkdownShortcuts(editor, TRANSFORMERS);
  }, [editor]);
}
