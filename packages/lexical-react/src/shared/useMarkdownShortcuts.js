/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import {registerMarkdownShortcuts} from '@lexical/markdown';
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {useEffect} from 'react';

export default function useMarkdownShortcuts(editor: LexicalEditor): void {
  useEffect(() => {
    return registerMarkdownShortcuts(editor, $createHorizontalRuleNode);
  }, [editor]);
}
