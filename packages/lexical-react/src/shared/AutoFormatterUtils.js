/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextNodeWithOffset} from '@lexical/text';
import type {ElementNode, NodeKey, TextFormatType, TextNode} from 'lexical';

import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $findNodeWithOffsetFromJoinedText,
  $joinTextNodesInElementNode,
} from '@lexical/text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
} from 'lexical';
import {$createCodeNode} from 'lexical/CodeNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createQuoteNode} from 'lexical/QuoteNode';
import invariant from 'shared/invariant';

/*
How to add a new syntax to capture and transform.
1. Create a new enumeration by adding to NodeTransformationKind.
2. Add a new criteria with a regEx pattern. See markdownStrikethrough as an example.
3. Add your block criteria (e.g. '# ') to allAutoFormatCriteria or 
   your text criteria (e.g. *MyItalic*) to allAutoFormatCriteriaForTextNodes.
4. Add your Lexical block specific transforming code here: transformTextNodeForText.   
   Add your Lexical text specific transforming code here: transformTextNodeForText.   
*/

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
  | 'noTransformation'
  | 'paragraphH1'
  | 'paragraphH2'
  | 'paragraphH3'
  | 'paragraphBlockQuote'
  | 'paragraphUnorderedList'
  | 'paragraphOrderedList'
  | 'paragraphCodeBlock'
  | 'horizontalRule'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'bold_italic'
  | 'link';

// The scanning context provides the overall data structure for
// locating a auto formatting candidate and then transforming that candidate
// into the newly formatted stylized text.
// The context is filled out lazily to avoid redundant or up-front expensive
// calculations. For example, this includes the parent element's getTextContent() which
// ultimately gets deposited into the joinedText field.
export type ScanningContext = {
  autoFormatCriteria: AutoFormatCriteria,
  joinedText: ?string,
  matchResultContext: MatchResultContext,
  textNodeWithOffset: TextNodeWithOffset,
  triggerState: AutoFormatTriggerState,
};

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
export type AutoFormatCriteria = $ReadOnly<{
  nodeTransformationKind: ?NodeTransformationKind,
  regEx: RegExp,
  requiresParagraphStart: ?boolean,
}>;

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
  offsetInJoinedTextForCollapsedSelection: number, // The expected location for the blinking caret.
  regExCaptureGroups: Array<CaptureGroupDetail>,
};

export type AutoFormatCriteriaWithMatchResultContext = {
  autoFormatCriteria: null | AutoFormatCriteria,
  matchResultContext: null | MatchResultContext,
};

export type AutoFormatCriteriaArray = Array<AutoFormatCriteria>;

export const TRIGGER_STRING = '\u0020'; // The space key triggers markdown.
const TRIGGER_STRING_LENGTH = TRIGGER_STRING.length;
const SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES = '\u0004'; // Select an unused unicode character to separate text and non-text nodes.

// Todo: speed up performance by having non-capture group variations of the regex.
const autoFormatBase: AutoFormatCriteria = {
  nodeTransformationKind: null,
  regEx: /(?:)/,
  requiresParagraphStart: false,
};

const paragraphStartBase: AutoFormatCriteria = {
  ...autoFormatBase,
  requiresParagraphStart: true,
};

const markdownHeader1: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphH1',
  regEx: /^(?:# )/,
};

const markdownHeader2: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphH2',
  regEx: /^(?:## )/,
};

const markdownHeader3: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphH2',
  regEx: /^(?:### )/,
};

const markdownBlockQuote: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphBlockQuote',
  regEx: /^(?:> )/,
};

const markdownUnorderedListDash: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphUnorderedList',
  regEx: /^(?:- )/,
};

const markdownUnorderedListAsterisk: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphUnorderedList',
  regEx: /^(?:\* )/,
};

