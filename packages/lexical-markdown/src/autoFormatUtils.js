/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  AutoFormatCriteria,
  AutoFormatCriteriaArray,
  AutoFormatCriteriaWithPatternMatchResults,
  AutoFormatTrigger,
  AutoFormatTriggerState,
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
  allAutoFormatCriteria,
  allAutoFormatCriteriaForTextNodes,
  getInitialScanningContext,
  getPatternMatchResultsForParagraphs,
  getPatternMatchResultsForText,
  transformTextNodeForParagraphs,
  transformTextNodeForText,
  triggers,
} from './utils';

export function getAllTriggers(): Array<AutoFormatTrigger> {
  return triggers;
}

export function getAllAutoFormatCriteriaForTextNodes(): AutoFormatCriteriaArray {
  return allAutoFormatCriteriaForTextNodes;
}

export function getAllAutoFormatCriteria(): AutoFormatCriteriaArray {
  return allAutoFormatCriteria;
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

export function transformTextNodeForAutoFormatCriteria<T>(
  scanningContext: ScanningContext,
  createHorizontalRuleNode: () => DecoratorNode<T>,
) {
  if (scanningContext.autoFormatCriteria.requiresParagraphStart) {
    transformTextNodeForParagraphs(scanningContext, createHorizontalRuleNode);
  } else {
    transformTextNodeForText(scanningContext);
  }
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
      transformTextNodeForAutoFormatCriteria(
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
  autoFormatCriteriaArray: AutoFormatCriteriaArray,
  scanningContext: ScanningContext,
): AutoFormatCriteriaWithPatternMatchResults {
  const currentTriggerState = scanningContext.triggerState;

  const count = autoFormatCriteriaArray.length;
  for (let i = 0; i < count; i++) {
    const autoFormatCriteria = autoFormatCriteriaArray[i];

    // Skip code block nodes, unless the autoFormatKind calls for toggling the code block.
    if (
      (currentTriggerState != null &&
        currentTriggerState.isCodeBlock === false) ||
      autoFormatCriteria.autoFormatKind === 'paragraphCodeBlock'
    ) {
      const patternMatchResults = getPatternMatchResultsForCriteria(
        autoFormatCriteria,
        scanningContext,
      );
      if (patternMatchResults != null) {
        return {
          autoFormatCriteria: autoFormatCriteria,
          patternMatchResults,
        };
      }
    }
  }
  return {autoFormatCriteria: null, patternMatchResults: null};
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
      textNodeWithOffset,
      currentTriggerState,
    );

    const criteriaWithPatternMatchResults = getCriteriaWithPatternMatchResults(
      // Do not apply paragraph node changes like blockQuote or H1 to listNodes. Also, do not attempt to transform a list into a list using * or -.
      currentTriggerState.isParentAListItemNode === false
        ? getAllAutoFormatCriteria()
        : getAllAutoFormatCriteriaForTextNodes(),
      initialScanningContext,
    );

    if (
      criteriaWithPatternMatchResults.autoFormatCriteria === null ||
      criteriaWithPatternMatchResults.patternMatchResults === null
    ) {
      return;
    }
    scanningContext = initialScanningContext;
    // Lazy fill-in the particular format criteria and any matching result information.
    scanningContext.autoFormatCriteria =
      criteriaWithPatternMatchResults.autoFormatCriteria;
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

    const isParentAListItemNode =
      parentNode !== null && $isListItemNode(parentNode);

    const hasParentNode = parentNode !== null;

    criteria = {
      anchorOffset: selection.anchor.offset,
      hasParentNode,
      isCodeBlock: $isCodeNode(node),
      isParentAListItemNode,
      isSelectionCollapsed: selection.isCollapsed(),
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
        currentTriggerState.nodeKey === priorTriggerState.nodeKey &&
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
