/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  AutoFormatTrigger,
  AutoFormatTriggerState,
  MarkdownCriteria,
  MarkdownCriteriaArray,
  MarkdownCriteriaWithPatternMatchResults,
  PatternMatchResults,
  ScanningContext,
} from './utils';
import type {TextNodeWithOffset} from '@lexical/text';
import type {
  DecoratorNode,
  EditorState,
  GridSelection,
  LexicalEditor,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {$isCodeNode} from '@lexical/code';
import {$isListItemNode} from '@lexical/list';
import {$getSelection, $isRangeSelection, $isTextNode} from 'lexical';

import {
  allMarkdownCriteria,
  allMarkdownCriteriaForTextNodes,
  getInitialScanningContext,
  getPatternMatchResultsForParagraphs,
  getPatternMatchResultsForText,
  getTextNodeWithOffsetOrThrow,
  transformTextNodeForElementNode,
  transformTextNodeForText,
  triggers,
} from './utils';

export function getAllTriggers(): Array<AutoFormatTrigger> {
  return triggers;
}

export function getAllMarkdownCriteriaForTextNodes(): MarkdownCriteriaArray {
  return allMarkdownCriteriaForTextNodes;
}

export function getAllMarkdownCriteria(): MarkdownCriteriaArray {
  return allMarkdownCriteria;
}

export function transformTextNodeForMarkdownCriteria<T>(
  scanningContext: ScanningContext,
  createHorizontalRuleNode: () => DecoratorNode<T>,
) {
  if (scanningContext.markdownCriteria.requiresParagraphStart === true) {
    const elementNode =
      getTextNodeWithOffsetOrThrow(scanningContext).node.getParentOrThrow();
    transformTextNodeForElementNode(
      elementNode,
      scanningContext,
      createHorizontalRuleNode,
    );
  } else {
    transformTextNodeForText(scanningContext);
  }
}

function getPatternMatchResultsForCriteria(
  markdownCriteria: MarkdownCriteria,
  scanningContext: ScanningContext,
): null | PatternMatchResults {
  if (markdownCriteria.requiresParagraphStart === true) {
    return getPatternMatchResultsForParagraphs(
      markdownCriteria,
      scanningContext,
    );
  }
  return getPatternMatchResultsForText(markdownCriteria, scanningContext);
}

function getTextNodeForAutoFormatting(
  selection: null | RangeSelection | NodeSelection | GridSelection,
): null | TextNodeWithOffset {
  if (!$isRangeSelection(selection)) {
    return null;
  }
  const node = selection.anchor.getNode();

  if (!$isTextNode(node)) {
    return null;
  }
  return {node, offset: selection.anchor.offset};
}

export function updateAutoFormatting<T>(
  editor: LexicalEditor,
  scanningContext: ScanningContext,
  createHorizontalRuleNode: () => DecoratorNode<T>,
): void {
  editor.update(
    () => {
      transformTextNodeForMarkdownCriteria(
        scanningContext,
        createHorizontalRuleNode,
      );
    },
    {
      tag: 'history-push',
    },
  );
}

function getCriteriaWithPatternMatchResults(
  markdownCriteriaArray: MarkdownCriteriaArray,
  scanningContext: ScanningContext,
): MarkdownCriteriaWithPatternMatchResults {
  const currentTriggerState = scanningContext.triggerState;

  const count = markdownCriteriaArray.length;
  for (let i = 0; i < count; i++) {
    const markdownCriteria = markdownCriteriaArray[i];

    // Skip code block nodes, unless the autoFormatKind calls for toggling the code block.
    if (
      (currentTriggerState != null &&
        currentTriggerState.isCodeBlock === false) ||
      markdownCriteria.markdownFormatKind === 'paragraphCodeBlock'
    ) {
      const patternMatchResults = getPatternMatchResultsForCriteria(
        markdownCriteria,
        scanningContext,
      );
      if (patternMatchResults != null) {
        return {
          markdownCriteria,
          patternMatchResults,
        };
      }
    }
  }
  return {markdownCriteria: null, patternMatchResults: null};
}

function findScanningContextWithValidMatch(
  editor: LexicalEditor,
  currentTriggerState: AutoFormatTriggerState,
): null | ScanningContext {
  let scanningContext = null;
  editor.getEditorState().read(() => {
    const textNodeWithOffset = getTextNodeForAutoFormatting($getSelection());

    if (textNodeWithOffset === null) {
      return;
    }

    // Please see the declaration of ScanningContext for a detailed explanation.
    const initialScanningContext = getInitialScanningContext(
      editor,
      true,
      textNodeWithOffset,
      currentTriggerState,
    );

    const criteriaWithPatternMatchResults = getCriteriaWithPatternMatchResults(
      // Do not apply paragraph node changes like blockQuote or H1 to listNodes. Also, do not attempt to transform a list into a list using * or -.
      currentTriggerState.isParentAListItemNode === false
        ? getAllMarkdownCriteria()
        : getAllMarkdownCriteriaForTextNodes(),
      initialScanningContext,
    );

    if (
      criteriaWithPatternMatchResults.markdownCriteria === null ||
      criteriaWithPatternMatchResults.patternMatchResults === null
    ) {
      return;
    }
    scanningContext = initialScanningContext;
    // Lazy fill-in the particular format criteria and any matching result information.
    scanningContext.markdownCriteria =
      criteriaWithPatternMatchResults.markdownCriteria;
    scanningContext.patternMatchResults =
      criteriaWithPatternMatchResults.patternMatchResults;
  });
  return scanningContext;
}

export function getTriggerState(
  editorState: EditorState,
): null | AutoFormatTriggerState {
  let criteria: null | AutoFormatTriggerState = null;

  editorState.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }
    const node = selection.anchor.getNode();
    const parentNode = node.getParent();

    const isParentAListItemNode = $isListItemNode(parentNode);

    const hasParentNode = parentNode !== null;

    criteria = {
      anchorOffset: selection.anchor.offset,
      hasParentNode,
      isCodeBlock: $isCodeNode(node),
      isParentAListItemNode,
      isSelectionCollapsed: true,
      isSimpleText: $isTextNode(node) && node.isSimpleText(),
      nodeKey: node.getKey(),
      textContent: node.getTextContent(),
    };
  });

  return criteria;
}

