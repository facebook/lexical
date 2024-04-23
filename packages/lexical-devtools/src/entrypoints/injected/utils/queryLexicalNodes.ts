/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LexicalHTMLElement} from '../../../types';
import {isLexicalNode} from '../../../utils/isLexicalNode';

export default function queryLexicalNodes(): LexicalHTMLElement[] {
  return Array.from(
    document.querySelectorAll('div[data-lexical-editor]'),
  ).filter(isLexicalNode);
}
