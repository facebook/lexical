/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ScanningContext} from './utils';
import type {LexicalEditor, LexicalNode, ParagraphNode} from 'lexical';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
} from 'lexical';

import {getInitialScanningContext} from './utils';

function convertParagraphNodeContainingMarkdown(
  scanningContext: ScanningContext,
  paragraphNode: ParagraphNode,
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

export function convertMarkdownForParagraphs(
  paragraphs: Array<LexicalNode>,
  editor: LexicalEditor,
) {
  // Please see the declaration of ScanningContext for a detailed explanation.
  const scanningContext = getInitialScanningContext(editor, null, null);

  const countOfParagraphs = paragraphs.length;
  for (let parIndex = 0; parIndex < countOfParagraphs; parIndex++) {
    const paragraph = paragraphs[parIndex];

    if (
      $isParagraphNode(paragraph) &&
      paragraph.getTextContent().length &&
      paragraph.getChildren().length
    ) {
      convertParagraphNodeContainingMarkdown(scanningContext, paragraph);
    }
  }
}
