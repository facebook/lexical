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
  DecoratorNode,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
  RootNode,
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
  getCodeBlockCriteria,
  getInitialScanningContext,
  getPatternMatchResultsForCodeBlock,
  getPatternMatchResultsForParagraphs,
  resetScanningContext,
  transformTextNodeForElementNode,
} from './utils';

export function convertStringToLexical(
  text: string,
  editor: LexicalEditor,
): null | RootNode {
  if (!text.length) {
    return null;
  }
  const nodes = [];
  const splitLines = text.split('\n');
  const splitLinesCount = splitLines.length;
  for (let i = 0; i < splitLinesCount; i++) {
    if (splitLines[i].length > 0) {
      nodes.push($createParagraphNode().append($createTextNode(splitLines[i])));
    } else {
      nodes.push($createParagraphNode());
    }
  }
  if (nodes.length) {
    const root = $getRoot();
    root.clear();
    root.append(...nodes);
    return root;
  }
  return null;
}

function convertElementNodeContainingMarkdown<T>(
  scanningContext: ScanningContext,
  elementNode: ElementNode,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  const textContent = elementNode.getTextContent();

  // Handle paragraph nodes below.
  if ($isParagraphNode(elementNode)) {
    const paragraphNode: ParagraphNode = elementNode;
    const firstChild = paragraphNode.getFirstChild();
    const firstChildIsTextNode = $isTextNode(firstChild);

    // Handle conversion to code block.
    if (scanningContext.isWithinCodeBlock === true) {
      if (firstChild != null && firstChildIsTextNode) {
        // Test if we encounter ending code block.
        scanningContext.textNodeWithOffset = {
          node: firstChild,
          offset: 0,
        };
        const patternMatchResults = getPatternMatchResultsForCodeBlock(
          scanningContext,
          textContent,
        );
        if (patternMatchResults != null) {
          // Toggle transform to or from code block.
          scanningContext.patternMatchResults = patternMatchResults;
        }
      }

      scanningContext.markdownCriteria = getCodeBlockCriteria();

      // Perform text transformation here.
      transformTextNodeForElementNode(
        elementNode,
        scanningContext,
        createHorizontalRuleNode,
      );
      return;
    }

    if (elementNode.getChildren().length) {
      const allCriteria = getAllMarkdownCriteria();
      const count = allCriteria.length;
      for (let i = 0; i < count; i++) {
        const criteria = allCriteria[i];
        if (criteria.requiresParagraphStart === true) {
          invariant(
            firstChild != null && firstChildIsTextNode,
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

            // Perform text transformation here.
            transformTextNodeForElementNode(
              elementNode,
              scanningContext,
              createHorizontalRuleNode,
            );
            return;
          }
        }
      }
    }
  }
}

export function convertMarkdownForElementNodes<T>(
  editor: LexicalEditor,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  // Please see the declaration of ScanningContext for a detailed explanation.
  const scanningContext = getInitialScanningContext(editor, false, null, null);

  const root = $getRoot();
  let done = false;
  let startIndex = 0;

  while (!done) {
    done = true;

    const elementNodes: Array<LexicalNode> = root.getChildren();
    const countOfElementNodes = elementNodes.length;

    for (let i = startIndex; i < countOfElementNodes; i++) {
      const elementNode = elementNodes[i];

      if ($isElementNode(elementNode)) {
        convertElementNodeContainingMarkdown(
          scanningContext,
          elementNode,
          createHorizontalRuleNode,
        );
      }
      // Reset the scanning information that relates to the particular element node.
      resetScanningContext(scanningContext);

      if (root.getChildren().length !== countOfElementNodes) {
        // The conversion added or removed an from root's children.
        startIndex = i;
        done = false;
        break;
      }
    }
  } // while
}
