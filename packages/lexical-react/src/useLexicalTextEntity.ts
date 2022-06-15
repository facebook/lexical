/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EntityMatch} from '@lexical/text';
import type {TextNode} from 'lexical';
import type {Klass} from 'shared/types';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {registerLexicalTextEntity} from '@lexical/text';
import {mergeRegister} from '@lexical/utils';
import {useEffect} from 'react';

export function useLexicalTextEntity<N extends TextNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<N>,
  createNode: (textNode: TextNode) => N,
): void {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      ...registerLexicalTextEntity(editor, getMatch, targetNode, createNode),
    );
  }, [createNode, editor, getMatch, targetNode]);
}
