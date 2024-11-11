/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {LexicalHTMLElement} from '../../../types';
import queryLexicalNodes from './queryLexicalNodes';

export function queryLexicalEditorByKey(
  key: string,
): LexicalEditor | undefined {
  return queryLexicalNodes()
    .map((node) => node.__lexicalEditor)
    .find((lexicalEditor) => lexicalEditor._key === key);
}

export function queryLexicalNodeByKey(
  key: string,
): LexicalHTMLElement | undefined {
  return queryLexicalNodes().find((node) => node.__lexicalEditor._key === key);
}
