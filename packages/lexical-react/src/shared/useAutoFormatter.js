/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  AutoFormatCriteriaArray,
  AutoFormatCriteriaWithPatternMatchResults,
  AutoFormatTriggerState,
  ScanningContext,
} from './AutoFormatterUtils.js';
import type {TextNodeWithOffset} from '@lexical/text';
import type {
  EditorState,
  GridSelection,
  LexicalEditor,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {$isListItemNode} from '@lexical/list';
import {$getSelection, $isRangeSelection, $isTextNode} from 'lexical';
import {$isCodeNode} from 'lexical/CodeNode';
import {useEffect} from 'react';

import {
  getAllAutoFormatCriteria,
  getAllAutoFormatCriteriaForTextNodes,
  getInitialScanningContext,
  getPatternMatchResultsForCriteria,
  transformTextNodeForAutoFormatCriteria,
  TRIGGER_STRING,
} from './AutoFormatterUtils.js';

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

function updateAutoFormatting(
  editor: LexicalEditor,
  scanningContext: ScanningContext,
): void {
  editor.update(
    () => {
      transformTextNodeForAutoFormatCriteria(scanningContext);
    },
    {
      tag: 'history-push',
    },
  );
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

function findScanningContext(
  editor: LexicalEditor,
  currentTriggerState: null | AutoFormatTriggerState,
  priorTriggerState: null | AutoFormatTriggerState,
): null | ScanningContext {
  if (currentTriggerState == null || priorTriggerState == null) {
    return null;
  }

  // The below checks needs to execute relativey quickly, so perform the light-weight ones first.
  // The substr check is a quick way to avoid autoformat parsing in that it looks for the autoformat
  // trigger which is the trigger string (" ").
  const triggerStringLength = TRIGGER_STRING.length;
  const currentTextContentLength = currentTriggerState.textContent.length;
  const triggerOffset = currentTriggerState.anchorOffset - triggerStringLength;

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
      ) === TRIGGER_STRING &&
      currentTriggerState.textContent !== priorTriggerState.textContent) ===
    false
  ) {
    return null;
  }

  return findScanningContextWithValidMatch(editor, currentTriggerState);
}

function getTriggerState(
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

export default function useAutoFormatter(editor: LexicalEditor): void {
  useEffect(() => {
    // The priorTriggerState is compared against the currentTriggerState to determine
    // if the user has performed some typing event that warrants an auto format.
    // For example, typing "#" and then " ", shoud trigger an format.
    // However, given "#A B", where the user delets "A" should not.

    let priorTriggerState: null | AutoFormatTriggerState = null;
    return editor.registerUpdateListener(({tags}) => {
      // Examine historic so that we are not running autoformatting within markdown.
      if (tags.has('historic') === false) {
        const currentTriggerState = getTriggerState(editor.getEditorState());
        const scanningContext =
          currentTriggerState == null
            ? null
            : findScanningContext(
                editor,
                currentTriggerState,
                priorTriggerState,
              );
        if (scanningContext != null) {
          updateAutoFormatting(editor, scanningContext);
        }
        priorTriggerState = currentTriggerState;
      } else {
        priorTriggerState = null;
      }
    });
  }, [editor]);
}
