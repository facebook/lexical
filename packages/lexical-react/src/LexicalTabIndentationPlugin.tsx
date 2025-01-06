/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, RangeSelection} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $filter,
  $getNearestBlockElementAncestorOrThrow,
  mergeRegister,
} from '@lexical/utils';
import {
  $createRangeSelection,
  $getSelection,
  $isBlockElementNode,
  $isElementNode,
  $isRangeSelection,
  $normalizeSelection__EXPERIMENTAL,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  INDENT_CONTENT_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

function $indentOverTab(selection: RangeSelection): boolean {
  // const handled = new Set();
  const nodes = selection.getNodes();
  const canIndentBlockNodes = $filter(nodes, (node) => {
    if ($isBlockElementNode(node) && node.canIndent()) {
      return node;
    }
    return null;
  });
  // 1. If selection spans across canIndent block nodes: indent
  if (canIndentBlockNodes.length > 0) {
    return true;
  }
  // 2. If first (anchor/focus) is at block start: indent
  const anchor = selection.anchor;
  const focus = selection.focus;
  const first = focus.isBefore(anchor) ? focus : anchor;
  const firstNode = first.getNode();
  const firstBlock = $getNearestBlockElementAncestorOrThrow(firstNode);
  if (firstBlock.canIndent()) {
    const firstBlockKey = firstBlock.getKey();
    let selectionAtStart = $createRangeSelection();
    selectionAtStart.anchor.set(firstBlockKey, 0, 'element');
    selectionAtStart.focus.set(firstBlockKey, 0, 'element');
    selectionAtStart = $normalizeSelection__EXPERIMENTAL(selectionAtStart);
    if (selectionAtStart.anchor.is(first)) {
      return true;
    }
  }
  // 3. Else: tab
  return false;
}

export function registerTabIndentation(
  editor: LexicalEditor,
  maxIndent?: number,
) {
  return mergeRegister(
    editor.registerCommand<KeyboardEvent>(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        event.preventDefault();
        return $indentOverTab(selection)
          ? event.shiftKey
            ? editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
            : editor.dispatchCommand(INDENT_CONTENT_COMMAND, maxIndent)
          : editor.dispatchCommand(INSERT_TAB_COMMAND, undefined);
      },
      COMMAND_PRIORITY_EDITOR,
    ),

    editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => {
        if (maxIndent == null) {
          return false;
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const indents = selection
          .getNodes()
          .map((node) =>
            ($isElementNode(node) && !node.isInline()
              ? node
              : node.getParentOrThrow()
            ).getIndent(),
          );

        return Math.max(...indents) + 1 >= maxIndent;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
}

/**
 * This plugin adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect acessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
export function TabIndentationPlugin({maxIndent}: {maxIndent?: number}): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerTabIndentation(editor, maxIndent);
  }, [editor, maxIndent]);

  return null;
}
