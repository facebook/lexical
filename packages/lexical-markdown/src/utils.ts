/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ListNode, ListType} from '@lexical/list';
import type {TextNodeWithOffset} from '@lexical/text';
import type {
  DecoratorNode,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  RangeSelection,
  TextFormatType,
} from 'lexical';

import {$createCodeNode, $isCodeNode} from '@lexical/code';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import {
  $findNodeWithOffsetFromJoinedText,
  $joinTextNodesInElementNode,
} from '@lexical/text';
import {
  $createLineBreakNode,
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
   1. Create a new enumeration by adding to MarkdownFormatKind.
   2. Add a new criteria with a regEx pattern. See markdownStrikethrough as an example.
   3. Add your block criteria (e.g. '# ') to allMarkdownCriteria or 
      your text criteria (e.g. *MyItalic*) to allMarkdownCriteriaForTextNodes.
   4. Add your Lexical block specific transforming code here: transformTextNodeForText.   
      Add your Lexical text specific transforming code here: transformTextNodeForText.   
   */

// The trigger state helps to capture EditorState information
// from the prior and current EditorState.
// This is then used to determined if an auto format has been triggered.
export type AutoFormatTriggerState = Readonly<{
  anchorOffset: number;
  hasParentNode: boolean;
  isCodeBlock: boolean;
  isParentAListItemNode: boolean;
  isSelectionCollapsed: boolean;
  isSimpleText: boolean;
  nodeKey: NodeKey;
  textContent: string;
}>;

// When auto formatting, this enum represents the conversion options.
// There are two categories.
// 1. Convert the paragraph formatting: e.g. "# " converts to Heading1.
// 2. Convert the text formatting: e.g. "**hello**" converts to bold "hello".
export type MarkdownFormatKind =
  | 'noTransformation'
  | 'paragraphH1'
  | 'paragraphH2'
  | 'paragraphH3'
  | 'paragraphH4'
  | 'paragraphH5'
  | 'paragraphH6'
  | 'paragraphBlockQuote'
  | 'paragraphUnorderedList'
  | 'paragraphOrderedList'
  | 'paragraphCodeBlock'
  | 'horizontalRule' // PostComposer Todo add inline code much like 'bold' works. | 'inline_code'
  | 'bold'
  | 'code'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'italic_bold'
  | 'strikethrough_italic'
  | 'strikethrough_bold'
  | 'strikethrough_italic_bold'
  | 'link';

// The scanning context provides the overall data structure for
// locating a auto formatting candidate and then transforming that candidate
// into the newly formatted stylized text.
// The context is filled out lazily to avoid redundant or up-front expensive
// calculations. For example, this includes the parent element's getTextContent() which
// ultimately gets deposited into the joinedText field.
export type ScanningContext = {
  currentElementNode: null | ElementNode;
  editor: LexicalEditor;
  isAutoFormatting: boolean;
  isWithinCodeBlock: boolean;
  joinedText: string | null | undefined;
  markdownCriteria: MarkdownCriteria;
  patternMatchResults: PatternMatchResults;
  textNodeWithOffset: TextNodeWithOffset | null | undefined;
  triggerState: AutoFormatTriggerState | null | undefined;
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
export type MarkdownCriteria = Readonly<{
  export?: (
    node: LexicalNode,
    // eslint-disable-next-line no-shadow
    traverseChildren: (node: ElementNode) => string,
  ) => string | null;
  exportFormat?: TextFormatType;
  exportTag?: string;
  exportTagClose?: string;
  markdownFormatKind: MarkdownFormatKind | null | undefined;
  regEx: RegExp;
  regExForAutoFormatting: RegExp;
  requiresParagraphStart: boolean | null | undefined;
}>;

// RegEx returns the discovered pattern matches in an array of capture groups.
// Each CaptureGroupDetail contains the relevant regEx information.
type CaptureGroupDetail = {
  offsetInParent: number;
  text: string;
};

// This type stores the result details when a particular
// match is found.
export type PatternMatchResults = {
  regExCaptureGroups: Array<CaptureGroupDetail>;
};

export type MarkdownCriteriaWithPatternMatchResults = {
  markdownCriteria: null | MarkdownCriteria;
  patternMatchResults: null | PatternMatchResults;
};

export type MarkdownCriteriaArray = Array<MarkdownCriteria>;

// Eventually we need to support multiple trigger string's including newlines.
const SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES = '\u0004'; // Select an unused unicode character to separate text and non-text nodes.

const SEPARATOR_LENGTH = SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES.length;

export type AutoFormatTriggerKind = 'space_trigger' | 'codeBlock_trigger';

export type AutoFormatTrigger = {
  triggerKind: AutoFormatTriggerKind;
  triggerString: string;
};
const spaceTrigger: AutoFormatTrigger = {
  triggerKind: 'space_trigger',
  triggerString: '\u0020',
};

// Future todo: add support for ``` + carriage return either inside or not inside code block. Should toggle between.
// const codeBlockTrigger : AutoFormatTrigger = {
//     triggerKind: 'codeBlock_trigger',
//     triggerString: '```', // + new paragraph element or new code block element.
// };
export const triggers: Array<AutoFormatTrigger> = [
  spaceTrigger,
  /*, codeBlockTrigger*/
];

// Future Todo: speed up performance by having non-capture group variations of the regex.

const autoFormatBase: MarkdownCriteria = {
  markdownFormatKind: null,
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
  export: createHeadingExport(1),
  markdownFormatKind: 'paragraphH1',
  regEx: /^(?:# )/,
  regExForAutoFormatting: /^(?:# )/,
};

const markdownHeader2: MarkdownCriteria = {
  ...paragraphStartBase,
  export: createHeadingExport(2),
  markdownFormatKind: 'paragraphH2',
  regEx: /^(?:## )/,
  regExForAutoFormatting: /^(?:## )/,
};

const markdownHeader3: MarkdownCriteria = {
  ...paragraphStartBase,
  export: createHeadingExport(3),
  markdownFormatKind: 'paragraphH3',
  regEx: /^(?:### )/,
  regExForAutoFormatting: /^(?:### )/,
};

const markdownHeader4: MarkdownCriteria = {
  ...paragraphStartBase,
  export: createHeadingExport(4),
  markdownFormatKind: 'paragraphH4',
  regEx: /^(?:#### )/,
  regExForAutoFormatting: /^(?:#### )/,
};

const markdownHeader5: MarkdownCriteria = {
  ...paragraphStartBase,
  export: createHeadingExport(5),
  markdownFormatKind: 'paragraphH5',
  regEx: /^(?:##### )/,
  regExForAutoFormatting: /^(?:##### )/,
};

const markdownHeader6: MarkdownCriteria = {
  ...paragraphStartBase,
  export: createHeadingExport(6),
  markdownFormatKind: 'paragraphH6',
  regEx: /^(?:###### )/,
  regExForAutoFormatting: /^(?:###### )/,
};

const markdownBlockQuote: MarkdownCriteria = {
  ...paragraphStartBase,
  export: blockQuoteExport,
  markdownFormatKind: 'paragraphBlockQuote',
  regEx: /^(?:> )/,
  regExForAutoFormatting: /^(?:> )/,
};

const markdownUnorderedListDash: MarkdownCriteria = {
  ...paragraphStartBase,
  export: listExport,
  markdownFormatKind: 'paragraphUnorderedList',
  regEx: /^(\s{0,10})(?:- )/,
  regExForAutoFormatting: /^(\s{0,10})(?:- )/,
};

const markdownUnorderedListAsterisk: MarkdownCriteria = {
  ...paragraphStartBase,
  export: listExport,
  markdownFormatKind: 'paragraphUnorderedList',
  regEx: /^(\s{0,10})(?:\* )/,
  regExForAutoFormatting: /^(\s{0,10})(?:\* )/,
};

const markdownCodeBlock: MarkdownCriteria = {
  ...paragraphStartBase,
  export: codeBlockExport,
  markdownFormatKind: 'paragraphCodeBlock',
  regEx: /^(```)$/,
  regExForAutoFormatting: /^(```)([a-z]*)( )/,
};

const markdownOrderedList: MarkdownCriteria = {
  ...paragraphStartBase,
  export: listExport,
  markdownFormatKind: 'paragraphOrderedList',
  regEx: /^(\s{0,10})(\d+)\.\s/,
  regExForAutoFormatting: /^(\s{0,10})(\d+)\.\s/,
};

const markdownHorizontalRule: MarkdownCriteria = {
  ...paragraphStartBase,
  markdownFormatKind: 'horizontalRule',
  regEx: /^(?:\*\*\*)$/,
  regExForAutoFormatting: /^(?:\*\*\* )/,
};

const markdownHorizontalRuleUsingDashes: MarkdownCriteria = {
  ...paragraphStartBase,
  markdownFormatKind: 'horizontalRule',
  regEx: /^(?:---)$/,
  regExForAutoFormatting: /^(?:--- )/,
};

const markdownInlineCode: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'code',
  exportTag: '`',
  markdownFormatKind: 'code',
  regEx: /(`)(\s*)([^`]*)(\s*)(`)()/,
  regExForAutoFormatting: /(`)(\s*\b)([^`]*)(\b\s*)(`)(\s)$/,
};

const markdownBold: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'bold',
  exportTag: '**',
  markdownFormatKind: 'bold',
  regEx: /(\*\*)(\s*)([^**]*)(\s*)(\*\*)()/,
  regExForAutoFormatting: /(\*\*)(\s*\b)([^**]*)(\b\s*)(\*\*)(\s)$/,
};

const markdownItalic: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'italic',
  exportTag: '*',
  markdownFormatKind: 'italic',
  regEx: /(\*)(\s*)([^*]*)(\s*)(\*)()/,
  regExForAutoFormatting: /(\*)(\s*\b)([^*]*)(\b\s*)(\*)(\s)$/,
};

const markdownBold2: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'bold',
  exportTag: '_',
  markdownFormatKind: 'bold',
  regEx: /(__)(\s*)([^__]*)(\s*)(__)()/,
  regExForAutoFormatting: /(__)(\s*)([^__]*)(\s*)(__)(\s)$/,
};

const markdownItalic2: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'italic',
  exportTag: '_',
  markdownFormatKind: 'italic',
  regEx: /(_)()([^_]*)()(_)()/,
  regExForAutoFormatting: /(_)()([^_]*)()(_)(\s)$/, // Maintain 7 groups.
};
// Markdown does not support underline, but we can allow folks to use
// the HTML tags for underline.

const fakeMarkdownUnderline: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'underline',
  exportTag: '<u>',
  exportTagClose: '</u>',
  markdownFormatKind: 'underline',
  regEx: /(<u>)(\s*)([^<]*)(\s*)(<\/u>)()/,
  regExForAutoFormatting: /(<u>)(\s*\b)([^<]*)(\b\s*)(<\/u>)(\s)$/,
};

const markdownStrikethrough: MarkdownCriteria = {
  ...autoFormatBase,
  exportFormat: 'strikethrough',
  exportTag: '~~',
  markdownFormatKind: 'strikethrough',
  regEx: /(~~)(\s*)([^~~]*)(\s*)(~~)()/,
  regExForAutoFormatting: /(~~)(\s*\b)([^~~]*)(\b\s*)(~~)(\s)$/,
};

const markdownStrikethroughItalicBold: MarkdownCriteria = {
  ...autoFormatBase,
  markdownFormatKind: 'strikethrough_italic_bold',
  regEx: /(~~_\*\*)(\s*\b)([^~~_**][^**_~~]*)(\b\s*)(\*\*_~~)()/,
  regExForAutoFormatting:
    /(~~_\*\*)(\s*\b)([^~~_**][^**_~~]*)(\b\s*)(\*\*_~~)(\s)$/,
};

const markdownItalicbold: MarkdownCriteria = {
  ...autoFormatBase,
  markdownFormatKind: 'italic_bold',
  regEx: /(_\*\*)(\s*\b)([^_**][^**_]*)(\b\s*)(\*\*_)/,
  regExForAutoFormatting: /(_\*\*)(\s*\b)([^_**][^**_]*)(\b\s*)(\*\*_)(\s)$/,
};

const markdownStrikethroughItalic: MarkdownCriteria = {
  ...autoFormatBase,
  markdownFormatKind: 'strikethrough_italic',
  regEx: /(~~_)(\s*)([^~~_][^_~~]*)(\s*)(_~~)/,
  regExForAutoFormatting: /(~~_)(\s*)([^~~_][^_~~]*)(\s*)(_~~)(\s)$/,
};

const markdownStrikethroughBold: MarkdownCriteria = {
  ...autoFormatBase,
  markdownFormatKind: 'strikethrough_bold',
  regEx: /(~~\*\*)(\s*\b)([^~~**][^**~~]*)(\b\s*)(\*\*~~)/,
  regExForAutoFormatting:
    /(~~\*\*)(\s*\b)([^~~**][^**~~]*)(\b\s*)(\*\*~~)(\s)$/,
};

const markdownLink: MarkdownCriteria = {
  ...autoFormatBase,
  markdownFormatKind: 'link',
  regEx: /(\[)([^\]]*)(\]\()([^)]*)(\)*)()/,
  regExForAutoFormatting: /(\[)([^\]]*)(\]\()([^)]*)(\)*)(\s)$/,
};
const allMarkdownCriteriaForTextNodes: MarkdownCriteriaArray = [
  // Place the combination formats ahead of the individual formats.
  // Combos
  markdownStrikethroughItalicBold,
  markdownItalicbold,
  markdownStrikethroughItalic,
  markdownStrikethroughBold, // Individuals
  markdownInlineCode,
  markdownBold,
  markdownItalic, // Must appear after markdownBold
  markdownBold2,
  markdownItalic2, // Must appear after markdownBold2.
  fakeMarkdownUnderline,
  markdownStrikethrough,
  markdownLink,
];
const allMarkdownCriteriaForParagraphs: MarkdownCriteriaArray = [
  markdownHeader1,
  markdownHeader2,
  markdownHeader3,
  markdownHeader4,
  markdownHeader5,
  markdownHeader6,
  markdownBlockQuote,
  markdownUnorderedListDash,
  markdownUnorderedListAsterisk,
  markdownOrderedList,
  markdownCodeBlock,
  markdownHorizontalRule,
  markdownHorizontalRuleUsingDashes,
];
export const allMarkdownCriteria: MarkdownCriteriaArray = [
  ...allMarkdownCriteriaForParagraphs,
  ...allMarkdownCriteriaForTextNodes,
];

export function getAllTriggers(): Array<AutoFormatTrigger> {
  return triggers;
}

export function getAllMarkdownCriteriaForParagraphs(): MarkdownCriteriaArray {
  return allMarkdownCriteriaForParagraphs;
}

export function getAllMarkdownCriteriaForTextNodes(): MarkdownCriteriaArray {
  return allMarkdownCriteriaForTextNodes;
}

export function getAllMarkdownCriteria(): MarkdownCriteriaArray {
  return allMarkdownCriteria;
}

export function getInitialScanningContext(
  editor: LexicalEditor,
  isAutoFormatting: boolean,
  textNodeWithOffset: null | TextNodeWithOffset,
  triggerState: null | AutoFormatTriggerState,
): ScanningContext {
  return {
    currentElementNode: null,
    editor,
    isAutoFormatting,
    isWithinCodeBlock: false,
    joinedText: null,
    markdownCriteria: {
      markdownFormatKind: 'noTransformation',
      regEx: /(?:)/,
      // Empty reg ex.
      regExForAutoFormatting: /(?:)/,
      // Empty reg ex.
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
  scanningContext.joinedText = null;
  scanningContext.markdownCriteria = {
    markdownFormatKind: 'noTransformation',
    regEx: /(?:)/,
    // Empty reg ex.
    regExForAutoFormatting: /(?:)/,
    // Empty reg ex.
    requiresParagraphStart: null,
  };
  scanningContext.patternMatchResults = {
    regExCaptureGroups: [],
  };
  scanningContext.triggerState = null;
  scanningContext.textNodeWithOffset = null;
  return scanningContext;
}

export function getCodeBlockCriteria(): MarkdownCriteria {
  return markdownCodeBlock;
}

export function getPatternMatchResultsForCriteria(
  markdownCriteria: MarkdownCriteria,
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
): null | PatternMatchResults {
  if (markdownCriteria.requiresParagraphStart === true) {
    return getPatternMatchResultsForParagraphs(
      markdownCriteria,
      scanningContext,
    );
  }

  return getPatternMatchResultsForText(
    markdownCriteria,
    scanningContext,
    parentElementNode,
  );
}

export function getPatternMatchResultsForCodeBlock(
  scanningContext: ScanningContext,
  text: string,
): null | PatternMatchResults {
  const markdownCriteria = getCodeBlockCriteria();
  return getPatternMatchResultsWithRegEx(
    text,
    true,
    false,
    scanningContext.isAutoFormatting
      ? markdownCriteria.regExForAutoFormatting
      : markdownCriteria.regEx,
  );
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
  const regExMatches: RegExpMatchArray | null = textToSearch.match(regEx);

  if (
    regExMatches &&
    regExMatches.length > 0 &&
    (matchMustAppearAtStartOfString === false || regExMatches.index === 0) &&
    (matchMustAppearAtEndOfString === false || regExMatches.index
      ? regExMatches.index
      : 0 + regExMatches[0].length === textToSearch.length)
  ) {
    const captureGroupsCount = regExMatches.length;
    let runningLength = regExMatches.index || 0;

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

export function hasPatternMatchResults(
  scanningContext: ScanningContext,
): boolean {
  return scanningContext.patternMatchResults.regExCaptureGroups.length > 0;
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

function getPatternMatchResultsForParagraphs(
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
      scanningContext.isAutoFormatting
        ? markdownCriteria.regExForAutoFormatting
        : markdownCriteria.regEx,
    );
  }

  return null;
}

function getPatternMatchResultsForText(
  markdownCriteria: MarkdownCriteria,
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
): null | PatternMatchResults {
  if (scanningContext.joinedText == null) {
    if ($isElementNode(parentElementNode)) {
      if (scanningContext.joinedText == null) {
        // Lazy calculate the text to search.
        scanningContext.joinedText = $joinTextNodesInElementNode(
          parentElementNode,
          SEPARATOR_BETWEEN_TEXT_AND_NON_TEXT_NODES,
          getTextNodeWithOffsetOrThrow(scanningContext),
        );
      }
    } else {
      invariant(
        false,
        'Expected node %s to to be a ElementNode.',
        (parentElementNode as LexicalNode).__key,
      );
    }
  }

  const matchMustAppearAtEndOfString = Boolean(
    markdownCriteria.regExForAutoFormatting,
  );
  return getPatternMatchResultsWithRegEx(
    scanningContext.joinedText,
    false,
    matchMustAppearAtEndOfString,
    scanningContext.isAutoFormatting
      ? markdownCriteria.regExForAutoFormatting
      : markdownCriteria.regEx,
  );
}

function getNewNodeForCriteria<T>(
  scanningContext: ScanningContext,
  element: ElementNode,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
): {
  newNode: null | ElementNode;
  shouldDelete: boolean;
} {
  let newNode = null;
  const shouldDelete = false;
  const children = element.getChildren();
  const markdownCriteria = scanningContext.markdownCriteria;
  const patternMatchResults = scanningContext.patternMatchResults;

  if (markdownCriteria.markdownFormatKind != null) {
    switch (markdownCriteria.markdownFormatKind) {
      case 'paragraphH1': {
        newNode = $createHeadingNode('h1');
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphH2': {
        newNode = $createHeadingNode('h2');
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphH3': {
        newNode = $createHeadingNode('h3');
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphH4': {
        newNode = $createHeadingNode('h4');
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphH5': {
        newNode = $createHeadingNode('h5');
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphH6': {
        newNode = $createHeadingNode('h6');
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphBlockQuote': {
        newNode = $createQuoteNode();
        newNode.append(...children);
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'paragraphUnorderedList': {
        createListOrMergeWithPrevious(
          element,
          children,
          patternMatchResults,
          'bullet',
        );
        return {
          newNode: null,
          shouldDelete: false,
        };
      }

      case 'paragraphOrderedList': {
        const startAsString =
          patternMatchResults.regExCaptureGroups.length > 1
            ? patternMatchResults.regExCaptureGroups[
                patternMatchResults.regExCaptureGroups.length - 1
              ].text
            : '1';
        // For conversion, don't use start number.
        // For short-cuts aka autoFormatting, use start number.
        // Later, this should be surface dependent and externalized.
        const start = scanningContext.isAutoFormatting
          ? parseInt(startAsString, 10)
          : undefined;
        createListOrMergeWithPrevious(
          element,
          children,
          patternMatchResults,
          'number',
          start,
        );
        return {
          newNode: null,
          shouldDelete: false,
        };
      }

      case 'paragraphCodeBlock': {
        // Toggle code and paragraph nodes.
        if (scanningContext.isAutoFormatting === false) {
          const shouldToggle = hasPatternMatchResults(scanningContext);

          if (shouldToggle) {
            scanningContext.isWithinCodeBlock =
              scanningContext.isWithinCodeBlock !== true;
            // When toggling, always clear the code block element node.
            scanningContext.currentElementNode = null;
            return {
              newNode: null,
              shouldDelete: true,
            };
          }

          if (scanningContext.isWithinCodeBlock) {
            // Create the code block and return it to the caller.
            if (scanningContext.currentElementNode == null) {
              const newCodeBlockNode = $createCodeNode();
              newCodeBlockNode.append(...children);
              scanningContext.currentElementNode = newCodeBlockNode;
              return {
                newNode: newCodeBlockNode,
                shouldDelete: false,
              };
            }

            // Build up the code block with a line break and the children.
            if (scanningContext.currentElementNode != null) {
              const codeBlockNode = scanningContext.currentElementNode;
              const lineBreakNode = $createLineBreakNode();
              codeBlockNode.append(lineBreakNode);

              if (children.length) {
                codeBlockNode.append(lineBreakNode);
              }

              codeBlockNode.append(...children);
            }
          }

          return {
            newNode: null,
            shouldDelete: true,
          };
        }

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
        return {
          newNode,
          shouldDelete,
        };
      }

      case 'horizontalRule': {
        if (createHorizontalRuleNode != null) {
          // return null for newNode. Insert the HR here.
          const horizontalRuleNode = createHorizontalRuleNode();
          element.insertBefore(horizontalRuleNode);
        }

        break;
      }

      default:
        break;
    }
  }

  return {
    newNode,
    shouldDelete,
  };
}

function createListOrMergeWithPrevious(
  element: ElementNode,
  children: Array<LexicalNode>,
  patternMatchResults: PatternMatchResults,
  listType: ListType,
  start?: number,
): void {
  const listItem = $createListItemNode();
  const indentMatch =
    patternMatchResults.regExCaptureGroups[0].text.match(/^\s*/);
  const indent = indentMatch ? Math.floor(indentMatch[0].length / 4) : 0;
  listItem.append(...children);
  // Checking if previous element is a list, and if so append
  // new list item inside instead of creating new list
  const prevElement = element.getPreviousSibling();

  if ($isListNode(prevElement) && prevElement.getListType() === listType) {
    prevElement.append(listItem);
    element.remove();
  } else {
    const list = $createListNode(listType, start);
    list.append(listItem);
    element.replace(list);
  }

  if (indent) {
    listItem.setIndent(indent);
  }
}

export function transformTextNodeForMarkdownCriteria<T>(
  scanningContext: ScanningContext,
  elementNode: ElementNode,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
) {
  if (scanningContext.markdownCriteria.requiresParagraphStart === true) {
    transformTextNodeForElementNode(
      elementNode,
      scanningContext,
      createHorizontalRuleNode,
    );
  } else {
    transformTextNodeForText(scanningContext, elementNode);
  }
}

function transformTextNodeForElementNode<T>(
  elementNode: ElementNode,
  scanningContext: ScanningContext,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
): void {
  if (scanningContext.textNodeWithOffset != null) {
    const textNodeWithOffset = getTextNodeWithOffsetOrThrow(scanningContext);

    if (hasPatternMatchResults(scanningContext)) {
      const text =
        scanningContext.patternMatchResults.regExCaptureGroups[0].text;
      // Remove the text which we matched.
      const textNode = textNodeWithOffset.node.spliceText(
        0,
        text.length,
        '',
        true,
      );

      if (textNode.getTextContent() === '') {
        textNode.selectPrevious();
        textNode.remove();
      }
    }
  }

  // Transform the current element kind to the new element kind.
  const {newNode, shouldDelete} = getNewNodeForCriteria(
    scanningContext,
    elementNode,
    createHorizontalRuleNode,
  );

  if (shouldDelete) {
    elementNode.remove();
  } else if (newNode !== null) {
    elementNode.replace(newNode);
  }
}

function transformTextNodeForText(
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
) {
  const markdownCriteria = scanningContext.markdownCriteria;

  if (markdownCriteria.markdownFormatKind != null) {
    const formatting = getTextFormatType(markdownCriteria.markdownFormatKind);

    if (formatting != null) {
      transformTextNodeWithFormatting(
        formatting,
        scanningContext,
        parentElementNode,
      );
      return;
    }

    if (markdownCriteria.markdownFormatKind === 'link') {
      transformTextNodeWithLink(scanningContext, parentElementNode);
    }
  }
}

function transformTextNodeWithFormatting(
  formatting: Array<TextFormatType>,
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
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
  removeTextByCaptureGroups(5, 5, scanningContext, parentElementNode);
  // Remove group 1.
  removeTextByCaptureGroups(1, 1, scanningContext, parentElementNode);
  // Apply the formatting.
  formatTextInCaptureGroupIndex(
    formatting,
    3,
    scanningContext,
    parentElementNode,
  );
  // Place caret at end of final capture group.
  selectAfterFinalCaptureGroup(scanningContext, parentElementNode);
}

function transformTextNodeWithLink(
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
) {
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
  removeTextByCaptureGroups(1, 5, scanningContext, parentElementNode);
  insertTextPriorToCaptureGroup(
    1, // Insert at the beginning of the meaningful capture groups, namely index 1. Index 0 refers to the whole matched string.
    title,
    scanningContext,
    parentElementNode,
  );
  const newSelectionForLink = createSelectionWithCaptureGroups(
    1,
    1,
    false,
    true,
    scanningContext,
    parentElementNode,
  );

  if (newSelectionForLink == null) {
    return;
  }

  $setSelection(newSelectionForLink);
  scanningContext.editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  // Place caret at end of final capture group.
  selectAfterFinalCaptureGroup(scanningContext, parentElementNode);
}

// Below are lower level helper functions.

export function getParentElementNodeOrThrow(
  scanningContext: ScanningContext,
): ElementNode {
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
  markdownFormatKind: MarkdownFormatKind,
): null | Array<TextFormatType> {
  switch (markdownFormatKind) {
    case 'italic':
    case 'bold':
    case 'underline':
    case 'strikethrough':
    case 'code':
      return [markdownFormatKind];

    case 'strikethrough_italic_bold': {
      return ['strikethrough', 'italic', 'bold'];
    }

    case 'italic_bold': {
      return ['italic', 'bold'];
    }

    case 'strikethrough_italic': {
      return ['strikethrough', 'italic'];
    }

    case 'strikethrough_bold': {
      return ['strikethrough', 'bold'];
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
  parentElementNode: ElementNode,
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

  if (
    anchorTextNodeWithOffset == null &&
    focusTextNodeWithOffset == null &&
    parentElementNode.getChildren().length === 0
  ) {
    const emptyElementSelection = $createRangeSelection();
    emptyElementSelection.anchor.set(parentElementNode.getKey(), 0, 'element');
    emptyElementSelection.focus.set(parentElementNode.getKey(), 0, 'element');
    return emptyElementSelection;
  }

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
  anchorCaptureGroupIndex: number,
  focusCaptureGroupIndex: number,
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
) {
  const patternMatchResults = scanningContext.patternMatchResults;
  const regExCaptureGroups = patternMatchResults.regExCaptureGroups;
  const newSelection = createSelectionWithCaptureGroups(
    anchorCaptureGroupIndex,
    focusCaptureGroupIndex,
    false,
    true,
    scanningContext,
    parentElementNode,
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
  parentElementNode: ElementNode,
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
    parentElementNode,
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
  parentElementNode: ElementNode,
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
    parentElementNode,
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
function selectAfterFinalCaptureGroup(
  scanningContext: ScanningContext,
  parentElementNode: ElementNode,
) {
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
    parentElementNode,
  );

  if (newSelection != null) {
    $setSelection(newSelection);
  }
}

type BlockExport = (
  node: LexicalNode,
  // eslint-disable-next-line no-shadow
  exportChildren: (node: ElementNode) => string,
) => string | null;

function createHeadingExport(level: number): BlockExport {
  return (node, exportChildren) => {
    return $isHeadingNode(node) && node.getTag() === 'h' + level
      ? '#'.repeat(level) + ' ' + exportChildren(node)
      : null;
  };
}

function listExport(
  node: LexicalNode,
  exportChildren: (_node: ElementNode) => string,
) {
  return $isListNode(node) ? processNestedLists(node, exportChildren, 0) : null;
}

// TODO: should be param
const LIST_INDENT_SIZE = 4;

function processNestedLists(
  listNode: ListNode,
  exportChildren: (node: ElementNode) => string,
  depth: number,
): string {
  const output = [];
  const children = listNode.getChildren();
  let index = 0;

  for (const listItemNode of children) {
    if ($isListItemNode(listItemNode)) {
      if (listItemNode.getChildrenSize() === 1) {
        const firstChild = listItemNode.getFirstChild();

        if ($isListNode(firstChild)) {
          output.push(
            processNestedLists(firstChild, exportChildren, depth + 1),
          );
          continue;
        }
      }

      const indent = ' '.repeat(depth * LIST_INDENT_SIZE);
      const prefix =
        listNode.getListType() === 'bullet'
          ? '- '
          : `${listNode.getStart() + index}. `;
      output.push(indent + prefix + exportChildren(listItemNode));
      index++;
    }
  }

  return output.join('\n');
}

function blockQuoteExport(
  node: LexicalNode,
  exportChildren: (_node: ElementNode) => string,
) {
  return $isQuoteNode(node) ? '> ' + exportChildren(node) : null;
}

function codeBlockExport(node: LexicalNode) {
  if (!$isCodeNode(node)) {
    return null;
  }

  const textContent = node.getTextContent();
  return (
    '```' +
    (node.getLanguage() || '') +
    (textContent ? '\n' + textContent : '') +
    '\n' +
    '```'
  );
}
