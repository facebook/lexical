/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {eventFiles} from '@lexical/rich-text';
import {calculateZoomLevel, isHTMLElement, mergeRegister} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {
  DragEvent as ReactDragEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

import {Point} from './shared/point';
import {Rectangle} from './shared/rect';

const SPACE = 4;
const TARGET_LINE_HALF_HEIGHT = 2;
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';
const TEXT_BOX_HORIZONTAL_PADDING = 28;

const Downward = 1;
const Upward = -1;
const Indeterminate = 0;

export interface ElementInfosHolder {
  element: HTMLElement;
  nodeKey: string;
  depth: number;
}

let prevIndex = Infinity;

function getCurrentIndex(keysLength: number): number {
  if (keysLength === 0) {
    return Infinity;
  }
  if (prevIndex >= 0 && prevIndex < keysLength) {
    return prevIndex;
  }

  return Math.floor(keysLength / 2);
}

function getTopLevelNodeKeys(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => $getRoot().getChildrenKeys());
}

function getCollapsedMargins(elem: HTMLElement): {
  marginTop: number;
  marginBottom: number;
} {
  const getMargin = (
    element: Element | null,
    margin: 'marginTop' | 'marginBottom',
  ): number =>
    element ? parseFloat(window.getComputedStyle(element)[margin]) : 0;

  const {marginTop, marginBottom} = window.getComputedStyle(elem);
  const prevElemSiblingMarginBottom = getMargin(
    elem.previousElementSibling,
    'marginBottom',
  );
  const nextElemSiblingMarginTop = getMargin(
    elem.nextElementSibling,
    'marginTop',
  );
  const collapsedTopMargin = Math.max(
    parseFloat(marginTop),
    prevElemSiblingMarginBottom,
  );
  const collapsedBottomMargin = Math.max(
    parseFloat(marginBottom),
    nextElemSiblingMarginTop,
  );

  return {marginBottom: collapsedBottomMargin, marginTop: collapsedTopMargin};
}

function getBlockElementFromNodes(
  nodeKeys: string[],
  anchorElementRect: DOMRect,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
  depth = 0,
  $getInnerNodes?: (node: LexicalNode, nodeDepth: number) => string[],
): ElementInfosHolder | null {
  let blockElem: HTMLElement | null = null;
  let nodeKey: string | null = null;

  editor.getEditorState().read(() => {
    if (useEdgeAsDefault) {
      const firstLevelNode = nodeKeys[0];
      const lastLevelNode = nodeKeys[nodeKeys.length - 1];

      if (firstLevelNode && lastLevelNode) {
        const [firstNode, lastNode] = [
          editor.getElementByKey(firstLevelNode),
          editor.getElementByKey(lastLevelNode),
        ];

        const [firstNodeRect, lastNodeRect] = [
          firstNode != null ? firstNode.getBoundingClientRect() : undefined,
          lastNode != null ? lastNode.getBoundingClientRect() : undefined,
        ];

        if (firstNodeRect && lastNodeRect) {
          const firstNodeZoom = calculateZoomLevel(firstNode);
          const lastNodeZoom = calculateZoomLevel(lastNode);
          if (event.y / firstNodeZoom < firstNodeRect.top) {
            blockElem = firstNode;
            nodeKey = firstLevelNode;
          } else if (event.y / lastNodeZoom > lastNodeRect.bottom) {
            blockElem = lastNode;
            nodeKey = lastLevelNode;
          }

          if (blockElem) {
            return;
          }
        }
      }
    }

    let index = getCurrentIndex(nodeKeys.length);
    let direction = Indeterminate;

    while (index >= 0 && index < nodeKeys.length) {
      const key = nodeKeys[index];
      if (key === undefined) {
        break;
      }
      const elem = editor.getElementByKey(key);
      if (elem === null) {
        break;
      }
      const zoom = calculateZoomLevel(elem);
      const point = new Point(event.x / zoom, event.y / zoom);
      const domRect = Rectangle.fromDOM(elem);
      const {marginTop, marginBottom} = getCollapsedMargins(elem);
      const rect =
        depth === 0
          ? domRect.generateNewRect({
              bottom: domRect.bottom + marginBottom,
              left: anchorElementRect.left,
              right: anchorElementRect.right,
              top: domRect.top - marginTop,
            })
          : domRect.generateNewRect({
              bottom: domRect.bottom + marginBottom,
              left: domRect.left - 8,
              right: domRect.right + 8,
              top: domRect.top - 2 * marginTop,
            });

      const {
        result,
        reason: {isOnTopSide, isOnBottomSide, isOnLeftSide, isOnRightSide},
      } = rect.contains(point);

      if (result) {
        blockElem = elem;
        nodeKey = key;
        prevIndex = index;
        break;
      }

      if (direction === Indeterminate) {
        if (isOnTopSide || isOnLeftSide) {
          direction = Upward;
        } else if (isOnBottomSide || isOnRightSide) {
          direction = Downward;
        } else {
          // stop search block element
          direction = Infinity;
        }
      }

      index += direction;
    }
  });

  if ($getInnerNodes && nodeKey !== null) {
    let innerNodes: string[] = [];
    editor.read(() => {
      if (nodeKey) {
        const node = $getNodeByKey(nodeKey);
        if (node) {
          innerNodes = $getInnerNodes(node, depth);
        }
      }
    });

    if (innerNodes.length > 0) {
      return (
        getBlockElementFromNodes(
          innerNodes,
          anchorElementRect,
          editor,
          event,
          useEdgeAsDefault,
          depth + 1,
          $getInnerNodes,
        ) ??
        (blockElem
          ? {
              depth,
              element: blockElem,
              nodeKey,
            }
          : null)
      );
    }
  }

  if (blockElem) {
    return {
      depth,
      element: blockElem,
      nodeKey: nodeKey as unknown as string,
    } as ElementInfosHolder;
  }

  return null;
}

