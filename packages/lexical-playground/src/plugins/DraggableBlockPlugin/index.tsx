/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  LexicalNode,
} from 'lexical';
import {useCallback, useRef, useState} from 'react';

import {$isLayoutContainerNode} from '../../nodes/LayoutContainerNode';
import {$isLayoutItemNode} from '../../nodes/LayoutItemNode';

const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';
const MAX_DRAGGABLEPLUGIN_DEPTH = 1;

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const [draggableElement, setDraggableElement] = useState<HTMLElement | null>(
    null,
  );
  const [draggableElementDepth, setDraggableElementDepth] = useState<number>(0);

  function handleDraggableElementChanged(
    element: HTMLElement | null,
    nodeKey: string,
    depth: number,
  ) {
    setDraggableElementDepth(depth);
    setDraggableElement((prev) => {
      if (prev) {
        prev.classList.remove('draggable-block-highlight');
      }

      if (element) {
        element.classList.add('draggable-block-highlight');
      }

      return element;
    });
  }

  const insertBlock = useCallback(
    (e: React.MouseEvent) => {
      if (!draggableElement || !editor) {
        return;
      }

      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(draggableElement);
        if (!node) {
          return;
        }

        const pNode = $createParagraphNode();
        if (e.altKey || e.ctrlKey) {
          node.insertBefore(pNode);
        } else {
          node.insertAfter(pNode);
        }
        pNode.select();
      });
    },
    [draggableElement, editor],
  );

  const $getInnerNodes = useCallback(
    (node: LexicalNode, depth: number): string[] => {
      if (depth >= MAX_DRAGGABLEPLUGIN_DEPTH) {
        return [];
      }

      if (!$isLayoutContainerNode(node)) {
        return [];
      }

      return node.getChildrenKeys().flatMap((childKey) => {
        const childNode = $getNodeByKey(childKey);
        if ($isLayoutItemNode(childNode)) {
          return childNode.getChildrenKeys();
        }

        return [];
      });
    },
    [],
  );

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div
          ref={menuRef}
          className={`icon draggable-block-menu ${
            draggableElement
              ? `draggable-block-depth-${draggableElementDepth}`
              : ''
          }`}>
          <button
            title="Click to add below&#10;Cmd/Alt+Click to add above"
            className="icon icon-plus"
            onClick={insertBlock}
          />
          {draggableElementDepth === 0 && <div className="icon" />}
        </div>
      }
      targetLineComponent={
        <div ref={targetLineRef} className="draggable-block-target-line" />
      }
      isOnMenu={isOnMenu}
      onElementChanged={handleDraggableElementChanged}
      $getInnerNodes={$getInnerNodes}
    />
  );
}
