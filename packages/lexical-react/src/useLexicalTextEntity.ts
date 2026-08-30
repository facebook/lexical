/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type EntityMatch, registerLexicalTextEntity} from '@lexical/text';
import {type Klass, mergeRegister, type TextNode} from 'lexical';
import {useEffect} from 'react';

/**
 * Registers a text entity on the current editor: text matched by `getMatch` is
 * automatically wrapped in instances of `targetNode` (created via `createNode`)
 * and unwrapped when it no longer matches. This is the React wrapper around
 * `registerLexicalTextEntity` and is the basis for features such as hashtags
 * and mentions.
 */
export function useLexicalTextEntity<T extends TextNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: (textNode: TextNode) => T,
): void {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      ...registerLexicalTextEntity(editor, getMatch, targetNode, createNode),
    );
  }, [createNode, editor, getMatch, targetNode]);
}
