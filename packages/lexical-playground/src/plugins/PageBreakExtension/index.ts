/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineImportRule, DOMImportExtension, sel} from '@lexical/html';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  LexicalCommand,
} from 'lexical';

import {$createPageBreakNode, PageBreakNode} from '../../nodes/PageBreakNode';

export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand();

const PageBreakImportRule = defineImportRule({
  $import: () => [$createPageBreakNode()],
  match: sel.tag('figure').attr('type', PageBreakNode.getType()),
  name: '@lexical/playground/page-break',
});

export const PageBreakExtension = defineExtension({
  dependencies: [
    configExtension(DOMImportExtension, {rules: [PageBreakImportRule]}),
  ],
  name: '@lexical/playground/PageBreak',
  nodes: [PageBreakNode],
  register: editor =>
    editor.registerCommand(
      INSERT_PAGE_BREAK,
      () => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const focusNode = selection.focus.getNode();
        if (focusNode !== null) {
          const pgBreak = $createPageBreakNode();
          $insertNodeToNearestRoot(pgBreak);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
});
