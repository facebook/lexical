/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, TextNode} from 'lexical';
import type {LexicalNode, NodeKey} from 'lexical';
import invariant from 'shared/invariant';
import {$isElementNode} from 'lexical';
import {$createCodeNode} from 'lexical/CodeNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createListItemNode} from 'lexical/ListItemNode';
import {$createListNode} from 'lexical/ListNode';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {$createQuoteNode} from 'lexical/QuoteNode';
import {$joinTextNodesFromElementNode} from '@lexical/helpers/text';

// The trigger state helps to capture EditorState information
// from the prior and current EditorState.
// This is then used to determined if an auto format has been triggered.
export type AutoFormatTriggerState = $ReadOnly<{
  anchorOffset: number,
  isCodeBlock: boolean,
  isParentAListItemNode: boolean,
  isParentAnElementNode: boolean,
  isSelectionCollapsed: boolean,
  isSimpleText: boolean,
  nodeKey: NodeKey,
  textContent: string,
}>;

// When auto formatting, this enum represents the conversion options.
// There are two categories.
// 1. Convert the paragraph formatting: e.g. "# " converts to Heading1.
// 2. Convert the text formatting: e.g. "**hello**" converts to bold "hello".

export type NodeTransformationKind =
  | 'paragraphH1'
  | 'paragraphH2'
  | 'paragraphH3'
  | 'paragraphBlockQuote'
  | 'paragraphUnorderedList'
  | 'paragraphOrderedList'
  | 'paragraphCodeBlock'
  | 'textBold';

// The auto formatter runs these steps:
// 1. Examine the current and prior editor states to see if a potential auto format is triggered.
// 2. If triggered, examine the current editor state to see if it matches a particular
//    set of criteria from an array of criteria.
//    A match might be based on particular string (match), a particular regular expression (regEx)
//    and/or other specifics. For example "# " would trigger a match only if typed at the start of
//    a paragraph (requiresParagraphStart).
// 3. Once the criteria is located, the auto formatter substitutes the new text and applies the new
//    rich text formatting.

export type AutoFormatCriteria = $ReadOnly<{
  nodeTransformationKind: ?NodeTransformationKind,
  regEx: RegExp,
  regExExpectedCaptureGroupCount: number,
  requiresParagraphStart: ?boolean,
}>;

export type TextNodeWithOffset = {
  node: TextNode,
  offset: number,
};

// While scanning over the text, comparing each
// auto format criteria against the text, certain
// details may be captured rather than re-calculated.
// For example, scanning over each AutoFormatCriteria,
// building up the ParagraphNode's text by calling getTextContent()
// may be expensive. Rather, load this value lazily and store it for later use.
export type ScanningContext = {
  textNodeWithOffset: TextNodeWithOffset,
  trimmedParagraphText: ?string,
};

// This type stores the result details when a particular
// match is found.
export type MatchResultContext = {
  regExCaptureGroups: Array<string>,
  text: string,
  textIndex: number,
  triggerState: ?AutoFormatTriggerState,
};

export type AutoFormatCriteriaWithMatchResultContext = {
  autoFormatCriteria: null | AutoFormatCriteria,
  matchResultContext: null | MatchResultContext,
};

export type AutoFormatCriteriaArray = Array<AutoFormatCriteria>;

export const TRIGGER_STRING = '\u0020'; // The space key triggers markdown.
const SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES = '\u0004'; // Select an unused unicode character to separate text and non-text nodes.

const autoFormatBase: AutoFormatCriteria = {
  requiresParagraphStart: false,
  nodeTransformationKind: null,
  regEx: /(?:)/,
  regExExpectedCaptureGroupCount: 0,
};

const paragraphStartBase: AutoFormatCriteria = {
  ...autoFormatBase,
  requiresParagraphStart: true,
};

const markdownHeader1: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:# )/,
  nodeTransformationKind: 'paragraphH1',
};

const markdownHeader2: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:## )/,
  nodeTransformationKind: 'paragraphH2',
};