export function findScanningContext(
  editor: LexicalEditor,
  currentTriggerState: null | AutoFormatTriggerState,
  priorTriggerState: null | AutoFormatTriggerState,
): null | ScanningContext {
  if (currentTriggerState == null || priorTriggerState == null) {
    return null;
  }

  const triggerArray = getAllTriggers();
  const triggerCount = triggers.length;
  for (let ti = 0; ti < triggerCount; ti++) {
    const triggerString = triggerArray[ti].triggerString;
    // The below checks needs to execute relativey quickly, so perform the light-weight ones first.
    // The substr check is a quick way to avoid autoformat parsing in that it looks for the autoformat
    // trigger which is the trigger string (" ").
    const triggerStringLength = triggerString.length;
    const currentTextContentLength = currentTriggerState.textContent.length;
    const triggerOffset =
      currentTriggerState.anchorOffset - triggerStringLength;

    if (
      (currentTriggerState.hasParentNode === true &&
        currentTriggerState.isSimpleText &&
        currentTriggerState.isSelectionCollapsed &&
        currentTriggerState.anchorOffset !== priorTriggerState.anchorOffset &&
        triggerOffset >= 0 &&
        triggerOffset + triggerStringLength <= currentTextContentLength &&
        currentTriggerState.textContent.substr(
          triggerOffset,
          triggerStringLength,
        ) === triggerString && // Some code differentiation needed if trigger kind is not a simple space character.
        currentTriggerState.textContent !== priorTriggerState.textContent) ===
      false
    ) {
      return null;
    }
  }

  return findScanningContextWithValidMatch(editor, currentTriggerState);
}
