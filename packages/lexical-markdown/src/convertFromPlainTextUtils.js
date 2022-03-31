/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ScanningContext} from './utils';
import type {
  ElementNode,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
} from 'lexical';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {getAllMarkdownCriteria} from './autoFormatUtils';
import {
  getInitialScanningContext,
  getPatternMatchResultsForParagraphs,
  resetScanningContext,
} from './utils';

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

function convertElementNodeContainingMarkdown(
  scanningContext: ScanningContext,
  elementNode: ElementNode,
) {
  // Handle code block to be done.
  // Handle paragraph nodes below.
  if ($isParagraphNode(elementNode)) {
    const paragraphNode: ParagraphNode = elementNode;
    const allCriteria = getAllMarkdownCriteria();
    const count = allCriteria.length;
    for (let i = 0; i < count; i++) {
      const criteria = allCriteria[i];
      if (criteria.requiresParagraphStart === true) {
        const firstChild = paragraphNode.getFirstChild();
        invariant(
          $isTextNode(firstChild),
          'Expect paragraph containing only text nodes.',
        );
        scanningContext.textNodeWithOffset = {
          node: firstChild,
          offset: 0,
        };
        scanningContext.joinedText = paragraphNode.getTextContent();

        const patternMatchResults = getPatternMatchResultsForParagraphs(
          criteria,
          scanningContext,
        );

        if (patternMatchResults != null) {
          // Lazy fill-in the particular format criteria and any matching result information.
          scanningContext.markdownCriteria = criteria;
          scanningContext.patternMatchResults = patternMatchResults;

          // Todo: perform text transformation here.
        }
      }
    }
  }
}

export function convertMarkdownForElementNodes(
  elementNodes: Array<LexicalNode>,
  editor: LexicalEditor,
) {
  // Please see the declaration of ScanningContext for a detailed explanation.
  const scanningContext = getInitialScanningContext(editor, false, null, null);

  const count = elementNodes.length;
  for (let i = 0; i < count; i++) {
    const elementNode = elementNodes[i];

    if (
      $isElementNode(elementNode) &&
      elementNode.getTextContent().length &&
      elementNode.getChildren().length
    ) {
      convertElementNodeContainingMarkdown(scanningContext, elementNode);
    }
    // Reset the scanning information that relates to the particular element node.
    resetScanningContext(scanningContext);
  }
}