const markdownHeader3: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:### )/,
  nodeTransformationKind: 'paragraphH2',
};

const markdownBlockQuote: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:> )/,
  nodeTransformationKind: 'paragraphBlockQuote',
};

const markdownUnorderedListDash: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:- )/,
  nodeTransformationKind: 'paragraphUnorderedList',
};

const markdownUnorderedListAsterisk: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:\* )/,
  nodeTransformationKind: 'paragraphUnorderedList',
};

const markdownCodeBlock: AutoFormatCriteria = {
  ...paragraphStartBase,
  regEx: /(?:``` )/,
  nodeTransformationKind: 'paragraphCodeBlock',
};

const markdownOrderedList: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphOrderedList',
  regEx: /^(\d+)\.\s/,
  regExExpectedCaptureGroupCount: 1 /*1: 'number. ' 2: 'number'*/,
};

const markdownBold: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'textBold',
  regEx: /(\*)(?:\s*\b)(?:[^\*]*)(?:\b\s*)(\*\s)$/, // The $ will find the target at the end of the string.
  regExExpectedCaptureGroupCount: 2,
};

const allAutoFormatCriteriaForTextNodes = [markdownBold];

const allAutoFormatCriteria = [
  markdownHeader1,
  markdownHeader2,
  markdownHeader3,
  markdownBlockQuote,
  markdownUnorderedListDash,
  markdownUnorderedListAsterisk,
  markdownOrderedList,
  markdownCodeBlock,
  ...allAutoFormatCriteriaForTextNodes,
];

export function getAllAutoFormatCriteriaForTextNodes(): AutoFormatCriteriaArray {
  return allAutoFormatCriteriaForTextNodes;
}

export function getAllAutoFormatCriteria(): AutoFormatCriteriaArray {
  return allAutoFormatCriteria;
}

function getMatchResultContextWithRegEx(
  textToSearch: string,
  regEx: RegExp,
  regExExpectedCaptureGroupCount: number,
  scanningContext: ScanningContext,
): null | MatchResultContext {
  const matchResultContext: MatchResultContext = {
    regExCaptureGroups: [],
    text: '',
    textIndex: -1,
    triggerState: null,
  };

  const regExMatches = textToSearch.match(regEx);

  if (
    regExMatches !== null &&
    regExMatches.index === 0 &&
    regExMatches.length === regExExpectedCaptureGroupCount + 1
  ) {
    matchResultContext.textIndex = regExMatches.index;
    matchResultContext.text = regExMatches[0];
    for (
      let captureGroupIndex = 1;
      captureGroupIndex < regExMatches.length;
      ++captureGroupIndex
    ) {
      matchResultContext.regExCaptureGroups.push(
        regExMatches[captureGroupIndex],
      );
    }
    return matchResultContext;
  }

  return null;
}

function getMatchResultContextForParagraphs(
  autoFormatCriteria: AutoFormatCriteria,
  scanningContext: ScanningContext,
): null | MatchResultContext {
  const textNodeWithOffset = scanningContext.textNodeWithOffset;

  // At start of paragraph.
  if (textNodeWithOffset.node.getPreviousSibling() === null) {
    const textToSearch =
      scanningContext.textNodeWithOffset.node.getTextContent();
    const matchResultContext = getMatchResultContextWithRegEx(
      textToSearch,
      autoFormatCriteria.regEx,
      autoFormatCriteria.regExExpectedCaptureGroupCount,
      scanningContext,
    );

    if (
      matchResultContext != null &&
      matchResultContext.textIndex === 0 &&
      matchResultContext.textIndex + matchResultContext.text.length ===
        textNodeWithOffset.offset
    ) {
      return matchResultContext;
    }
  }

  return null;
}

function getMatchResultContextForText(
  autoFormatCriteria: AutoFormatCriteria,
  scanningContext: ScanningContext,
): null | MatchResultContext {
  if (scanningContext.trimmedParagraphText == null) {
    const parentNode =
      scanningContext.textNodeWithOffset.node.getParentOrThrow();
    if ($isElementNode(parentNode)) {
      if (scanningContext.trimmedParagraphText == null) {
        // Lazy calculate the text to search.
        scanningContext.trimmedParagraphText = $joinTextNodesFromElementNode(
          parentNode,
          SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES,
          scanningContext.textNodeWithOffset.node,
          scanningContext.textNodeWithOffset.offset,
        );
      }
      getMatchResultContextWithRegEx(
        scanningContext.trimmedParagraphText,
        autoFormatCriteria.regEx,
        autoFormatCriteria.regExExpectedCaptureGroupCount,
        scanningContext,
      );
    } else {
      invariant(
        false,
        'Expected node %s to to be a ElementNode.',
        parentNode.__key,
      );
    }
  }
  // This is a placeholder function for following PR's related to character based transformations.
  return null;
}

export function getMatchResultContextForCriteria(
  autoFormatCriteria: AutoFormatCriteria,
  scanningContext: ScanningContext,
): null | MatchResultContext {
  if (
    autoFormatCriteria.requiresParagraphStart !== null &&
    autoFormatCriteria.requiresParagraphStart === true
  ) {
    return getMatchResultContextForParagraphs(
      autoFormatCriteria,
      scanningContext,
    );
  }
  return getMatchResultContextForText(autoFormatCriteria, scanningContext);
}

function getNewNodeForCriteria(
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
  children: Array<LexicalNode>,
): null | ElementNode {
  let newNode = null;

  if (autoFormatCriteria.nodeTransformationKind != null) {
    switch (autoFormatCriteria.nodeTransformationKind) {
      case 'paragraphH1': {
        newNode = $createHeadingNode('h1');
        newNode.append(...children);
        return newNode;
      }
      case 'paragraphH2': {
        newNode = $createHeadingNode('h2');
        newNode.append(...children);
        return newNode;
      }
      case 'paragraphH3': {
        newNode = $createHeadingNode('h3');
        newNode.append(...children);
        return newNode;
      }
      case 'paragraphBlockQuote': {
        newNode = $createQuoteNode();
        newNode.append(...children);
        return newNode;
      }
      case 'paragraphUnorderedList': {
        newNode = $createListNode('ul');
        const listItem = $createListItemNode();
        listItem.append(...children);
        newNode.append(listItem);
        return newNode;
      }
      case 'paragraphOrderedList': {
        const startAsString =
          matchResultContext.regExCaptureGroups.length === 1
            ? matchResultContext.regExCaptureGroups[0]
            : '1';
        const start = parseInt(startAsString, 10);
        newNode = $createListNode('ol', start);
        const listItem = $createListItemNode();
        listItem.append(...children);
        newNode.append(listItem);
        return newNode;
      }
      case 'paragraphCodeBlock': {
        // Toggle code and paragraph nodes.
        if (
          matchResultContext.triggerState != null &&
          matchResultContext.triggerState.isCodeBlock
        ) {
          newNode = $createParagraphNode();
        } else {
          newNode = $createCodeNode();
        }
        newNode.append(...children);
      }
    }
  }

  return newNode;
}

function updateTextNode(node: TextNode, count: number): void {
  const textNode = node.spliceText(0, count, '', true);
  if (textNode.getTextContent() === '') {
    textNode.selectPrevious();
    textNode.remove();
  }
}

export function transformTextNodeForAutoFormatCriteria(
  scanningContext: ScanningContext,
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
) {
  if (autoFormatCriteria.requiresParagraphStart) {
    const textNodeWithOffset = scanningContext.textNodeWithOffset;
    const element = textNodeWithOffset.node.getParentOrThrow();
    updateTextNode(textNodeWithOffset.node, matchResultContext.text.length);

    const elementNode = getNewNodeForCriteria(
      autoFormatCriteria,
      matchResultContext,
      element.getChildren(),
    );

    if (elementNode !== null) {
      element.replace(elementNode);
    }
  }
}
