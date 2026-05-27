/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
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
  LexicalNode,
  RangeSelection,
  safeCast,
  SELECT_ALL_COMMAND,
} from 'lexical';

import {PreventSelectAllExtension} from '.';
import {namedSignals} from './namedSignals';
import {effect} from './signals';

const getEndOffset = (node: LexicalNode): number =>
  $isTextNode(node)
    ? node.getTextContentSize()
    : $isElementNode(node)
      ? node.getChildrenSize()
      : 0;

function $isBlockFullySelected(
  blockNode: ElementNode,
  selection: RangeSelection,
): boolean {
  const firstDesc = blockNode.getFirstDescendant();
  const lastDesc = blockNode.getLastDescendant();

  if (!firstDesc || !lastDesc) return false;
  // type narrowing
  const first = firstDesc;
  const last = lastDesc;

  function isAtStart(node: LexicalNode, offset: number): boolean {
    if (node.is(first) && offset === 0) return true;
    // anchor/focus on top-level before first child decorator
    if ($isElementNode(node) && node.isParentOf(first)) {
      return offset === 0;
    }
    return false;
  }

  function isAtEnd(node: LexicalNode, offset: number): boolean {
    if (node.is(last) && offset === getEndOffset(last)) return true;
    // anchor/focus on top-level after last child decorator
    if ($isElementNode(node) && node.isParentOf(last)) {
      return offset === node.getChildrenSize();
    }
    return false;
  }

  const [startPoint, endPoint] = selection.getStartEndPoints();

  return (
    isAtStart(startPoint.getNode(), startPoint.offset) &&
    isAtEnd(endPoint.getNode(), endPoint.offset)
  );
}

export interface SelectBlockConfig {
  disabled: boolean;
}

function $hasCommonTopParent(
  nodes: LexicalNode[],
  commonTopParent: LexicalNode,
) {
  return nodes.every(node => {
    const topParent = node.getTopLevelElement();
    return topParent && topParent.is(commonTopParent);
  });
}

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
                const selectedNodes = selection.getNodes();
                const firstNode = selectedNodes[0];

                const topParent = firstNode.getTopLevelElement();
                if (
                  !topParent ||
                  $isRootNode(topParent) ||
                  topParent.is(firstNode) ||
                  // if multiple nodes are selected and they do not share a common ancestor
                  (selectedNodes.length > 1 &&
                    !$hasCommonTopParent(selectedNodes, topParent))
                ) {
                  prevSelectionAll = $selectAll();
                  // This is type narrowing.
                  // If firstNode is a decorator, then it is equal to topParent
                } else if ($isElementNode(topParent)) {
                  $setSelection(
                    topParent.select(0, topParent.getChildrenSize()),
                  );
                  prevSelectionAll = null;
                }
                return true;
              }

              if (!$isRangeSelection(selection)) {
                return false;
              }

              const anchorNode = selection.anchor.getNode();
              const blockNode = anchorNode.getTopLevelElement();
              if (
                !selection.is(prevSelectionAll) &&
                blockNode &&
                !blockNode.isEmpty() &&
                !$isBlockFullySelected(blockNode, selection)
              ) {
                prevSelectionAll = null;
                $setSelection(blockNode.select(0, blockNode.getChildrenSize()));
              } else if (
                (blockNode && blockNode.isEmpty()) ||
                // don't trigger selectAll if it's already set
                !prevSelectionAll
              ) {
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
