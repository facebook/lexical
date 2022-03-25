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
  ElementNode,
  LexicalEditor,
  NodeKey,
  RangeSelection,
  TextFormatType,
} from 'lexical';

import {$createCodeNode} from '@lexical/code';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
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
  autoFormatCriteria: AutoFormatCriteria,
  editor: LexicalEditor,
  joinedText: ?string,
  patternMatchResults: PatternMatchResults,
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
  autoFormatKind: ?AutoFormatKind,
  regEx: RegExp,
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

export type AutoFormatCriteriaWithPatternMatchResults = {
  autoFormatCriteria: null | AutoFormatCriteria,
  patternMatchResults: null | PatternMatchResults,
};

export type AutoFormatCriteriaArray = Array<AutoFormatCriteria>;

export const TRIGGER_STRING = '\u0020'; // The space key triggers markdown.
const SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES = '\u0004'; // Select an unused unicode character to separate text and non-text nodes.
const SEPARATOR_LENGTH = SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES.length;

// Todo: speed up performance by having non-capture group variations of the regex.
const autoFormatBase: AutoFormatCriteria = {
  autoFormatKind: null,
  regEx: /(?:)/,
  requiresParagraphStart: false,
};

const paragraphStartBase: AutoFormatCriteria = {
  ...autoFormatBase,
  requiresParagraphStart: true,
};

const markdownHeader1: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphH1',
  regEx: /^(?:# )/,
};

const markdownHeader2: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphH2',
  regEx: /^(?:## )/,
};

const markdownHeader3: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphH2',
  regEx: /^(?:### )/,
};

const markdownBlockQuote: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphBlockQuote',
  regEx: /^(?:> )/,
};

const markdownUnorderedListDash: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphUnorderedList',
  regEx: /^(?:- )/,
};

const markdownUnorderedListAsterisk: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphUnorderedList',
  regEx: /^(?:\* )/,
};

const markdownCodeBlock: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphCodeBlock',
  regEx: /^(```)([a-z]*)( )/,
};

const markdownOrderedList: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'paragraphOrderedList',
  regEx: /^(\d+)\.\s/,
};

const markdownHorizontalRule: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'horizontalRule',
  regEx: /^(?:\*\*\* )/,
};

const markdownHorizontalRuleUsingDashes: AutoFormatCriteria = {
  ...paragraphStartBase,
  autoFormatKind: 'horizontalRule',
  regEx: /^(?:--- )/,
};

const markdownItalic: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'italic',
  regEx: /(\*)(\s*\b)([^\*]*)(\b\s*)(\*)(\s)$/,
};

const markdownBold: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'bold',
  regEx: /(\*\*)(\s*\b)([^\*\*]*)(\b\s*)(\*\*)(\s)$/,
};

const markdownBoldWithUnderlines: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'bold',
  regEx: /(__)(\s*)([^__]*)(\s*)(__)(\s)$/,
};

const markdownBoldItalic: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'bold_italic',
  regEx: /(\*\*\*)(\s*\b)([^\*\*\*]*)(\b\s*)(\*\*\*)(\s)$/,
};

// Markdown does not support underline, but we can allow folks to use
// the HTML tags for underline.
const fakeMarkdownUnderline: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'underline',
  regEx: /(\<u\>)(\s*\b)([^\<]*)(\b\s*)(\<\/u\>)(\s)$/,
};

const markdownStrikethrough: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'strikethrough',
  regEx: /(~~)(\s*\b)([^~~]*)(\b\s*)(~~)(\s)$/,
};

const markdownLink: AutoFormatCriteria = {
  ...autoFormatBase,
  autoFormatKind: 'link',
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
  editor: LexicalEditor,
  textNodeWithOffset: TextNodeWithOffset,
  triggerState: AutoFormatTriggerState,
): ScanningContext {
  return {
    autoFormatCriteria: {
      autoFormatKind: 'noTransformation',
      regEx: /(?:)/, // Empty reg ex will do until the precise criteria is discovered.
      requiresParagraphStart: null,
    },
    editor,
    joinedText: null,
    patternMatchResults: {
      regExCaptureGroups: [],
    },
    textNodeWithOffset,
    triggerState,
  };
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

function getPatternMatchResultsForParagraphs(
  autoFormatCriteria: AutoFormatCriteria,
  scanningContext: ScanningContext,
): null | PatternMatchResults {
  const textNodeWithOffset = scanningContext.textNodeWithOffset;

  // At start of paragraph.
  if (textNodeWithOffset.node.getPreviousSibling() === null) {
    const textToSearch =
      scanningContext.textNodeWithOffset.node.getTextContent();
    return getPatternMatchResultsWithRegEx(
      textToSearch,
      true,
      false,
      autoFormatCriteria.regEx,
    );
  }

  return null;
}

function getPatternMatchResultsForText(
  autoFormatCriteria: AutoFormatCriteria,
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

  return getPatternMatchResultsWithRegEx(
    scanningContext.joinedText,
    false,
    true,
    autoFormatCriteria.regEx,
  );
}

export function getPatternMatchResultsForCriteria(
  autoFormatCriteria: AutoFormatCriteria,
  scanningContext: ScanningContext,
): null | PatternMatchResults {
  if (
    autoFormatCriteria.requiresParagraphStart !== null &&
    autoFormatCriteria.requiresParagraphStart === true
  ) {
    return getPatternMatchResultsForParagraphs(
      autoFormatCriteria,
      scanningContext,
    );
  }
  return getPatternMatchResultsForText(autoFormatCriteria, scanningContext);
}

function getNewNodeForCriteria(
  scanningContext: ScanningContext,
  element: ElementNode,
): null | ElementNode {
  let newNode = null;

  const children = element.getChildren();
  const autoFormatCriteria = scanningContext.autoFormatCriteria;
  const patternMatchResults = scanningContext.patternMatchResults;
  if (autoFormatCriteria.autoFormatKind != null) {
    switch (autoFormatCriteria.autoFormatKind) {
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
  const text = scanningContext.patternMatchResults.regExCaptureGroups[0].text;

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

  if (autoFormatCriteria.autoFormatKind != null) {
    const formatting = getTextFormatType(autoFormatCriteria.autoFormatKind);

    if (formatting != null) {
      transformTextNodeWithFormatting(formatting, scanningContext);
      return;
    }

    if (autoFormatCriteria.autoFormatKind === 'link') {
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

  scanningContext.editor.execCommand('toggleLink', url);

  // Place caret at end of final capture group.
  selectAfterFinalCaptureGroup(scanningContext);
}

// Below are lower level helper functions.

function getParent(scanningContext: ScanningContext): ElementNode {
  return scanningContext.textNodeWithOffset.node.getParentOrThrow();
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
