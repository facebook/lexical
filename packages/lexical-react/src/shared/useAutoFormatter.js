/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState} from 'lexical';
import type {LexicalEditor, Selection} from 'lexical';
import type {
  AutoFormatCriteriaArray,
  AutoFormatTriggerState,
  AutoFormatCriteriaWithMatchResultContext,
  TextNodeWithOffset,
} from './AutoFormatterUtils.js';

import {$isCodeNode} from 'lexical/CodeNode';
import {$isParagraphNode} from 'lexical/ParagraphNode';
import {$isTextNode, $getSelection} from 'lexical';
import {useEffect} from 'react';
import {
  getAllAutoFormatCriteria,
  getMatchResultContextForCriteria,
  transformTextNodeForAutoFormatCriteria,
} from './AutoFormatterUtils.js';

function getCriteriaWithMatchResultContext(
  textNodeWithOffset: TextNodeWithOffset,
  autoFormatCriteriaArray: AutoFormatCriteriaArray,
): AutoFormatCriteriaWithMatchResultContext {
  const count = autoFormatCriteriaArray.length;
  for (let i = 0; i < count; ++i) {
    const matchResultContext = getMatchResultContextForCriteria(
      autoFormatCriteriaArray[i],
      textNodeWithOffset,
    );
    if (matchResultContext != null) {
      return {
        autoFormatCriteria: autoFormatCriteriaArray[i],
        matchResultContext,
      };
    }
  }
  return {autoFormatCriteria: null, matchResultContext: null};
}

function getTextNodeForAutoFormatting(
  selection: null | Selection,
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

function updateAutoFormatting(editor: LexicalEditor): void {
  editor.update(() => {
    const textNodeWithOffset = getTextNodeForAutoFormatting($getSelection());

    if (textNodeWithOffset === null) {
      return;
    }

    const criteriaWithMatchResultContext = getCriteriaWithMatchResultContext(
      textNodeWithOffset,
      getAllAutoFormatCriteria(),
    );

    if (
      criteriaWithMatchResultContext.autoFormatCriteria === null ||
      criteriaWithMatchResultContext.matchResultContext === null
    ) {
      return;
    }

    transformTextNodeForAutoFormatCriteria(
      textNodeWithOffset,
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

  return (
    currentTriggerState.isCodeBlock === false &&
    currentTriggerState.isSimpleText &&
    currentTriggerState.isSelectionCollapsed &&
    currentTriggerState.nodeKey === priorTriggerState.nodeKey &&
    currentTriggerState.anchorOffset !== priorTriggerState.anchorOffset &&
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
    criteria = {
      anchorOffset: selection.anchor.offset,
      isCodeBlock: $isCodeNode(node),
      isSelectionCollapsed: selection.isCollapsed(),
      isSimpleText: $isTextNode(node) && node.isSimpleText(),
      isParentAParagraphNode:
        parentNode !== null && $isParagraphNode(parentNode),
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

        if (shouldAttemptToAutoFormat(currentTriggerState, priorTriggerState)) {
          updateAutoFormatting(editor);
        }
        priorTriggerState = currentTriggerState;
      } else {
        priorTriggerState = null;
      }
    });
  }, [editor]);
}
