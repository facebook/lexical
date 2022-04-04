/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextNodeWithOffset} from '@lexical/text';
import type {
  DecoratorNode,
  ElementNode,
  LexicalEditor,
  NodeKey,
  RangeSelection,
  TextFormatType,
} from 'lexical';

import {$createCodeNode} from '@lexical/code';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
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
import invariant from 'shared/invariant';

/*
   How to add a new syntax to capture and transform.
   1. Create a new enumeration by adding to AutoFormatKind.
   2. Add a new criteria with a regEx pattern. See markdownStrikethrough as an example.
   3. Add your block criteria (e.g. '# ') to allMarkdownCriteria or 
      your text criteria (e.g. *MyItalic*) to allMarkdownCriteriaForTextNodes.
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

export type AutoFormatKind =
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
  editor: LexicalEditor,
  isAutoFormatting: boolean,
  joinedText: ?string,
  markdownCriteria: MarkdownCriteria,
  patternMatchResults: PatternMatchResults,
  textNodeWithOffset: ?TextNodeWithOffset,
  triggerState: ?AutoFormatTriggerState,
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
export type MarkdownCriteria = $ReadOnly<{
  autoFormatKind: ?AutoFormatKind,
  regEx: RegExp,
  regExForAutoFormatting: RegExp,
  requiresParagraphStart: ?boolean,
}>;

// RegEx returns the discovered pattern matches in an array of capture groups.
// Each CaptureGroupDetail contains the relevant regEx information.
type CaptureGroupDetail = {
  offsetInParent: number,
  text: string,
};

// This type stores the result details when a particular
// match is found.
export type PatternMatchResults = {
  regExCaptureGroups: Array<CaptureGroupDetail>,
};

export type MarkdownCriteriaWithPatternMatchResults = {
  markdownCriteria: null | MarkdownCriteria,
  patternMatchResults: null | PatternMatchResults,
};

export type MarkdownCriteriaArray = Array<MarkdownCriteria>;

// Eventually we need to support multiple trigger string's including newlines.
const SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES = '\u0004'; // Select an unused unicode character to separate text and non-text nodes.
const SEPARATOR_LENGTH = SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES.length;

export type AutoFormatTriggerKind = 'space_trigger' | 'codeBlock_trigger';

export type AutoFormatTrigger = {
  triggerKind: AutoFormatTriggerKind,
  triggerString: string,
};

const spaceTrigger: AutoFormatTrigger = {
  triggerKind: 'space_trigger',
  triggerString: '\u0020',
};

// TODO: add support for ``` + carriage return either inside or not inside code block. Should toggle between.
// const codeBlockTrigger : AutoFormatTrigger = {
//     triggerKind: 'codeBlock_trigger',
//     triggerString: '```', // + new paragraph element or new code block element.
// };

export const triggers: Array<AutoFormatTrigger> = [
  spaceTrigger /*, codeBlockTrigger*/,
];

// Todo: speed up performance by having non-capture group variations of the regex.
const autoFormatBase: MarkdownCriteria = {
  autoFormatKind: null,
  regEx: /(?:)/,
  regExForAutoFormatting: /(?:)/,
  requiresParagraphStart: false,
};

const paragraphStartBase: MarkdownCriteria = {
  ...autoFormatBase,
  requiresParagraphStart: true,
};

const markdownHeader1: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphH1',
  regEx: /^(?:#)/,
  regExForAutoFormatting: /^(?:# )/,
};

const markdownHeader2: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphH2',
  regEx: /^(?:##)/,
  regExForAutoFormatting: /^(?:## )/,
};

const markdownHeader3: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphH2',
  regEx: /^(?:###)/,
  regExForAutoFormatting: /^(?:### )/,
};

const markdownBlockQuote: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphBlockQuote',
  regEx: /^(?:>)/,
  regExForAutoFormatting: /^(?:> )/,
};

const markdownUnorderedListDash: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphUnorderedList',
  regEx: /^(?:- )/,
  regExForAutoFormatting: /^(?:- )/,
};

const markdownUnorderedListAsterisk: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphUnorderedList',
  regEx: /^(?:\* )/,
  regExForAutoFormatting: /^(?:\* )/,
};

