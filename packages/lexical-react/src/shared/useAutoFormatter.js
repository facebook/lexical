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
  AutoFormatCriteriaWithMatchResultContext,
  AutoFormatTriggerState,
  ScanningContext,
} from './AutoFormatterUtils.js';
import type {TextNodeWithOffset} from '@lexical/helpers/text';
import type {EditorState, LexicalEditor, RangeSelection} from 'lexical';

import {$isListItemNode} from '@lexical/list';
import {$getSelection, $isTextNode} from 'lexical';
import {$isCodeNode} from 'lexical/CodeNode';
import {useEffect} from 'react';

import {
  getAllAutoFormatCriteria,
  getAllAutoFormatCriteriaForTextNodes,
  getMatchResultContextForCriteria,
  transformTextNodeForAutoFormatCriteria,
  TRIGGER_STRING,
} from './AutoFormatterUtils.js';

function getCriteriaWithMatchResultContext(
  autoFormatCriteriaArray: AutoFormatCriteriaArray,
  currentTriggerState: AutoFormatTriggerState,
  scanningContext: ScanningContext,
): AutoFormatCriteriaWithMatchResultContext {
  const count = autoFormatCriteriaArray.length;
  for (let i = 0; i < count; i++) {
    const autoFormatCriteria = autoFormatCriteriaArray[i];

    // Skip code block nodes, unless the nodeTransformationKind calls for toggling the code block.
    if (
      currentTriggerState.isCodeBlock === false ||
      autoFormatCriteria.nodeTransformationKind === 'paragraphCodeBlock'
    ) {
      const matchResultContext = getMatchResultContextForCriteria(
        autoFormatCriteria,
        scanningContext,
      );
      if (matchResultContext != null) {
        matchResultContext.triggerState = currentTriggerState;
        return {
          autoFormatCriteria: autoFormatCriteria,
          matchResultContext,
        };
      }
    }
  }
  return {autoFormatCriteria: null, matchResultContext: null};
}

function getTextNodeForAutoFormatting(
  selection: null | RangeSelection,
): null | TextNodeWithOffset {
  if (selection == null) {
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
  currentTriggerState: AutoFormatTriggerState,
): void {
  editor.update(() => {
    const textNodeWithOffset = getTextNodeForAutoFormatting($getSelection());

    if (textNodeWithOffset === null) {
      return;
    }

    // Please see the declaration of ScanningContext for a detailed explanation.
    const scanningContext: ScanningContext = {
      joinedText: null,
      textNodeWithOffset,
    };
    const criteriaWithMatchResultContext = getCriteriaWithMatchResultContext(
      // Do not apply paragraph node changes like blockQuote or H1 to listNodes. Also, do not attempt to transform a list into a list using * or -.
      currentTriggerState.isParentAListItemNode === false
        ? getAllAutoFormatCriteria()
        : getAllAutoFormatCriteriaForTextNodes(),
      currentTriggerState,
      scanningContext,
    );

    if (
      criteriaWithMatchResultContext.autoFormatCriteria === null ||
      criteriaWithMatchResultContext.matchResultContext === null
    ) {
      return;
    }

    transformTextNodeForAutoFormatCriteria(
      scanningContext,
      criteriaWithMatchResultContext.autoFormatCriteria,
      criteriaWithMatchResultContext.matchResultContext,
    );
  });
}

function shouldAttemptToAutoFormat(
  currentTriggerState: null | AutoFormatTriggerState,
  priorTriggerState: null | AutoFormatTriggerState,
): boolean {
  if (currentTriggerState == null || priorTriggerState == null) {
    return false;
  }

  // The below checks needs to execute relativey quickly, so perform the light-weight ones first.
  // The substr check is a quick way to avoid autoformat parsing in that it looks for the autoformat
  // trigger which is the trigger string (" ").
  const triggerStringLength = TRIGGER_STRING.length;
  const currentTextContentLength = currentTriggerState.textContent.length;
  const triggerOffset = currentTriggerState.anchorOffset - triggerStringLength;

  return (
    currentTriggerState.hasParentNode === true &&
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
    currentTriggerState.textContent !== priorTriggerState.textContent
  );
}

function getTriggerState(
  editorState: EditorState,
): null | AutoFormatTriggerState {
  let criteria: null | AutoFormatTriggerState = null;

  editorState.read(() => {
    const selection = $getSelection();
    if (selection == null || !selection.isCollapsed()) {
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
    editor.addListener('update', ({tags}) => {
      // Examine historic so that we are not running autoformatting within markdown.
      if (tags.has('historic') === false) {
        const currentTriggerState = getTriggerState(editor.getEditorState());

        if (
          shouldAttemptToAutoFormat(currentTriggerState, priorTriggerState) &&
          currentTriggerState != null
        ) {
          updateAutoFormatting(editor, currentTriggerState);
        }
        priorTriggerState = currentTriggerState;
      } else {
        priorTriggerState = null;
      }
    });
  }, [editor]);
}
