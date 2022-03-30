/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ScanningContext} from './utils';
import type {LexicalEditor} from 'lexical';

import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

export function convertParagraphNodeFromPlainText(
  scanningContext: ScanningContext,
) {
  // To be implemented
}

export function convertStringToLexical(
  text: string,
  editor: LexicalEditor,
): void {
  const nodes = text
    .split('\n')
    .map((splitText) =>
      $createParagraphNode().append($createTextNode(splitText)),
    );

  const root = $getRoot();
  root.clear();
  root.append(...nodes);
}
