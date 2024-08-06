/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getEditorPropertyFromDOMNode} from 'lexical';

import {LexicalHTMLElement} from '../types';

export function isLexicalNode(
  node: LexicalHTMLElement | Element,
): node is LexicalHTMLElement {
  return getEditorPropertyFromDOMNode(node) !== undefined;
}