const markdownCodeBlock: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphCodeBlock',
  regEx: /^(```)([a-z]*)( )/,
};

const markdownOrderedList: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'paragraphOrderedList',
  regEx: /^(\d+)\.\s/,
};

const markdownHorizontalRule: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'horizontalRule',
  regEx: /^(?:\*\*\* )/,
};

const markdownHorizontalRuleUsingDashes: AutoFormatCriteria = {
  ...paragraphStartBase,
  nodeTransformationKind: 'horizontalRule',
  regEx: /^(?:--- )/,
};

const markdownItalic: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'italic',
  regEx: /(\*)(\s*\b)([^\*]*)(\b\s*)(\*\s)$/,
};

const markdownBold: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'bold',
  regEx: /(\*\*)(\s*\b)([^\*\*]*)(\b\s*)(\*\*\s)$/,
};

const markdownBoldWithUnderlines: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'bold',
  regEx: /(__)(\s*)([^__]*)(\s*)(__\s)$/,
};

const markdownBoldItalic: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'bold_italic',
  regEx: /(\*\*\*)(\s*\b)([^\*\*\*]*)(\b\s*)(\*\*\*\s)$/,
};

// Markdown does not support underline, but we can allow folks to use
// the HTML tags for underline.
const fakeMarkdownUnderline: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'underline',
  regEx: /(\<u\>)(\s*\b)([^\<]*)(\b\s*)(\<\/u\>\s)$/,
};

const markdownStrikethrough: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'strikethrough',
  regEx: /(~~)(\s*\b)([^~~]*)(\b\s*)(~~\s)$/,
};

const markdownLink: AutoFormatCriteria = {
  ...autoFormatBase,
  nodeTransformationKind: 'link',
  regEx: /(\[)(.+)(\]\()([^ ]+)(?: \"(?:.+)\")?(\))(\s)$/,
};

const allAutoFormatCriteriaForTextNodes = [
  markdownBoldItalic,
  markdownItalic,
  markdownBold,
  markdownBoldWithUnderlines,
  fakeMarkdownUnderline,
  markdownStrikethrough,
  markdownLink,
];

const allAutoFormatCriteria = [
  markdownHeader1,
  markdownHeader2,
  markdownHeader3,
  markdownBlockQuote,
  markdownUnorderedListDash,
  markdownUnorderedListAsterisk,
  markdownOrderedList,
  markdownCodeBlock,
  markdownHorizontalRule,
  markdownHorizontalRuleUsingDashes,
  ...allAutoFormatCriteriaForTextNodes,
];

export function getAllAutoFormatCriteriaForTextNodes(): AutoFormatCriteriaArray {
  return allAutoFormatCriteriaForTextNodes;
}

export function getAllAutoFormatCriteria(): AutoFormatCriteriaArray {
  return allAutoFormatCriteria;
}

export function getInitialScanningContext(
  textNodeWithOffset: TextNodeWithOffset,
  triggerState: AutoFormatTriggerState,
): ScanningContext {
  return {
    autoFormatCriteria: {
      nodeTransformationKind: 'noTransformation',
      regEx: /(?:)/, // Empty reg ex will do until the precise criteria is discovered.
      requiresParagraphStart: null,
    },
    joinedText: null,
    matchResultContext: {
      offsetInJoinedTextForCollapsedSelection: 0,
      regExCaptureGroups: [],
    },
    textNodeWithOffset,
    triggerState,
  };
}

function getMatchResultContextWithRegEx(
  textToSearch: string,
  matchMustAppearAtStartOfString: boolean,
  matchMustAppearAtEndOfString: boolean,
  regEx: RegExp,
): null | MatchResultContext {
  const matchResultContext: MatchResultContext = {
    offsetInJoinedTextForCollapsedSelection: 0,
    regExCaptureGroups: [],
  };

  const regExMatches = textToSearch.match(regEx);
  if (
    regExMatches !== null &&
    regExMatches.length > 0 &&
    (matchMustAppearAtStartOfString === false || regExMatches.index === 0) &&
    (matchMustAppearAtEndOfString === false ||
      regExMatches.index + regExMatches[0].length === textToSearch.length)
  ) {
    matchResultContext.offsetInJoinedTextForCollapsedSelection =
      textToSearch.length;
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
    } else {
      invariant(
        false,
        'Expected node %s to to be a ElementNode.',
        parentNode.__key,
      );
    }
  }

  return getMatchResultContextWithRegEx(
    scanningContext.joinedText,
    false,
    true,
    autoFormatCriteria.regEx,
  );
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
  scanningContext: ScanningContext,
  element: ElementNode,
): null | ElementNode {
  let newNode = null;

  const children = element.getChildren();
  const autoFormatCriteria = scanningContext.autoFormatCriteria;
  const matchResultContext = scanningContext.matchResultContext;
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
          scanningContext.triggerState != null &&
          scanningContext.triggerState.isCodeBlock
        ) {
          newNode = $createParagraphNode();
        } else {
          newNode = $createCodeNode();
          const codingLanguage =
            matchResultContext.regExCaptureGroups.length >= 3
              ? matchResultContext.regExCaptureGroups[2].text
              : null;
          if (codingLanguage != null && codingLanguage.length > 0) {
            newNode.setLanguage(codingLanguage);
          }
        }
        newNode.append(...children);
        return newNode;
      }
      case 'horizontalRule': {
        // return null for newNode. Insert the HR here.
        const horizontalRuleNode = $createHorizontalRuleNode();
        element.insertBefore(horizontalRuleNode);
        break;
      }
      default:
        break;
    }
  }

  return newNode;
}

export function transformTextNodeForAutoFormatCriteria(
  scanningContext: ScanningContext,
) {
  if (scanningContext.autoFormatCriteria.requiresParagraphStart) {
    transformTextNodeForParagraphs(scanningContext);
  } else {
    transformTextNodeForText(scanningContext);
  }
}

function transformTextNodeForParagraphs(scanningContext: ScanningContext) {
  const textNodeWithOffset = scanningContext.textNodeWithOffset;
  const element = textNodeWithOffset.node.getParentOrThrow();
  const text = scanningContext.matchResultContext.regExCaptureGroups[0].text;

  // Remove the text which we matched.
  const textNode = textNodeWithOffset.node.spliceText(0, text.length, '', true);
  if (textNode.getTextContent() === '') {
    textNode.selectPrevious();
    textNode.remove();
  }

  // Transform the current element kind to the new element kind.
  const elementNode = getNewNodeForCriteria(scanningContext, element);

  if (elementNode !== null) {
    element.replace(elementNode);
  }
}

function transformTextNodeForText(scanningContext: ScanningContext) {
  const autoFormatCriteria = scanningContext.autoFormatCriteria;

  if (autoFormatCriteria.nodeTransformationKind != null) {
    const formatting = getTextFormatType(
      autoFormatCriteria.nodeTransformationKind,
    );

    if (formatting != null) {
      transformTextNodeWithFormatting(formatting, scanningContext);
      return;
    }

    if (autoFormatCriteria.nodeTransformationKind === 'link') {
      transformTextNodeWithLink(scanningContext);
    }
  }
}

function transformTextNodeWithFormatting(
  formatting: Array<TextFormatType>,
  scanningContext: ScanningContext,
) {
  const matchResultContext = scanningContext.matchResultContext;
  if (matchResultContext.regExCaptureGroups.length !== 6) {
    // For BIUS and similar formats which have a pattern + text + pattern:
    // given *italic* below are the capture groups by index:
    // 0. *italic*
    // 1. *
    // 2. whitespace
    // 3. italic
    // 4. whitespace
    // 5. *
    return;
  }

  const formatCaptureGroup = 3;
  matchResultContext.regExCaptureGroups =
    getCaptureGroupsByResolvingAllDetails(scanningContext);

  // Remove unwanted text in reg ex pattern.

  // Remove group 5.
  removeCaptureGroupsWithAnchorAndFocusIndexes(5, 5, matchResultContext);
  // Remove group 1.
  removeCaptureGroupsWithAnchorAndFocusIndexes(1, 1, matchResultContext);

  formatTextInCaptureGroupIndex(
    formatting,
    formatCaptureGroup,
    matchResultContext,
  );

  makeCollapsedSelectionAtOffsetInJoinedText(
    matchResultContext.offsetInJoinedTextForCollapsedSelection,
    matchResultContext.offsetInJoinedTextForCollapsedSelection + 1,
    scanningContext.textNodeWithOffset.node.getParentOrThrow(),
  );
}

function transformTextNodeWithLink(scanningContext: ScanningContext) {
  const matchResultContext = scanningContext.matchResultContext;
  if (matchResultContext.regExCaptureGroups.length !== 7) {
    // For links and similar formats which have: pattern + text + pattern + pattern2 text2 + pattern2:
    // Given [title](url), below are the capture groups by index:
    // 0. [title](url)
    // 1. [
    // 2. title
    // 3. ](
    // 4. url
    // 5. )
    // 6. whitespace

    return;
  }

  matchResultContext.regExCaptureGroups =
    getCaptureGroupsByResolvingAllDetails(scanningContext);

  // Remove the initial pattern through to the final pattern.
  removeCaptureGroupsWithAnchorAndFocusIndexes(1, 5, matchResultContext);

  makeCollapsedSelectionAtOffsetInJoinedText(
    matchResultContext.offsetInJoinedTextForCollapsedSelection,
    matchResultContext.offsetInJoinedTextForCollapsedSelection + 1,
    scanningContext.textNodeWithOffset.node.getParentOrThrow(),
  );
}

// Below are lower level helper functions.

function getTextFormatType(
  nodeTransformationKind: NodeTransformationKind,
): null | Array<TextFormatType> {
  switch (nodeTransformationKind) {
    case 'italic':
    case 'bold':
    case 'underline':
    case 'strikethrough':
      return [nodeTransformationKind];
    case 'bold_italic': {
      return ['bold', 'italic'];
    }
    default:
  }
  return null;
}

// Some Capture Group Details were left lazily unresolved as their calculation
// was not necessary during the scanning phase. Now that the nodeTransformationKind is
// known, the details may be fully resolved without incurring unwasted performance cost.
function getCaptureGroupsByResolvingAllDetails(
  scanningContext: ScanningContext,
): Array<CaptureGroupDetail> {
  const autoFormatCriteria = scanningContext.autoFormatCriteria;
  const matchResultContext = scanningContext.matchResultContext;

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

function createSelectionForCaptureGroups(
  anchorCaptureGroup: CaptureGroupDetail,
  focusCaptureGroup: CaptureGroupDetail,
): null | RangeSelection {
  const anchorTextNodeWithOffset = anchorCaptureGroup.anchorTextNodeWithOffset;
  const focusTextNodeWithOffset = focusCaptureGroup.focusTextNodeWithOffset;

  if (anchorTextNodeWithOffset != null && focusTextNodeWithOffset != null) {
    const selection = $createRangeSelection();

    selection.anchor.set(
      anchorTextNodeWithOffset.node.getKey(),
      anchorTextNodeWithOffset.offset,
      'text',
    );

    selection.focus.set(
      focusTextNodeWithOffset.node.getKey(),
      focusTextNodeWithOffset.offset,
      'text',
    );
    return selection;
  }
  return null;
}

function removeCaptureGroupsWithAnchorAndFocusIndexes(
  anchorCaptureGroupIndex,
  focusCaptureGroupIndex,
  matchResultContext: MatchResultContext,
) {
  const regExCaptureGroups = matchResultContext.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;

  if (
    anchorCaptureGroupIndex < regExCaptureGroupsCount &&
    focusCaptureGroupIndex < regExCaptureGroupsCount
  ) {
    const anchorCaptureGroupDetail =
      regExCaptureGroups[anchorCaptureGroupIndex];
    const focusCaptureGroupDetail = regExCaptureGroups[focusCaptureGroupIndex];

    const anchorTextNodeWithOffset =
      anchorCaptureGroupDetail.anchorTextNodeWithOffset;
    const focusTextNodeWithOffset =
      focusCaptureGroupDetail.focusTextNodeWithOffset;

    const newSelection = createSelectionForCaptureGroups(
      anchorCaptureGroupDetail,
      focusCaptureGroupDetail,
    );

    if (
      newSelection != null &&
      anchorTextNodeWithOffset != null &&
      focusTextNodeWithOffset != null
    ) {
      $setSelection(newSelection);
      const currentSelection = $getSelection();
      if (
        currentSelection != null &&
        $isRangeSelection(currentSelection) &&
        currentSelection.isCollapsed() === false
      ) {
        currentSelection.removeText();

        // Shift the capture group anchor and focus node offsets as well as offsetInJoinedTextForCollapsedSelection.
        for (
          let i = focusCaptureGroupIndex;
          i >= anchorCaptureGroupIndex;
          i--
        ) {
          const captureGroupDetail = regExCaptureGroups[i];

          /*
              An explanation of this code.
              Start with "BigRedDog" where each node is formatted differently (bold, italic, underline).
              Next, delete the letter i through the letter o leaving "Bg".
              We can say we have 3 nodes that were affected by the deletion:
              1. TextNode1 for Big lost all text after offset 1
              2. TextNode2 for Red lost all text technically after offset 0.
              3. TextNode3 for Dog lost all text from offset 0 through offset 2

              Each capture group has an anchor and focus that refers to the 3 textNodes.
              The TextNode1 captureGroup1.anchor.offset remains the same, but its captureGroup1.focus.offset is reduced by 2 ("ig").
              The TextNode2 captureGroup2.anchor.offset is already 0, but its captureGroup2.focus.offset is reduced by 3 and thus becomes 0 ("Red").
              The TextNode3 captureGroup3.anchor.offset is already 0, but its captureGroup3.focus.offset is reduced by 2 and thus becomes 0 ("do").
              
              The shifting code maintains the offsets for each capture group, even when the capture group is deleted. When this happens, its
              anchor and offset values collapse to 0.

              The shifting code also updates offsetInJoinedTextForCollapsedSelection.  This value is used for placing
              The collapsed selection after the trigger.
            */

          let delta = 0;
          let node = null;
          let atOrAfterOffset = 0;
          if (i === anchorCaptureGroupIndex && i === focusCaptureGroupIndex) {
            delta =
              focusTextNodeWithOffset.offset - anchorTextNodeWithOffset.offset;
            node = anchorTextNodeWithOffset.node;
            atOrAfterOffset = focusTextNodeWithOffset.offset;
          } else if (i === anchorCaptureGroupIndex) {
            if (captureGroupDetail.anchorTextNodeWithOffset != null) {
              delta =
                captureGroupDetail.textLength -
                captureGroupDetail.anchorTextNodeWithOffset.offset;
              atOrAfterOffset = anchorTextNodeWithOffset.offset;
            }
          } else if (i === focusCaptureGroupIndex) {
            delta = focusTextNodeWithOffset.offset;
            node = focusTextNodeWithOffset.node;
            atOrAfterOffset = focusTextNodeWithOffset.offset;
          }

          if (delta > 0) {
            shiftCaptureGroupOffsets(
              -delta,
              node,
              atOrAfterOffset,
              focusCaptureGroupIndex,
              matchResultContext,
            );
          }
        }
      }
    }
  }
}

function shiftCaptureGroupOffsets(
  delta: number,
  applyAtOrAfterNode: null | TextNode,
  applyAtOrAfterOffset: number,
  startingCaptureGroupIndex: number,
  matchResultContext: MatchResultContext,
) {
  matchResultContext.offsetInJoinedTextForCollapsedSelection += delta;
  invariant(
    matchResultContext.offsetInJoinedTextForCollapsedSelection > 0,
    'The text content string length does not correlate with insertions/deletions of new text.',
  );

  if (applyAtOrAfterNode != null) {
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
        captureGroupDetail.anchorTextNodeWithOffset.node.is(applyAtOrAfterNode)
      ) {
        captureGroupDetail.anchorTextNodeWithOffset.offset += delta;
      }

      if (
        captureGroupDetail.focusTextNodeWithOffset != null &&
        captureGroupDetail.focusTextNodeWithOffset.offset >=
          applyAtOrAfterOffset &&
        captureGroupDetail.focusTextNodeWithOffset.node.is(applyAtOrAfterNode)
      ) {
        captureGroupDetail.focusTextNodeWithOffset.offset += delta;
      }
    }
  }
}

function formatTextInCaptureGroupIndex(
  formatTypes: Array<TextFormatType>,
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
    if ($isRangeSelection(currentSelection)) {
      for (let i = 0; i < formatTypes.length; i++) {
        currentSelection.formatText(formatTypes[i]);
      }

      const finalSelection = $createRangeSelection();

      finalSelection.anchor.set(
        focusTextNodeWithOffset.node.getKey(),
        focusTextNodeWithOffset.offset + 1,
        'text',
      );

      finalSelection.focus.set(
        focusTextNodeWithOffset.node.getKey(),
        focusTextNodeWithOffset.offset + 1,
        'text',
      );
      $setSelection(finalSelection);
    }
  }
}

function makeCollapsedSelectionAtOffsetInJoinedText(
  offsetInJoinedText: number,
  joinedTextLength: number,
  parentElementNode: ElementNode,
) {
  const textNodeWithOffset = $findNodeWithOffsetFromJoinedText(
    parentElementNode,
    joinedTextLength,
    offsetInJoinedText,
    TRIGGER_STRING_LENGTH,
  );

  if (textNodeWithOffset != null) {
    const newSelection = $createRangeSelection();

    newSelection.anchor.set(
      textNodeWithOffset.node.getKey(),
      textNodeWithOffset.offset,
      'text',
    );

    newSelection.focus.set(
      textNodeWithOffset.node.getKey(),
      textNodeWithOffset.offset,
      'text',
    );

    $setSelection(newSelection);
  }
}
