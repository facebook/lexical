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
import type {TextNodeWithOffset} from '@lexical/helpers/text';

import invariant from 'shared/invariant';
import {
  $createSelection,
  $getSelection,
  $isElementNode,
  $setSelection,
} from 'lexical';
import {$createCodeNode} from 'lexical/CodeNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createListItemNode} from 'lexical/ListItemNode';
import {$createListNode} from 'lexical/ListNode';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {$createQuoteNode} from 'lexical/QuoteNode';
import {
  $joinTextNodesInElementNode,
  $getNodeWithOffsetFromJoinedTextNodesInElementNode,
} from '@lexical/helpers/text';

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
// // //
// Capture groups are defined by the regEx pattern. Certain groups must be removed,
// For example "*hello*", will require that the "*" be removed and the "hello" become bolded.
// We can specify ahead of time which gapture groups shoud be removed using the regExCaptureGroupsToDelete.
export type AutoFormatCriteria = $ReadOnly<{
  nodeTransformationKind: ?NodeTransformationKind,
  regEx: RegExp,
  regExExpectedCaptureGroupCount: number,
  regExCaptureGroupsToDelete: ?Array<number>,
  requiresParagraphStart: ?boolean,
}>;

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

// RegEx returns the discovered pattern matches in an array of capture groups.
// Using this array, we can extract the sub-string per pattern, determine its
// offset within the parent (except for non-textNode children) within the overall string and determine its length. Typically the length
// is the textLength of the sub-string, however, at the very end, we need to subtract
// the TRIGGER_STRING.
type CaptureGroupDetail = {
  text: string,
  textLength: number,
  offsetInParent: number,
  anchorTextNodeWithOffset: ?TextNodeWithOffset,
  focusTextNodeWithOffset: ?TextNodeWithOffset,
};

// This type stores the result details when a particular
// match is found.
export type MatchResultContext = {
  regExCaptureGroups: Array<CaptureGroupDetail>,
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
  regExExpectedCaptureGroupCount: 1,
  regExCaptureGroupsToDelete: null,
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
  regExExpectedCaptureGroupCount: 2 /*e.g. '321. ' returns '321. ' & '321'*/,
};

const markdownBold: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'textBold',
  // regEx: /(\*)(?:\s*\b)(?:[^\*]*)(?:\b\s*)(\*\s)$/, // The $ will find the target at the end of the string.
  regEx: /(\*)(\s*\b)([^\*]*)(\b\s*)(\*\s)$/, // The $ will find the target at the end of the string.
  regExExpectedCaptureGroupCount: 6,
  // Remove the first and last capture groups. Remeber, the 0th capture group is the entire string.
  // e.g. "*Hello* " requires removing both "*" as well as bolding "Hello".
  regExCaptureGroupsToDelete: [1, 5],
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
    triggerState: null,
  };

  const regExMatches = textToSearch.match(regEx);
  if (
    regExMatches !== null &&
    regExMatches.index === 0 &&
    regExMatches.length === regExExpectedCaptureGroupCount
  ) {
    const text = regExMatches[0];
    const textNodeWithOffset = scanningContext.textNodeWithOffset;

    if (
      matchResultContext != null &&
      regExMatches.index === 0 &&
      text.length === textNodeWithOffset.offset
    ) {
      const regExMatchCount = regExMatches.length;
      for (
        let captureGroupIndex = 0;
        captureGroupIndex < regExMatchCount;
        ++captureGroupIndex
      ) {
        matchResultContext.regExCaptureGroups.push({
          text: regExMatches[captureGroupIndex],
          offsetInParent: -1, // Calculate lazily when needed.
          textLength: -1, // Calculate lazily when needed.
          anchorTextNodeWithOffset: null,
          focusTextNodeWithOffset: null,
        });
      }
      return matchResultContext;
    }
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
    return getMatchResultContextWithRegEx(
      textToSearch,
      autoFormatCriteria.regEx,
      autoFormatCriteria.regExExpectedCaptureGroupCount,
      scanningContext,
    );
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
        scanningContext.trimmedParagraphText = $joinTextNodesInElementNode(
          parentNode,
          SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES,
          scanningContext.textNodeWithOffset.node,
          scanningContext.textNodeWithOffset.offset,
        );
      }
      return getMatchResultContextWithRegEx(
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
          matchResultContext.regExCaptureGroups.length > 1
            ? matchResultContext.regExCaptureGroups[
                matchResultContext.regExCaptureGroups.length - 1
              ]
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
        return newNode;
      }
      default:
        break;
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
    transformTextNodeForParagraphs(
      scanningContext,
      autoFormatCriteria,
      matchResultContext,
    );
  } else {
    transformTextNodeForText(
      scanningContext,
      autoFormatCriteria,
      matchResultContext,
    );
  }
}

function transformTextNodeForParagraphs(
  scanningContext: ScanningContext,
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
) {
  const textNodeWithOffset = scanningContext.textNodeWithOffset;
  const element = textNodeWithOffset.node.getParentOrThrow();
  const text = matchResultContext.regExCaptureGroups[0].text;
  updateTextNode(textNodeWithOffset.node, text.length);

  const elementNode = getNewNodeForCriteria(
    autoFormatCriteria,
    matchResultContext,
    element.getChildren(),
  );

  if (elementNode !== null) {
    element.replace(elementNode);
  }
}