const markdownCodeBlock: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphCodeBlock',
  regEx: /^(```)$/,
  regExForAutoFormatting: /^(```)([a-z]*)( )/,
};

const markdownOrderedList: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphOrderedList',
  regEx: /^(\d+)\.\s/,
  regExForAutoFormatting: /^(\d+)\.\s/,
};

const markdownHorizontalRule: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'horizontalRule',
  regEx: /^(?:\*\*\*)$/,
  regExForAutoFormatting: /^(?:\*\*\* )/,
};

const markdownHorizontalRuleUsingDashes: MarkdownCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'horizontalRule',
  regEx: /^(?:---)$/,
  regExForAutoFormatting: /^(?:--- )/,
};

const markdownItalic: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'italic',
  regEx: /(\*)(\s*\b)([^\*]*)(\b\s*)(\*)/,
  regExForAutoFormatting: /(\*)(\s*\b)([^\*]*)(\b\s*)(\*)(\s)$/,
};

const markdownBold: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'bold',
  regEx: /(\*\*)(\s*\b)([^\*\*]*)(\b\s*)(\*\*)/,
  regExForAutoFormatting: /(\*\*)(\s*\b)([^\*\*]*)(\b\s*)(\*\*)(\s)$/,
};

const markdownBoldWithUnderlines: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'bold',
  regEx: /(__)(\s*)([^__]*)(\s*)(__)/,
  regExForAutoFormatting: /(__)(\s*)([^__]*)(\s*)(__)(\s)$/,
};

const markdownBoldItalic: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'bold_italic',
  regEx: /(\*\*\*)(\s*\b)([^\*\*\*]*)(\b\s*)(\*\*\*)/,
  regExForAutoFormatting: /(\*\*\*)(\s*\b)([^\*\*\*]*)(\b\s*)(\*\*\*)(\s)$/,
};

// Markdown does not support underline, but we can allow folks to use
// the HTML tags for underline.
const fakeMarkdownUnderline: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'underline',
  regEx: /(\<u\>)(\s*\b)([^\<]*)(\b\s*)(\<\/u\>)/,
  regExForAutoFormatting: /(\<u\>)(\s*\b)([^\<]*)(\b\s*)(\<\/u\>)(\s)$/,
};

const markdownStrikethrough: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'strikethrough',
  regEx: /(~~)(\s*\b)([^~~]*)(\b\s*)(~~)/,
  regExForAutoFormatting: /(~~)(\s*\b)([^~~]*)(\b\s*)(~~)(\s)$/,
};

