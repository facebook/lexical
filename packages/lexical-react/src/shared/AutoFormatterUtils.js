/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextNodeWithOffset} from '@lexical/helpers/text';
import type {
  ElementNode,
  LexicalNode,
  NodeKey,
  TextFormatType,
  TextNode,
} from 'lexical';

import {
  $findNodeWithOffsetFromJoinedText,
  $joinTextNodesInElementNode,
} from '@lexical/helpers/text';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $isElementNode,
  $setSelection,
} from 'lexical';
import {$createCodeNode} from 'lexical/CodeNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createQuoteNode} from 'lexical/QuoteNode';
import invariant from 'shared/invariant';

// The trigger state helps to capture EditorState information
// from the prior and current EditorState.
// This is then used to determined if an auto format has been triggered.
export type AutoFormatTriggerState = $ReadOnly<{
  anchorOffset: number,
  hasParentNode: boolean,
  isCodeBlock: boolean,
  isParentAListItemNode: boolean,
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
  regExCaptureGroupsToDelete: ?Array<number>,
  regExExpectedCaptureGroupCount: number,
  requiresParagraphStart: ?boolean,
}>;

// While scanning over the text, comparing each
// auto format criteria against the text, certain
// details may be captured rather than re-calculated.
// For example, scanning over each AutoFormatCriteria,
// building up the ParagraphNode's text by calling getTextContent()
// may be expensive. Rather, load this value lazily and store it for later use.
export type ScanningContext = {
  joinedText: ?string,
  textNodeWithOffset: TextNodeWithOffset,
};

// RegEx returns the discovered pattern matches in an array of capture groups.
// Using this array, we can extract the sub-string per pattern, determine its
// offset within the parent (except for non-textNode children) within the overall string and determine its length. Typically the length
// is the textLength of the sub-string, however, at the very end, we need to subtract
// the TRIGGER_STRING.
type CaptureGroupDetail = {
  anchorTextNodeWithOffset: ?TextNodeWithOffset,
  focusTextNodeWithOffset: ?TextNodeWithOffset,
  offsetInParent: number,
  text: string,
  textLength: number,
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
const TRIGGER_STRING_LENGTH = TRIGGER_STRING.length;
const SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES = '\u0004'; // Select an unused unicode character to separate text and non-text nodes.

const autoFormatBase: AutoFormatCriteria = {
  nodeTransformationKind: null,
  regEx: /(?:)/,
  regExCaptureGroupsToDelete: null,
  regExExpectedCaptureGroupCount: 1,
  requiresParagraphStart: false,
};

const paragraphStartBase: AutoFormatCriteria = {
  ...autoFormatBase,
  requiresParagraphStart: true,
};

const markdownHeader1: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphH1',
  regEx: /(?:# )/,
};

const markdownHeader2: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphH2',
  regEx: /(?:## )/,
};

const markdownHeader3: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphH2',
  regEx: /(?:### )/,
};

const markdownBlockQuote: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphBlockQuote',
  regEx: /(?:> )/,
};

const markdownUnorderedListDash: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphUnorderedList',
  regEx: /(?:- )/,
};

const markdownUnorderedListAsterisk: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphUnorderedList',
  regEx: /(?:\* )/,
};