function transformTextNodeForText(
  scanningContext: ScanningContext,
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
) {
  if (autoFormatCriteria.nodeTransformationKind != null) {
    switch (autoFormatCriteria.nodeTransformationKind) {
      case 'textBold': {
        matchResultContext.regExCaptureGroups =
          getCaptureGroupsByResolvingAllDetails(
            scanningContext,
            autoFormatCriteria,
            matchResultContext,
          );

        if (autoFormatCriteria.regExCaptureGroupsToDelete != null) {
          // Remove unwanted text in reg ex patterh.
          removeTextInCaptureGroups(
            autoFormatCriteria.regExCaptureGroupsToDelete,
            matchResultContext,
          );
        }
        break;
      }
      default:
        break;
    }
  }
}

// Some Capture Group Details were left lazily unresolved as their calculation
// was not necessary during the scanning phase. Now that the nodeTransformationKind is
// known, the details may be fully resolved without incurring unwasted performance cost.
function getCaptureGroupsByResolvingAllDetails(
  scanningContext: ScanningContext,
  autoFormatCriteria: AutoFormatCriteria,
  matchResultContext: MatchResultContext,
): Array<CaptureGroupDetail> {
  const textNodeWithOffset = scanningContext.textNodeWithOffset;
  const regExCaptureGroups = matchResultContext.regExCaptureGroups;
  const captureGroupsCount = regExCaptureGroups.length;
  let runningLength = 0;
  const parentElementNode = textNodeWithOffset.node.getParentOrThrow();
  const joinedTextContent = regExCaptureGroups[0].text;
  const triggerStringLength = TRIGGER_STRING.length;

  // Skip the first capture group, because it is always the entire
  // string discovered by regEx.
  for (
    let captureGroupIndex = 1;
    captureGroupIndex < captureGroupsCount;
    ++captureGroupIndex
  ) {
    const captureGroupDetail = regExCaptureGroups[captureGroupIndex];

    captureGroupDetail.offsetInParent = runningLength;
    captureGroupDetail.textLength =
      captureGroupDetail.text.length -
      (captureGroupIndex + 1 === captureGroupsCount ? triggerStringLength : 0);

    captureGroupDetail.anchorTextNodeWithOffset =
      $getNodeWithOffsetFromJoinedTextNodesInElementNode(
        parentElementNode,
        joinedTextContent,
        captureGroupDetail.offsetInParent,
        triggerStringLength,
      );

    captureGroupDetail.focusTextNodeWithOffset =
      $getNodeWithOffsetFromJoinedTextNodesInElementNode(
        parentElementNode,
        joinedTextContent,
        captureGroupDetail.offsetInParent + captureGroupDetail.textLength,
        triggerStringLength,
      );

    if (captureGroupDetail.textLength < 0) {
      invariant(
        false,
        'Bad regEx pattern found for %s',
        autoFormatCriteria.nodeTransformationKind,
      );
    }
    // Increase the running length by the text length.
    runningLength += captureGroupDetail.text.length;
  }

  return regExCaptureGroups;
}

function removeTextInCaptureGroups(
  regExCaptureGroupsToDelete: Array<number>,
  matchResultContext: MatchResultContext,
) {
  const regExCaptureGroups = matchResultContext.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;
  const count = regExCaptureGroupsToDelete.length;
  for (let i = count - 1; i >= 0; --i) {
    if (i < regExCaptureGroupsCount) {
      const captureGroupIndex = regExCaptureGroupsToDelete[i];
      const captureGroupDetail = regExCaptureGroups[captureGroupIndex];
      const anchorTextNodeWithOffset =
        captureGroupDetail.anchorTextNodeWithOffset;
      const focusTextNodeWithOffset =
        captureGroupDetail.focusTextNodeWithOffset;
      if (anchorTextNodeWithOffset != null && focusTextNodeWithOffset != null) {
        const newSelection = $createSelection();

        newSelection.anchor.set(
          anchorTextNodeWithOffset.node.getKey(),
          anchorTextNodeWithOffset.offset,
          'text',
        );

        newSelection.focus.set(
          focusTextNodeWithOffset.node.getKey(),
          focusTextNodeWithOffset.offset,
          'text',
        );

        $setSelection(newSelection);
        const currentSelection = $getSelection();
        if (currentSelection != null) {
          currentSelection.removeText();
        }
      }
    }
  }

  // const textNodeWithOffset = scanningContext.textNodeWithOffset;

  // const newSelection = $createSelection();
  // const node = textNodeWithOffset.node;
  // const offset = textNodeWithOffset.offset;
  // // Collapse selection
  // newSelection.anchor.set(node.getKey(), 0, node.getType());
}

// const textNodeWithOffset = scanningContext.textNodeWithOffset;

// const newSelection = $createSelection();
// const node = textNodeWithOffset.node;
// const offset = textNodeWithOffset.offset;
// // Collapse selection
// newSelection.anchor.set(node.getKey(), 0, node.getType());

// const captureGroupsCount = matchResultContext.regExCaptureGroups;
// for (
//   let captureGroupIndex = 1;
//   captureGroupIndex < captureGroupsCount;
//   ++captureGroupIndex
// ) {
//   const string = matchResultContext.regExCaptureGroups[captureGroupIndex];
//   let newNode = null;

//   if (autoFormatCriteria.nodeTransformationKind != null) {
//     switch (autoFormatCriteria.nodeTransformationKind) {
//       case 'textBold': {
//         break;
//       }
//       default: break;
//     }
//   }
// }
// newSelection.focus.set(node.getKey(), offset, node.getType());
// $setSelection(newSelection);
// const currentSelection = $getSelection();
// currentSelection.formatText('bold');