const markdownLink: MarkdownCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'link',
  regEx: /(\[)(.+)(\]\()([^ ]+)(?: \"(?:.+)\")?(\))/,
  regExForAutoFormatting: /(\[)(.+)(\]\()([^ ]+)(?: \"(?:.+)\")?(\))(\s)$/,
};

export const allMarkdownCriteriaForTextNodes: MarkdownCriteriaArray = [
  markdownBoldItalic,
  markdownItalic,
  markdownBold,
  markdownBoldWithUnderlines,
  fakeMarkdownUnderline,
  markdownStrikethrough,
  markdownLink,
];

export const allMarkdownCriteria: MarkdownCriteriaArray = [
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
  ...allMarkdownCriteriaForTextNodes,
];

export function getInitialScanningContext(
  editor: LexicalEditor,
  isAutoFormatting: boolean,
  textNodeWithOffset: null | TextNodeWithOffset,
  triggerState: null | AutoFormatTriggerState,
): ScanningContext {
  return {
    editor,
    isAutoFormatting,
    joinedText: null,
    markdownCriteria: {
      autoFormatKind: 'noTransformation',
      regEx: /(?:)/, // Empty reg ex.
      regExForAutoFormatting: /(?:)/, // Empty reg ex.
      requiresParagraphStart: null,
    },
    patternMatchResults: {
      regExCaptureGroups: [],
    },
    textNodeWithOffset,
    triggerState,
  };
}

export function resetScanningContext(
  scanningContext: ScanningContext,
): ScanningContext {
  scanningContext.joinedText = '';

  scanningContext.markdownCriteria = {
    autoFormatKind: 'noTransformation',
    regEx: /(?:)/, // Empty reg ex.
    regExForAutoFormatting: /(?:)/, // Empty reg ex.
    requiresParagraphStart: null,
  };

  scanningContext.patternMatchResults = {
    regExCaptureGroups: [],
  };

  scanningContext.triggerState = null;
  scanningContext.textNodeWithOffset = null;

  return scanningContext;
}

function getPatternMatchResultsWithRegEx(
  textToSearch: string,
  matchMustAppearAtStartOfString: boolean,
  matchMustAppearAtEndOfString: boolean,
  regEx: RegExp,
): null | PatternMatchResults {
  const patternMatchResults: PatternMatchResults = {
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
    const captureGroupsCount = regExMatches.length;
    let runningLength = regExMatches.index;
    for (
      let captureGroupIndex = 0;
      captureGroupIndex < captureGroupsCount;
      captureGroupIndex++
    ) {
      const textContent = regExMatches[captureGroupIndex];
      patternMatchResults.regExCaptureGroups.push({
        offsetInParent: runningLength,
        text: textContent,
      });

      // The 0th capture group is special in that it's text contents is
      // a join of all subsequent capture groups. So, skip this group
      // when calculating the runningLength.
      if (captureGroupIndex > 0) {
        runningLength += textContent.length;
      }
    }
    return patternMatchResults;
  }

  return null;
}

export function getTextNodeWithOffsetOrThrow(
  scanningContext: ScanningContext,
): TextNodeWithOffset {
  const textNodeWithOffset = scanningContext.textNodeWithOffset;
  if (textNodeWithOffset == null) {
    invariant(false, 'Expect to have a text node with offset.');
  }
  return textNodeWithOffset;
}

export function getPatternMatchResultsForParagraphs(
  markdownCriteria: MarkdownCriteria,
  scanningContext: ScanningContext,
): null | PatternMatchResults {
  const textNodeWithOffset = getTextNodeWithOffsetOrThrow(scanningContext);

  // At start of paragraph.
  if (textNodeWithOffset.node.getPreviousSibling() === null) {
    const textToSearch = textNodeWithOffset.node.getTextContent();
    return getPatternMatchResultsWithRegEx(
      textToSearch,
      true,
      false,
      markdownCriteria.regExForAutoFormatting,
    );
  }

  return null;
}

export function getPatternMatchResultsForText(
  markdownCriteria: MarkdownCriteria,
  scanningContext: ScanningContext,
): null | PatternMatchResults {
  if (scanningContext.joinedText == null) {
    const parentNode = getParent(scanningContext);
    if ($isElementNode(parentNode)) {
      if (scanningContext.joinedText == null) {
        // Lazy calculate the text to search.
        scanningContext.joinedText = $joinTextNodesInElementNode(
          parentNode,
          SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES,
          getTextNodeWithOffsetOrThrow(scanningContext),
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

  return getPatternMatchResultsWithRegEx(
    scanningContext.joinedText,
    false,
    true,
    markdownCriteria.regExForAutoFormatting,
  );
}

function getNewNodeForCriteria<T>(
  scanningContext: ScanningContext,
  element: ElementNode,
  createHorizontalRuleNode: () => DecoratorNode<T>,
): null | ElementNode {
  let newNode = null;

  const children = element.getChildren();
  const markdownCriteria = scanningContext.markdownCriteria;
  const patternMatchResults = scanningContext.patternMatchResults;
  if (markdownCriteria.autoFormatKind != null) {
    switch (markdownCriteria.autoFormatKind) {
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
          patternMatchResults.regExCaptureGroups.length > 1
            ? patternMatchResults.regExCaptureGroups[
                patternMatchResults.regExCaptureGroups.length - 1
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
            patternMatchResults.regExCaptureGroups.length >= 3
              ? patternMatchResults.regExCaptureGroups[2].text
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
        const horizontalRuleNode = createHorizontalRuleNode();
        element.insertBefore(horizontalRuleNode);
        break;
      }
      default:
        break;
    }
  }

  return newNode;
}

export function transformTextNodeForParagraphs<T>(
  scanningContext: ScanningContext,
  createHorizontalRuleNode: () => DecoratorNode<T>,
): void {
  const textNodeWithOffset = getTextNodeWithOffsetOrThrow(scanningContext);
  const element = textNodeWithOffset.node.getParentOrThrow();
  const text = scanningContext.patternMatchResults.regExCaptureGroups[0].text;

  // Remove the text which we matched.
  const textNode = textNodeWithOffset.node.spliceText(0, text.length, '', true);
  if (textNode.getTextContent() === '') {
    textNode.selectPrevious();
    textNode.remove();
  }

  // Transform the current element kind to the new element kind.
  const elementNode = getNewNodeForCriteria(
    scanningContext,
    element,
    createHorizontalRuleNode,
  );

  if (elementNode !== null) {
    element.replace(elementNode);
  }
}

export function transformTextNodeForText(scanningContext: ScanningContext) {
  const markdownCriteria = scanningContext.markdownCriteria;

  if (markdownCriteria.autoFormatKind != null) {
    const formatting = getTextFormatType(markdownCriteria.autoFormatKind);

    if (formatting != null) {
      transformTextNodeWithFormatting(formatting, scanningContext);
      return;
    }

    if (markdownCriteria.autoFormatKind === 'link') {
      transformTextNodeWithLink(scanningContext);
    }
  }
}

function transformTextNodeWithFormatting(
  formatting: Array<TextFormatType>,
  scanningContext: ScanningContext,
) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const groupCount = patternMatchResults.regExCaptureGroups.length;
  if (groupCount !== 7) {
    // For BIUS and similar formats which have a pattern + text + pattern:
    // given '*italic* ' below are the capture groups by index:
    // 0. '*italic* '
    // 1. '*'
    // 2. whitespace  // typically this is "".
    // 3. 'italic'
    // 4. whitespace  // typicallly this is "".
    // 5. '*'
    // 6. ' '
    return;
  }

  // Remove unwanted text in reg ex pattern.

  // Remove group 5.
  removeTextByCaptureGroups(5, 5, scanningContext);
  // Remove group 1.
  removeTextByCaptureGroups(1, 1, scanningContext);

  // Apply the formatting.
  formatTextInCaptureGroupIndex(formatting, 3, scanningContext);

  // Place caret at end of final capture group.
  selectAfterFinalCaptureGroup(scanningContext);
}

function transformTextNodeWithLink(scanningContext: ScanningContext) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const regExCaptureGroups = patternMatchResults.regExCaptureGroups;
  const groupCount = regExCaptureGroups.length;
  if (groupCount !== 7) {
    // For links and similar formats which have: pattern + text + pattern + pattern2 text2 + pattern2:
    // Given '[title](url) ', below are the capture groups by index:
    // 0. '[title](url) '
    // 1. '['
    // 2. 'title'
    // 3. ']('
    // 4. 'url'
    // 5. ')'
    // 6. ' '

    return;
  }

  const title = regExCaptureGroups[2].text;
  const url = regExCaptureGroups[4].text;
  if (title.length === 0 || url.length === 0) {
    return;
  }

  // Remove the initial pattern through to the final pattern.
  removeTextByCaptureGroups(1, 5, scanningContext);
  insertTextPriorToCaptureGroup(
    1, // Insert at the beginning of the meaningful capture groups, namely index 1. Index 0 refers to the whole matched string.
    title,
    scanningContext,
  );

  const newSelectionForLink = createSelectionWithCaptureGroups(
    1,
    1,
    false,
    true,
    scanningContext,
  );

  if (newSelectionForLink == null) {
    return;
  }

  $setSelection(newSelectionForLink);

  scanningContext.editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);

  // Place caret at end of final capture group.
  selectAfterFinalCaptureGroup(scanningContext);
}

// Below are lower level helper functions.

function getParent(scanningContext: ScanningContext): ElementNode {
  return getTextNodeWithOffsetOrThrow(scanningContext).node.getParentOrThrow();
}

function getJoinedTextLength(patternMatchResults: PatternMatchResults): number {
  const groupCount = patternMatchResults.regExCaptureGroups.length;
  if (groupCount < 2) {
    // Ignore capture group 0, as regEx defaults the 0th one to the entire matched string.
    return 0;
  }

  const lastGroupIndex = groupCount - 1;

  return (
    patternMatchResults.regExCaptureGroups[lastGroupIndex].offsetInParent +
    patternMatchResults.regExCaptureGroups[lastGroupIndex].text.length
  );
}

function getTextFormatType(
  autoFormatKind: AutoFormatKind,
): null | Array<TextFormatType> {
  switch (autoFormatKind) {
    case 'italic':
    case 'bold':
    case 'underline':
    case 'strikethrough':
      return [autoFormatKind];
    case 'bold_italic': {
      return ['bold', 'italic'];
    }
    default:
  }
  return null;
}

function createSelectionWithCaptureGroups(
  anchorCaptureGroupIndex: number,
  focusCaptureGroupIndex: number,
  startAtEndOfAnchor: boolean,
  finishAtEndOfFocus: boolean,
  scanningContext: ScanningContext,
): null | RangeSelection {
  const patternMatchResults = scanningContext.patternMatchResults;
  const regExCaptureGroups = patternMatchResults.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;

  if (
    anchorCaptureGroupIndex >= regExCaptureGroupsCount ||
    focusCaptureGroupIndex >= regExCaptureGroupsCount
  ) {
    return null;
  }

  const parentElementNode = getParent(scanningContext);
  const joinedTextLength = getJoinedTextLength(patternMatchResults);

  const anchorCaptureGroupDetail = regExCaptureGroups[anchorCaptureGroupIndex];
  const focusCaptureGroupDetail = regExCaptureGroups[focusCaptureGroupIndex];

  const anchorLocation = startAtEndOfAnchor
    ? anchorCaptureGroupDetail.offsetInParent +
      anchorCaptureGroupDetail.text.length
    : anchorCaptureGroupDetail.offsetInParent;

  const focusLocation = finishAtEndOfFocus
    ? focusCaptureGroupDetail.offsetInParent +
      focusCaptureGroupDetail.text.length
    : focusCaptureGroupDetail.offsetInParent;

  const anchorTextNodeWithOffset = $findNodeWithOffsetFromJoinedText(
    anchorLocation,
    joinedTextLength,
    SEPARATOR_LENGTH,
    parentElementNode,
  );

  const focusTextNodeWithOffset = $findNodeWithOffsetFromJoinedText(
    focusLocation,
    joinedTextLength,
    SEPARATOR_LENGTH,
    parentElementNode,
  );

  if (anchorTextNodeWithOffset == null || focusTextNodeWithOffset == null) {
    return null;
  }

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

function removeTextByCaptureGroups(
  anchorCaptureGroupIndex,
  focusCaptureGroupIndex,
  scanningContext: ScanningContext,
) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const regExCaptureGroups = patternMatchResults.regExCaptureGroups;

  const newSelection = createSelectionWithCaptureGroups(
    anchorCaptureGroupIndex,
    focusCaptureGroupIndex,
    false,
    true,
    scanningContext,
  );

  if (newSelection != null) {
    $setSelection(newSelection);
    const currentSelection = $getSelection();
    if (
      currentSelection != null &&
      $isRangeSelection(currentSelection) &&
      currentSelection.isCollapsed() === false
    ) {
      currentSelection.removeText();

      // Shift all group offsets and clear out group text.
      let runningLength = 0;
      const groupCount = regExCaptureGroups.length;
      for (let i = anchorCaptureGroupIndex; i < groupCount; i++) {
        const captureGroupDetail = regExCaptureGroups[i];

        if (i > anchorCaptureGroupIndex) {
          captureGroupDetail.offsetInParent -= runningLength;
        }

        if (i <= focusCaptureGroupIndex) {
          runningLength += captureGroupDetail.text.length;
          captureGroupDetail.text = '';
        }
      }
    }
  }
}

function insertTextPriorToCaptureGroup(
  captureGroupIndex: number,
  text: string,
  scanningContext: ScanningContext,
) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const regExCaptureGroups = patternMatchResults.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;
  if (captureGroupIndex >= regExCaptureGroupsCount) {
    return;
  }

  const captureGroupDetail = regExCaptureGroups[captureGroupIndex];

  const newCaptureGroupDetail = {
    offsetInParent: captureGroupDetail.offsetInParent,
    text,
  };

  const newSelection = createSelectionWithCaptureGroups(
    captureGroupIndex,
    captureGroupIndex,
    false,
    false,
    scanningContext,
  );

  if (newSelection != null) {
    $setSelection(newSelection);
    const currentSelection = $getSelection();
    if (
      currentSelection != null &&
      $isRangeSelection(currentSelection) &&
      currentSelection.isCollapsed()
    ) {
      currentSelection.insertText(newCaptureGroupDetail.text);

      // Update the capture groups.
      regExCaptureGroups.splice(captureGroupIndex, 0, newCaptureGroupDetail);
      const textLength = newCaptureGroupDetail.text.length;
      const newGroupCount = regExCaptureGroups.length;
      for (let i = captureGroupIndex + 1; i < newGroupCount; i++) {
        const currentCaptureGroupDetail = regExCaptureGroups[i];
        currentCaptureGroupDetail.offsetInParent += textLength;
      }
    }
  }
}

function formatTextInCaptureGroupIndex(
  formatTypes: Array<TextFormatType>,
  captureGroupIndex: number,
  scanningContext: ScanningContext,
) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const regExCaptureGroups = patternMatchResults.regExCaptureGroups;
  const regExCaptureGroupsCount = regExCaptureGroups.length;

  invariant(
    captureGroupIndex < regExCaptureGroupsCount,
    'The capture group count in the RegEx does match the actual capture group count.',
  );

  const captureGroupDetail = regExCaptureGroups[captureGroupIndex];
  if (captureGroupDetail.text.length === 0) {
    return;
  }

  const newSelection = createSelectionWithCaptureGroups(
    captureGroupIndex,
    captureGroupIndex,
    false,
    true,
    scanningContext,
  );

  if (newSelection != null) {
    $setSelection(newSelection);
    const currentSelection = $getSelection();
    if ($isRangeSelection(currentSelection)) {
      for (let i = 0; i < formatTypes.length; i++) {
        currentSelection.formatText(formatTypes[i]);
      }
    }
  }
}

// Place caret at end of final capture group.
function selectAfterFinalCaptureGroup(scanningContext: ScanningContext) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const groupCount = patternMatchResults.regExCaptureGroups.length;
  if (groupCount < 2) {
    // Ignore capture group 0, as regEx defaults the 0th one to the entire matched string.
    return;
  }
  const lastGroupIndex = groupCount - 1;

  const newSelection = createSelectionWithCaptureGroups(
    lastGroupIndex,
    lastGroupIndex,
    true,
    true,
    scanningContext,
  );

  if (newSelection != null) {
    $setSelection(newSelection);
  }
}
