/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import type {ScanningContext} from './utils';
import type {
  DecoratorNode,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
  RootNode,
  TextNode,
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

import {
  getAllMarkdownCriteriaForParagraphs,
  getAllMarkdownCriteriaForTextNodes,
  getCodeBlockCriteria,
  getInitialScanningContext,
  getParentElementNodeOrThrow,
  getPatternMatchResultsForCodeBlock,
  getPatternMatchResultsForCriteria,
  resetScanningContext,
  transformTextNodeForMarkdownCriteria,
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
export function convertMarkdownForElementNodes<T>(
  editor: LexicalEditor,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  // Please see the declaration of ScanningContext for a detailed explanation.
  const scanningContext = getInitialScanningContext(editor, false, null, null);
  const root = $getRoot();
  let done = false;
  let startIndex = 0;

  // Handle the paragraph level markdown.
  while (!done) {
    done = true;
    const elementNodes: Array<LexicalNode> = root.getChildren();
    const countOfElementNodes = elementNodes.length;

    for (let i = startIndex; i < countOfElementNodes; i++) {
      const elementNode = elementNodes[i];

      if ($isElementNode(elementNode)) {
        convertParagraphLevelMarkdown(
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
  }

  // while
  done = false;
  startIndex = 0;

  // Handle the text level markdown.
  while (!done) {
    done = true;
    const elementNodes: Array<LexicalNode> = root.getChildren();
    const countOfElementNodes = elementNodes.length;

    for (let i = startIndex; i < countOfElementNodes; i++) {
      const elementNode = elementNodes[i];

      if ($isElementNode(elementNode)) {
        convertTextLevelMarkdown(
          scanningContext,
          elementNode,
          createHorizontalRuleNode,
        );
      }

      // Reset the scanning information that relates to the particular element node.
      resetScanningContext(scanningContext);
    }
  } // while
}

function convertParagraphLevelMarkdown<T>(
  scanningContext: ScanningContext,
  elementNode: ElementNode,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  const textContent = elementNode.getTextContent();

  // Handle paragraph nodes below.
  if ($isParagraphNode(elementNode)) {
    const paragraphNode: ParagraphNode = elementNode;
    const firstChild = paragraphNode.getFirstChild<TextNode>();
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
      transformTextNodeForMarkdownCriteria(
        scanningContext,
        elementNode,
        createHorizontalRuleNode,
      );
      return;
    }

    if (elementNode.getChildren().length) {
      const allCriteria = getAllMarkdownCriteriaForParagraphs();
      const count = allCriteria.length;
      scanningContext.joinedText = paragraphNode.getTextContent();
      invariant(
        firstChild != null && firstChildIsTextNode,
        'Expect paragraph containing only text nodes.',
      );
      scanningContext.textNodeWithOffset = {
        node: firstChild,
        offset: 0,
      };

      for (let i = 0; i < count; i++) {
        const criteria = allCriteria[i];

        if (criteria.requiresParagraphStart === false) {
          return;
        }

        const patternMatchResults = getPatternMatchResultsForCriteria(
          criteria,
          scanningContext,
          getParentElementNodeOrThrow(scanningContext),
        );

        if (patternMatchResults != null) {
          scanningContext.markdownCriteria = criteria;
          scanningContext.patternMatchResults = patternMatchResults;
          // Perform text transformation here.
          transformTextNodeForMarkdownCriteria(
            scanningContext,
            elementNode,
            createHorizontalRuleNode,
          );
          return;
        }
      }
    }
  }
}

function convertTextLevelMarkdown<T>(
  scanningContext: ScanningContext,
  elementNode: ElementNode,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  const firstChild = elementNode.getFirstChild();

  if ($isTextNode(firstChild)) {
    // This function will convert all text nodes within the elementNode.
    convertMarkdownForTextCriteria(
      scanningContext,
      elementNode,
      createHorizontalRuleNode,
    );
    return;
  }

  // Handle the case where the elementNode has child elementNodes like lists.
  // Since we started at a text import, we don't need to worry about anything but textNodes.
  const children: Array<LexicalNode> = elementNode.getChildren();
  const countOfChildren = children.length;

  for (let i = 0; i < countOfChildren; i++) {
    const node = children[i];

    if ($isElementNode(node)) {
      // Recurse down until we find a text node.
      convertTextLevelMarkdown(scanningContext, node, createHorizontalRuleNode);
    }
  }
}

function convertMarkdownForTextCriteria<T>(
  scanningContext: ScanningContext,
  elementNode: ElementNode,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  resetScanningContext(scanningContext);
  // Cycle through all the criteria and convert all text patterns in the parent element.
  const allCriteria = getAllMarkdownCriteriaForTextNodes();
  const count = allCriteria.length;
  let textContent = elementNode.getTextContent();
  let done = textContent.length === 0;
  let startIndex = 0;

  while (!done) {
    done = true;

    for (let i = startIndex; i < count; i++) {
      const criteria = allCriteria[i];

      if (scanningContext.textNodeWithOffset == null) {
        // Need to search through the very last text node in the element.
        const lastTextNode = getLastTextNodeInElementNode(elementNode);

        if (lastTextNode == null) {
          // If we have no more text nodes, then there's nothing to search and transform.
          return;
        }

        scanningContext.textNodeWithOffset = {
          node: lastTextNode,
          offset: lastTextNode.getTextContent().length,
        };
      }

      const patternMatchResults = getPatternMatchResultsForCriteria(
        criteria,
        scanningContext,
        elementNode,
      );

      if (patternMatchResults != null) {
        scanningContext.markdownCriteria = criteria;
        scanningContext.patternMatchResults = patternMatchResults;
        // Perform text transformation here.
        transformTextNodeForMarkdownCriteria(
          scanningContext,
          elementNode,
          createHorizontalRuleNode,
        );
        resetScanningContext(scanningContext);
        const currentTextContent = elementNode.getTextContent();

        if (currentTextContent.length === 0) {
          // Nothing left to convert.
          return;
        }

        if (currentTextContent === textContent) {
          // Nothing was changed by this transformation, so move on to the next crieteria.
          continue;
        }

        // The text was changed. Perhaps there is another hit for the same criteria.
        textContent = currentTextContent;
        startIndex = i;
        done = false;
        break;
      }
    }
  }
}

function getLastTextNodeInElementNode(
  elementNode: ElementNode,
): null | TextNode {
  const children = elementNode.getChildren<TextNode>();
  const countOfChildren = children.length;

  for (let i = countOfChildren - 1; i >= 0; i--) {
    if ($isTextNode(children[i])) {
      return children[i];
    }
  }

  return null;
}
