/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createNodeSelection,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $selectAll,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  ElementNode,
  RangeSelection,
  safeCast,
  SELECT_ALL_COMMAND,
} from 'lexical';

import {TextNode} from '../../lexical/Lexical';
import {PreventSelectAllExtension} from '.';
import {namedSignals} from './namedSignals';
import {effect} from './signals';

const getEndOffset = (node: TextNode | ElementNode): number =>
  $isTextNode(node) ? node.getTextContentSize() : node.getChildrenSize();

function $isBlockFullySelected(
  blockNode: ElementNode,
  selection: RangeSelection,
): boolean {
  const anchor = selection.anchor;
  const focus = selection.focus;

  const first = blockNode.getFirstDescendant();
  const last = blockNode.getLastDescendant();

  if (!first || !last) return false;

  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  function isAtStart(node: LexicalNode, offset: number): boolean {
    if (node.is(first) && offset === 0) return true;
    // anchor/focus on top-level before first child decorator
    if ($isElementNode(node) && node.is(first.getTopLevelElement())) {
      return offset === first.getIndexWithinParent();
    }
    return false;
  }

  function isAtEnd(node: LexicalNode, offset: number): boolean {
    if (node.is(last)) {
      return offset === getEndOffset(node);
    }
    // anchor/focus on top-level after last child decorator
    if ($isElementNode(node) && node.is(last.getTopLevelElement())) {
      return offset === last.getIndexWithinParent() + 1;
    }
    return false;
  }

  const anchorAtStart = isAtStart(anchorNode, anchor.offset);
  const focusAtEnd = isAtEnd(focusNode, focus.offset);

  const focusAtStart = isAtStart(focusNode, focus.offset);
  const anchorAtEnd = isAtEnd(anchorNode, anchor.offset);

  return (anchorAtStart && focusAtEnd) || (focusAtStart && anchorAtEnd);
}

export interface SelectBlockConfig {
  disabled: boolean;
}

// TODO test-cases:
// - select_all on paragraph with simple text only
// - select_all on paragraph with mixed text
// - select_all on paragraph with decoratornode (decorator at the start / at the middle / at the end)
//   - edge text with inline element parent
// - select_all on decoratornode
// - select_all on several decoratornodes
// - select_all on empty paragraph -> ?
// - select_all on partial selection -> select block -> select all
// - select_all on paragraph within shadow root

// TODO:
// - select_all from nested editor

export const SelectBlockExtension = defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: safeCast<SelectBlockConfig>({
    disabled: false,
  }),
  dependencies: [PreventSelectAllExtension],
  name: '@lexical/SelectBlock',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      if (!stores.disabled.value) {
        let prevSelectionAll: RangeSelection | null = null;
        return editor.registerCommand(
          SELECT_ALL_COMMAND,
          (event, triggerEditor) => {
            triggerEditor.update(() => {
              const selection = $getSelection();
              if ($isNodeSelection(selection)) {
                const firstNode = selection.getNodes()[0];
                if (!firstNode) return false;

                const topParent = firstNode.getTopLevelElement();
                if (
                  !topParent ||
                  $isRootNode(topParent) ||
                  topParent.is(firstNode)
                ) {
                  prevSelectionAll = $selectAll();
                } else {
                  $setSelection(
                    topParent.select(0, topParent.getChildrenSize()),
                  );
                  prevSelectionAll = null;
                }
                return true;
              }

              // TODO: tableselection?
              if (!$isRangeSelection(selection)) {
                return false;
              }

              const anchorNode = selection.anchor.getNode();
              const blockNode = anchorNode.getTopLevelElement();
              if (
                !selection.is(prevSelectionAll) &&
                blockNode &&
                !$isBlockFullySelected(blockNode, selection)
              ) {
                prevSelectionAll = null;
                // TODO: tableselection?
                if (blockNode.isEmpty()) {
                  const nodeSelection = $createNodeSelection();
                  nodeSelection.add(blockNode.getKey());
                  $setSelection(nodeSelection);
                } else {
                  $setSelection(
                    blockNode.select(0, blockNode.getChildrenSize()),
                  );
                }
              } else if (!prevSelectionAll) {
                prevSelectionAll = $selectAll();
              }
            });
            return true;
          },
          COMMAND_PRIORITY_LOW,
        );
      }
    });
  },
});