function getBlockElement(
  anchorElem: HTMLElement,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
  $getInnerNodes?: (node: LexicalNode, depth: number) => string[],
): ElementInfosHolder | null {
  const anchorElementRect = anchorElem.getBoundingClientRect();
  const topLevelNodeKeys = getTopLevelNodeKeys(editor);

  return getBlockElementFromNodes(
    topLevelNodeKeys,
    anchorElementRect,
    editor,
    event,
    useEdgeAsDefault,
    0,
    $getInnerNodes,
  );
}

function setMenuPosition(
  targetInfos: ElementInfosHolder | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
) {
  if (!targetInfos) {
    floatingElem.style.opacity = '0';
    floatingElem.style.transform = 'translate(-10000px, -10000px)';
    return;
  }

  const targetRect = targetInfos.element.getBoundingClientRect();
  const targetStyle = window.getComputedStyle(targetInfos.element);
  const anchorElementRect = anchorElem.getBoundingClientRect();

  // top left
  let targetCalculateHeight: number = parseInt(targetStyle.lineHeight, 10);
  if (isNaN(targetCalculateHeight)) {
    // middle
    targetCalculateHeight = targetRect.bottom - targetRect.top;
  }
  const top = targetRect.top - anchorElementRect.top;

  const left = targetRect.left - anchorElementRect.left;

  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function setDragImage(
  dataTransfer: DataTransfer,
  draggableBlock: ElementInfosHolder,
) {
  const draggableBlockElem = draggableBlock.element;
  const {transform} = draggableBlockElem.style;

  // Remove dragImage borders
  draggableBlockElem.style.transform = 'translateZ(0)';
  dataTransfer.setDragImage(draggableBlockElem, 0, 0);

  setTimeout(() => {
    draggableBlockElem.style.transform = transform;
  });
}

function setTargetLine(
  targetLineElem: HTMLElement,
  targetBlock: ElementInfosHolder,
  mouseY: number,
  anchorElem: HTMLElement,
) {
  const targetBlockElem = targetBlock.element;
  const {top: targetBlockElemTop, height: targetBlockElemHeight} =
    targetBlockElem.getBoundingClientRect();
  const {top: anchorTop, width: anchorWidth} =
    anchorElem.getBoundingClientRect();
  const {marginTop, marginBottom} = getCollapsedMargins(targetBlockElem);
  let lineTop = targetBlockElemTop;
  if (mouseY >= targetBlockElemTop) {
    lineTop += targetBlockElemHeight + marginBottom / 2;
  } else {
    lineTop -= marginTop / 2;
  }

  const top = lineTop - anchorTop - TARGET_LINE_HALF_HEIGHT;
  const left = TEXT_BOX_HORIZONTAL_PADDING - SPACE;

  targetLineElem.style.transform = `translate(${left}px, ${top}px)`;
  targetLineElem.style.width = `${
    anchorWidth - (TEXT_BOX_HORIZONTAL_PADDING - SPACE) * 2
  }px`;
  targetLineElem.style.opacity = '.4';
}

function hideTargetLine(targetLineElem: HTMLElement | null) {
  if (targetLineElem) {
    targetLineElem.style.opacity = '0';
    targetLineElem.style.transform = 'translate(-10000px, -10000px)';
  }
}

function useDraggableBlockMenu(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  menuRef: React.RefObject<HTMLElement>,
  targetLineRef: React.RefObject<HTMLElement>,
  isEditable: boolean,
  menuComponent: ReactNode,
  targetLineComponent: ReactNode,
  isOnMenu: (element: HTMLElement) => boolean,
  onElementChanged: (element: ElementInfosHolder | null) => void,
  $getInnerNodes?: (node: LexicalNode, depth: number) => string[],
): JSX.Element {
  const scrollerElem = anchorElem.parentElement;

  const isDraggingBlockRef = useRef<boolean>(false);
  const [draggableBlock, setDraggableBlock] =
    useState<ElementInfosHolder | null>(null);

  useEffect(() => {
    onElementChanged(draggableBlock);
  }, [draggableBlock, onElementChanged]);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target;
      if (!isHTMLElement(target)) {
        setDraggableBlock(null);
        return;
      }

      if (isOnMenu(target)) {
        return;
      }

      const _draggableBlockElem = getBlockElement(
        anchorElem,
        editor,
        event,
        false,
        $getInnerNodes,
      );

      setDraggableBlock((prev) => {
        if (!_draggableBlockElem) {
          return null;
        }

        if (!prev) {
          return _draggableBlockElem;
        }

        return prev.element === _draggableBlockElem.element
          ? prev
          : _draggableBlockElem;
      });
    }

    function onMouseLeave() {
      setDraggableBlock(null);
    }

    if (scrollerElem != null) {
      scrollerElem.addEventListener('mousemove', onMouseMove);
      scrollerElem.addEventListener('mouseleave', onMouseLeave);
    }

    return () => {
      if (scrollerElem != null) {
        scrollerElem.removeEventListener('mousemove', onMouseMove);
        scrollerElem.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, [scrollerElem, anchorElem, editor, isOnMenu, $getInnerNodes]);

  useEffect(() => {
    if (menuRef.current) {
      setMenuPosition(draggableBlock, menuRef.current, anchorElem);
    }
  }, [anchorElem, draggableBlock, menuRef]);

  useEffect(() => {
    function onDragover(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const {pageY, target} = event;
      if (!isHTMLElement(target)) {
        return false;
      }
      const targetBlock = getBlockElement(anchorElem, editor, event, true);
      const targetLineElem = targetLineRef.current;
      if (targetBlock === null || targetLineElem === null) {
        return false;
      }
      setTargetLine(
        targetLineElem,
        targetBlock,
        pageY / calculateZoomLevel(target),
        anchorElem,
      );
      // Prevent default event to be able to trigger onDrop events
      event.preventDefault();
      return true;
    }

    function $onDrop(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const {target, dataTransfer, pageY} = event;
      const dragData =
        dataTransfer != null ? dataTransfer.getData(DRAG_DATA_FORMAT) : '';
      const draggedNode = $getNodeByKey(dragData);
      if (!draggedNode) {
        return false;
      }
      if (!isHTMLElement(target)) {
        return false;
      }
      const targetBlock = getBlockElement(anchorElem, editor, event, true);
      if (!targetBlock) {
        return false;
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlock.element);
      if (!targetNode) {
        return false;
      }
      if (targetNode === draggedNode) {
        return true;
      }
      const targetBlockElemTop =
        targetBlock.element.getBoundingClientRect().top;
      if (pageY / calculateZoomLevel(target) >= targetBlockElemTop) {
        targetNode.insertAfter(draggedNode);
      } else {
        targetNode.insertBefore(draggedNode);
      }
      setDraggableBlock(null);

      return true;
    }

    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          return $onDrop(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [anchorElem, editor, targetLineRef, $getInnerNodes]);

  function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer || !draggableBlock) {
      return;
    }
    setDragImage(dataTransfer, draggableBlock);
    let nodeKey = '';
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableBlock.element);
      if (node) {
        nodeKey = node.getKey();
      }
    });
    isDraggingBlockRef.current = true;
    dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
  }

  function onDragEnd(): void {
    isDraggingBlockRef.current = false;
    hideTargetLine(targetLineRef.current);
  }
  return createPortal(
    <>
      <div draggable={true} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {isEditable && menuComponent}
      </div>
      {targetLineComponent}
    </>,
    anchorElem,
  );
}

export function DraggableBlockPlugin_EXPERIMENTAL({
  anchorElem = document.body,
  menuRef,
  targetLineRef,
  menuComponent,
  targetLineComponent,
  isOnMenu,
  onElementChanged,
  $getInnerNodes,
}: {
  anchorElem?: HTMLElement;
  menuRef: React.RefObject<HTMLElement>;
  targetLineRef: React.RefObject<HTMLElement>;
  menuComponent: ReactNode;
  targetLineComponent: ReactNode;
  isOnMenu: (element: HTMLElement) => boolean;
  onElementChanged?: (element: ElementInfosHolder | null) => void;
  $getInnerNodes?: (node: LexicalNode, depth: number) => string[];
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return useDraggableBlockMenu(
    editor,
    anchorElem,
    menuRef,
    targetLineRef,
    editor._editable,
    menuComponent,
    targetLineComponent,
    isOnMenu,
    onElementChanged ?? (() => {}),
    $getInnerNodes,
  );
}
