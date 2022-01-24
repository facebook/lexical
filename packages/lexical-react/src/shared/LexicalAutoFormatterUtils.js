/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, TextNode} from 'lexical';
import type {HeadingTagType} from 'lexical/HeadingNode';
import type {LexicalNode, NodeKey} from 'lexical';

import {$isParagraphNode} from 'lexical/ParagraphNode';
import {$createCodeNode} from 'lexical/CodeNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createListItemNode} from 'lexical/ListItemNode';
import {$createListNode} from 'lexical/ListNode';
import {$createQuoteNode} from 'lexical/QuoteNode';

export type TextNodeWithOffset = $ReadOnly<{
  node: TextNode,
  offset: number,
}>;

export type AutoFormatTriggerState = $ReadOnly<{
  anchorOffset: number,
  isCodeBlock: boolean,
  isParentAParagraphNode: boolean,
  isSelectionCollapsed: boolean,
  isSimpleText: boolean,
  nodeKey: NodeKey,
  textContent: string,
}>;

// When auto formatting, this enum represents the potential new node paragraph level node kind.
export type NodeTransformationKind =
  | 'blockQuote'
  | 'unorderedList'
  | 'orderedList'
  | 'codeBlock';

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
  match: ?string,
  matchWithRegEx: boolean,
  requiresParagraphStart: ?boolean,
  headingTag: ?HeadingTagType,
  nodeTransformationKind: ?NodeTransformationKind,
  regEx: RegExp,
  regExExpectedMatchCount: ?number,
}>;

export type MatchResultContext = {
  text: string,
  textIndex: number,
  regExSupportingText: string,
};

export type AutoFormatCriteriaWithMatchResultContext = {
  autoFormatCriteria: null | AutoFormatCriteria,
  matchResultContext: null | MatchResultContext,
};

export type AutoFormatCriteriaArray = Array<AutoFormatCriteria>;

const emptyRegExp = /(?:)/;

const autoFormatBase: AutoFormatCriteria = {
  match: null,
  matchWithRegEx: false,
  requiresParagraphStart: false,
  headingTag: null,
  nodeTransformationKind: null,
  regEx: emptyRegExp,
  regExExpectedMatchCount: null,
};

const paragraphStartBase: AutoFormatCriteria = {
  ...autoFormatBase,
  requiresParagraphStart: true,
};

const markdownHeader1: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '# ',
  headingTag: 'h1',
};

const markdownHeader2: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '## ',
  headingTag: 'h2',
};

const markdownHeader3: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '### ',
  headingTag: 'h3',
};

const markdownBlockQuote: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '> ',
  nodeTransformationKind: 'blockQuote',
};

const markdownUnorderedListDash: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '- ',
  nodeTransformationKind: 'unorderedList',
};

const markdownUnorderedListAsterisk: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '* ',
  nodeTransformationKind: 'unorderedList',
};

const markdownCodeBlock: AutoFormatCriteria = {
  ...paragraphStartBase,
  match: '``` ',
  nodeTransformationKind: 'codeBlock',
};

const markdownOrderedListAsterisk: AutoFormatCriteria = {
  ...paragraphStartBase,
  matchWithRegEx: true,
  nodeTransformationKind: 'orderedList',
  regEx: /^(\d+)\.\s/,
  regExExpectedMatchCount: 2 /*1: 'number. ' 2: 'number'*/,
};

const allAutoFormatCriteria = [
  markdownHeader1,
  markdownHeader2,
  markdownHeader3,
  markdownBlockQuote,
  markdownUnorderedListDash,
  markdownUnorderedListAsterisk,
  markdownOrderedListAsterisk,
  markdownCodeBlock,
];

export function getAllAutoFormatCriteria(): AutoFormatCriteriaArray {
  return allAutoFormatCriteria;
}

export function getMatchResultContextForCriteria(
  autoFormatCriteria: AutoFormatCriteria,
  textNodeWithOffset: TextNodeWithOffset,
): null | MatchResultContext {
  const matchResultContext: MatchResultContext = {
    text: '',
    textIndex: -1,
    regExSupportingText: '',
  };

  let shouldFormat = false;

  const parentNode = textNodeWithOffset.node.getParent();
  const paragraphStartConditionPasses =
    autoFormatCriteria.requiresParagraphStart !== null &&
    autoFormatCriteria.requiresParagraphStart === true &&
    textNodeWithOffset.node.getPreviousSibling() === null &&
    parentNode !== null &&
    $isParagraphNode(parentNode);

  if (paragraphStartConditionPasses) {
    const text = textNodeWithOffset.node.getTextContent();

    if (autoFormatCriteria.matchWithRegEx === true) {
      const regExMatches = text.match(autoFormatCriteria.regEx);
      if (
        regExMatches !== null &&
        regExMatches.index === 0 &&
        autoFormatCriteria.regExExpectedMatchCount != null &&
        regExMatches.length === autoFormatCriteria.regExExpectedMatchCount
      ) {
        matchResultContext.textIndex = regExMatches.index;
        matchResultContext.text = regExMatches[0];
        matchResultContext.regExSupportingText =
          regExMatches.length > 1 ? regExMatches[1] : '';
      }
    } else if (autoFormatCriteria.match != null) {
      matchResultContext.textIndex = text.lastIndexOf(
        autoFormatCriteria.match,
        textNodeWithOffset.offset,
      );
      matchResultContext.text =
        autoFormatCriteria.match == null ? '' : autoFormatCriteria.match;
    }

    shouldFormat =
      matchResultContext.textIndex === 0 &&
      matchResultContext.textIndex + matchResultContext.text.length ===
        textNodeWithOffset.offset;
  }

  return shouldFormat ? matchResultContext : null;
}

function getNewNodeForCriteria(
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
  children: Array<LexicalNode>,
): null | ElementNode {
  let newNode = null;

  if (autoFormatCriteria.headingTag != null) {
    newNode = $createHeadingNode(autoFormatCriteria.headingTag);
    newNode.append(...children);
    return newNode;
  }

  if (autoFormatCriteria.nodeTransformationKind != null) {
    switch (autoFormatCriteria.nodeTransformationKind) {
      case 'blockQuote': {
        newNode = $createQuoteNode();
        newNode.append(...children);
        return newNode;
      }
      case 'unorderedList': {
        newNode = $createListNode('ul');
        const listItem = $createListItemNode();
        listItem.append(...children);
        newNode.append(listItem);
        return newNode;
      }
      case 'orderedList': {
        const start = parseInt(matchResultContext.regExSupportingText, 10);
        newNode = $createListNode('ol', start);
        const listItem = $createListItemNode();
        listItem.append(...children);
        newNode.append(listItem);
        return newNode;
      }
      case 'codeBlock': {
        newNode = $createCodeNode();
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
  textNodeWithOffset: TextNodeWithOffset,
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
) {
  if (autoFormatCriteria.requiresParagraphStart) {
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
