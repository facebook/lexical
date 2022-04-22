/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {AutoFormatTriggerState} from './utils';
import type {DecoratorNode, LexicalEditor} from 'lexical';

import {
  findScanningContext,
  getTriggerState,
  updateAutoFormatting,
} from './autoFormatUtils';
import {
  convertMarkdownForElementNodes,
  convertStringToLexical,
} from './convertFromPlainTextUtils.js';

export function registerMarkdownShortcuts<T>(
  editor: LexicalEditor,
  createHorizontalRuleNode: () => DecoratorNode<T>,
): () => void {
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
          : findScanningContext(editor, currentTriggerState, priorTriggerState);
      if (scanningContext != null) {
        updateAutoFormatting(editor, scanningContext, createHorizontalRuleNode);
      }
      priorTriggerState = currentTriggerState;
    } else {
      priorTriggerState = null;
    }
  });
}

export function $convertFromMarkdownString<T>(
  markdownString: string,
  editor: LexicalEditor,
  createHorizontalRuleNode: null | (() => DecoratorNode<T>),
): void {
  if (convertStringToLexical(markdownString, editor) != null) {
    convertMarkdownForElementNodes(editor, createHorizontalRuleNode);
  }
}

export {$convertToMarkdownString} from './convertToMarkdown';
