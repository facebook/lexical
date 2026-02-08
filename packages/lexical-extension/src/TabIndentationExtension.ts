/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementNode,
  Klass,
  LexicalCommand,
  LexicalEditor,
  RangeSelection,
} from 'lexical';

import {$handleIndentAndOutdent} from '@lexical/rich-text';
import {$getNearestBlockElementAncestorOrThrow} from '@lexical/utils';
import {
  $createRangeSelection,
  $getSelection,
  $isBlockElementNode,
  $isRangeSelection,
  $normalizeSelection__EXPERIMENTAL,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  defineExtension,
  INDENT_CONTENT_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  OUTDENT_CONTENT_COMMAND,
  safeCast,
} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect, type ReadonlySignal} from './signals';

function $indentOverTab(selection: RangeSelection): boolean {
  // const handled = new Set();
  const nodes = selection.getNodes();
  const canIndentBlockNodes = nodes.filter(
    (node) => $isBlockElementNode(node) && node.canIndent(),
  );
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
  maxIndent?: number | ReadonlySignal<null | number>,
  allowedNodes?:
    | Array<Klass<ElementNode>>
    | ReadonlySignal<null | Array<Klass<ElementNode>>>,
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
        const command: LexicalCommand<void> = $indentOverTab(selection)
          ? event.shiftKey
            ? OUTDENT_CONTENT_COMMAND
            : INDENT_CONTENT_COMMAND
          : INSERT_TAB_COMMAND;
        return editor.dispatchCommand(command, undefined);
      },
      COMMAND_PRIORITY_EDITOR,
    ),

    editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => {
        const currentMaxIndent: null | number =
          typeof maxIndent === 'number'
            ? maxIndent
            : maxIndent
              ? maxIndent.peek()
              : null;

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const currentAllowedNodes = Array.isArray(allowedNodes)
          ? allowedNodes
          : allowedNodes
            ? allowedNodes.peek()
            : null;
        if (currentAllowedNodes && currentAllowedNodes.length > 0) {
          $handleIndentAndOutdent((block) => {
            if (currentAllowedNodes.some((klass) => block instanceof klass)) {
              const newIndent = block.getIndent() + 1;
              if (!currentMaxIndent || newIndent < currentMaxIndent) {
                block.setIndent(newIndent);
              }
            }
          });
          return true;
        }

        if (currentMaxIndent == null) {
          return false;
        }

        const indents = selection
          .getNodes()
          .map((node) =>
            $getNearestBlockElementAncestorOrThrow(node).getIndent(),
          );

        return Math.max(...indents) + 1 >= currentMaxIndent;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
}

export interface TabIndentationConfig {
  disabled: boolean;
  maxIndent: null | number;
  /**
   * By default, indents are set on all elements for which the {@link ElementNode.canIndent} returns true.
   * This option allows you to set indents for specific classes without overriding the method for others.
   */
  allowedNodes: Array<Klass<ElementNode>>;
}

/**
 * This extension adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect accessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
export const TabIndentationExtension = defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: safeCast<TabIndentationConfig>({
    allowedNodes: [],
    disabled: false,
    maxIndent: null,
  }),
  name: '@lexical/extension/TabIndentation',
  register(editor, config, state) {
    const {disabled, maxIndent, allowedNodes} = state.getOutput();
    return effect(() => {
      if (!disabled.value) {
        return registerTabIndentation(editor, maxIndent, allowedNodes);
      }
    });
  },
});