const markdownCodeBlock: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphCodeBlock',
  regEx: /(?:``` )/,
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
  regEx: /(\*)(\s*\b)([^\*]*)(\b\s*)(\*\s)$/,
  // Remove the first and last capture groups. Remeber, the 0th capture group is the entire string.
  // e.g. "*Hello* " requires removing both "*" as well as bolding "Hello".
  regExCaptureGroupsToDelete: [1, 5],

  // The $ will find the target at the end of the string.
  regExExpectedCaptureGroupCount: 6,
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
  matchMustAppearAtStartOfString: boolean,
  matchMustAppearAtEndOfString: boolean,
  regEx: RegExp,
  regExExpectedCaptureGroupCount: number,
  scanningContext: ScanningContext,
): null | MatchResultContext {
  const matchResultContext: MatchResultContext = {
    regExCaptureGroups: [],
    triggerState: null,
  };

  const regExMatches = textToSearch.match(regEx);
  if (
    regExMatches !== null &&
    regExMatches.length > 0 &&
    regExMatches.length === regExExpectedCaptureGroupCount &&
    (matchMustAppearAtStartOfString === false || regExMatches.index === 0) &&
    (matchMustAppearAtEndOfString === false ||
      regExMatches.index + regExMatches[0].length === textToSearch.length)
  ) {
    const captureGroupsCount = regExMatches.length;
    let runningLength = regExMatches.index;
    for (
      let captureGroupIndex = 0;
      captureGroupIndex < captureGroupsCount;
      captureGroupIndex++
    ) {
      const textContent = regExMatches[captureGroupIndex];
      matchResultContext.regExCaptureGroups.push({
        anchorTextNodeWithOffset: null,
        focusTextNodeWithOffset: null,
        offsetInParent: runningLength,
        text: textContent,
        textLength:
          textContent.length -
          (captureGroupIndex + 1 === captureGroupsCount
            ? TRIGGER_STRING_LENGTH
            : 0),
      });

      // The 0th capture group is special in that it's text contents is
      // a join of all subsequent capture groups. So, skip this group
      // when calculating the runningLength.
      if (captureGroupIndex > 0) {
        runningLength += textContent.length;
      }
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
    return getMatchResultContextWithRegEx(
      textToSearch,
      true,
      false,
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
  if (scanningContext.joinedText == null) {
    const parentNode =
      scanningContext.textNodeWithOffset.node.getParentOrThrow();
    if ($isElementNode(parentNode)) {
      if (scanningContext.joinedText == null) {
        // Lazy calculate the text to search.
        scanningContext.joinedText = $joinTextNodesInElementNode(
          parentNode,
          SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES,
          scanningContext.textNodeWithOffset,
        );
      }
      return getMatchResultContextWithRegEx(
        scanningContext.joinedText,
        false,
        true,
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
              ].text
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
          formatTextInCaptureGroupIndex('bold', 3, matchResultContext);
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
  const parentElementNode = textNodeWithOffset.node.getParentOrThrow();

  if (scanningContext.joinedText == null) {
    invariant(false, 'joinedText was not calculated');
  }
  const joinedTextLength = scanningContext.joinedText.length;

  for (
    let captureGroupIndex = 1;
    captureGroupIndex < captureGroupsCount;
    captureGroupIndex++
  ) {
    const captureGroupDetail = regExCaptureGroups[captureGroupIndex];

    captureGroupDetail.anchorTextNodeWithOffset =
      $findNodeWithOffsetFromJoinedText(
        parentElementNode,
        joinedTextLength,
        captureGroupDetail.offsetInParent,
        TRIGGER_STRING_LENGTH,
      );

    captureGroupDetail.focusTextNodeWithOffset =
      $findNodeWithOffsetFromJoinedText(
        parentElementNode,
        joinedTextLength,
        captureGroupDetail.offsetInParent + captureGroupDetail.textLength,
        TRIGGER_STRING_LENGTH,
      );

    if (captureGroupDetail.textLength < 0) {
      invariant(
        false,
        'Bad regEx pattern found for %s',
        autoFormatCriteria.nodeTransformationKind,
      );
    }
  }

  return regExCaptureGroups;
}

function removeTextInCaptureGroups(
  regExCaptureGroupsToDelete: Array<number>,
  matchResultContext: MatchResultContext,
) {
  const regExCaptureGroups = matchResultContext.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;
  for (let i = regExCaptureGroupsToDelete.length - 1; i >= 0; i--) {
    if (i < regExCaptureGroupsCount) {
      const captureGroupIndex = regExCaptureGroupsToDelete[i];
      const captureGroupDetail = regExCaptureGroups[captureGroupIndex];
      const anchorTextNodeWithOffset =
        captureGroupDetail.anchorTextNodeWithOffset;
      const focusTextNodeWithOffset =
        captureGroupDetail.focusTextNodeWithOffset;
      if (
        anchorTextNodeWithOffset != null &&
        focusTextNodeWithOffset != null &&
        captureGroupDetail.textLength > 0
      ) {
        const newSelection = $createRangeSelection();

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

          // Shift offsets for capture groups which are within the same node
          if (
            anchorTextNodeWithOffset.node.getKey() ===
            focusTextNodeWithOffset.node.getKey()
          ) {
            const delta =
              focusTextNodeWithOffset.offset - anchorTextNodeWithOffset.offset;
            invariant(
              delta > 0,
              'Expected anchor and focus offsets to have ascending character order.',
            );
            shiftCaptureGroupOffsets(
              -delta,
              focusTextNodeWithOffset.offset,
              anchorTextNodeWithOffset.node,
              captureGroupIndex,
              matchResultContext,
            );
          } else {
            const focusDelta = focusTextNodeWithOffset.offset;
            if (focusDelta > 0) {
              shiftCaptureGroupOffsets(
                -focusDelta,
                focusDelta,
                focusTextNodeWithOffset.node,
                captureGroupIndex,
                matchResultContext,
              );
            }
          }
        }
      }
    }
  }
}

function shiftCaptureGroupOffsets(
  delta: number,
  applyAtOrAfterOffset: number,
  node: TextNode,
  startingCaptureGroupIndex: number,
  matchResultContext: MatchResultContext,
) {
  const regExCaptureGroups = matchResultContext.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;
  for (
    let captureGroupIndex = startingCaptureGroupIndex + 1;
    captureGroupIndex < regExCaptureGroupsCount;
    captureGroupIndex++
  ) {
    const captureGroupDetail = regExCaptureGroups[captureGroupIndex];

    if (
      captureGroupDetail.anchorTextNodeWithOffset != null &&
      captureGroupDetail.anchorTextNodeWithOffset.offset >=
        applyAtOrAfterOffset &&
      captureGroupDetail.anchorTextNodeWithOffset.node.is(node)
    ) {
      captureGroupDetail.anchorTextNodeWithOffset.offset += delta;
    }

    if (
      captureGroupDetail.focusTextNodeWithOffset != null &&
      captureGroupDetail.focusTextNodeWithOffset.offset >=
        applyAtOrAfterOffset &&
      captureGroupDetail.focusTextNodeWithOffset.node.is(node)
    ) {
      captureGroupDetail.focusTextNodeWithOffset.offset += delta;
    }
  }
}

function formatTextInCaptureGroupIndex(
  formatType: TextFormatType,
  captureGroupIndex: number,
  matchResultContext: MatchResultContext,
) {
  const regExCaptureGroups = matchResultContext.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;

  invariant(
    captureGroupIndex < regExCaptureGroupsCount,
    'The capture group count in the RegEx does match the actual capture group count.',
  );

  const captureGroupDetail = regExCaptureGroups[captureGroupIndex];
  const anchorTextNodeWithOffset = captureGroupDetail.anchorTextNodeWithOffset;
  const focusTextNodeWithOffset = captureGroupDetail.focusTextNodeWithOffset;
  if (
    anchorTextNodeWithOffset != null &&
    focusTextNodeWithOffset != null &&
    captureGroupDetail.textLength > 0
  ) {
    const newSelection = $createRangeSelection();

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
      currentSelection.formatText(formatType);
    }
  }
}
