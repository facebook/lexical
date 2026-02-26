/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import {$createListNode, $isListItemNode, $isListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {eventFiles} from '@lexical/rich-text';
import {calculateZoomLevel, isHTMLElement, mergeRegister} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $onUpdate,
  BLUR_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
} from 'lexical';
import {
  DragEvent as ReactDragEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';
import {IS_FIREFOX} from 'shared/environment';

import {Point} from './shared/point';
import {Rectangle} from './shared/rect';

const SPACE = 4;
const TARGET_LINE_HALF_HEIGHT = 2;
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';
const TEXT_BOX_HORIZONTAL_PADDING = 28;

const Downward = 1;
const Upward = -1;
const Indeterminate = 0;

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

function getNestedDraggableBlock(
  elem: HTMLElement,
  point: Point,
  anchorElementRect: DOMRect,
): HTMLElement | null {
  if (elem.tagName === 'UL' || elem.tagName === 'OL') {
    const children = Array.from(elem.children);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child instanceof HTMLElement) {
        const domRect = Rectangle.fromDOM(child);
        const {marginTop, marginBottom} = getCollapsedMargins(child);

        // Expand the child's hit area horizontally to match the editor's full width.
        // This ensures the drag handle doesn't vanish when the mouse moves left to grab it!
        const childRect = domRect.generateNewRect({
          bottom: domRect.bottom + marginBottom,
          left: anchorElementRect.left,
          right: anchorElementRect.right,
          top: domRect.top - marginTop,
        });
        if (childRect.contains(point).result) {
          const nestedChildren = Array.from(child.children);
          for (let j = 0; j < nestedChildren.length; j++) {
            const nestedChild = nestedChildren[j];
            if (
              nestedChild instanceof HTMLElement &&
              (nestedChild.tagName === 'UL' || nestedChild.tagName === 'OL')
            ) {
              const deeplyNestedBlock = getNestedDraggableBlock(
                nestedChild,
                point,
                anchorElementRect,
              );
              if (deeplyNestedBlock !== null) {
                return deeplyNestedBlock;
              }
            }
          }
          return child;
        }
      }
    }
  }
  return null;
}

function getBlockElement(
  anchorElem: HTMLElement,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
  draggedNodeKey: string | null = null,
): HTMLElement | null {
  const anchorElementRect = anchorElem.getBoundingClientRect();
  const topLevelNodeKeys = getTopLevelNodeKeys(editor);

  let blockElem: HTMLElement | null = null;

  editor.getEditorState().read(() => {
    if (useEdgeAsDefault) {
      const [firstNode, lastNode] = [
        editor.getElementByKey(topLevelNodeKeys[0]),
        editor.getElementByKey(topLevelNodeKeys[topLevelNodeKeys.length - 1]),
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
        } else if (event.y / lastNodeZoom > lastNodeRect.bottom) {
          blockElem = lastNode;
        }

        if (blockElem) {
          return;
        }
      }
    }

    let index = getCurrentIndex(topLevelNodeKeys.length);
    let direction = Indeterminate;

    while (index >= 0 && index < topLevelNodeKeys.length) {
      const key = topLevelNodeKeys[index];
      const elem = editor.getElementByKey(key);
      if (elem === null) {
        break;
      }
      const zoom = calculateZoomLevel(elem);
      const point = new Point(event.x / zoom, event.y / zoom);
      const domRect = Rectangle.fromDOM(elem);
      const {marginTop, marginBottom} = getCollapsedMargins(elem);
      const rect = domRect.generateNewRect({
        bottom: domRect.bottom + marginBottom,
        left: anchorElementRect.left,
        right: anchorElementRect.right,
        top: domRect.top - marginTop,
      });

      const {
        result,
        reason: {isOnTopSide, isOnBottomSide},
      } = rect.contains(point);

      if (result) {
        let isDraggingListItem = false;
        if (draggedNodeKey !== null) {
          const draggedNode = $getNodeByKey(draggedNodeKey);
          isDraggingListItem = $isListItemNode(draggedNode);
        }

        if (draggedNodeKey == null || isDraggingListItem) {
          const nestedBlock = getNestedDraggableBlock(
            elem,
            point,
            anchorElementRect,
          );
          blockElem = nestedBlock || elem;
        } else {
          blockElem = elem;
        }
        prevIndex = index;
        break;
      }

      if (direction === Indeterminate) {
        if (isOnTopSide) {
          direction = Upward;
        } else if (isOnBottomSide) {
          direction = Downward;
        } else {
          // stop search block element
          direction = Infinity;
        }
      }

      index += direction;
    }
  });

  return blockElem;
}

function setMenuPosition(
  targetElem: HTMLElement | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  zoomLevel: number,
) {
  if (!targetElem) {
    floatingElem.style.display = 'none';
    return;
  }

  const targetRect = targetElem.getBoundingClientRect();
  const targetStyle = window.getComputedStyle(targetElem);
  const floatingElemRect = floatingElem.getBoundingClientRect();
  const anchorElementRect = anchorElem.getBoundingClientRect();

  // top left
  let targetCalculateHeight: number = parseInt(targetStyle.lineHeight, 10);
  if (isNaN(targetCalculateHeight)) {
    // middle
    targetCalculateHeight = targetRect.bottom - targetRect.top;
  }
  const top =
    (targetRect.top +
      (targetCalculateHeight -
        (floatingElemRect.height || targetCalculateHeight)) /
        2 -
      anchorElementRect.top +
      anchorElem.scrollTop) /
    zoomLevel;

  const left = SPACE;

  floatingElem.style.display = 'flex';
  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function setDragImage(
  dataTransfer: DataTransfer,
  draggableBlockElem: HTMLElement,
) {
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
  targetBlockElem: HTMLElement,
  mouseY: number,
  anchorElem: HTMLElement,
) {
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

  const top =
    lineTop - anchorTop - TARGET_LINE_HALF_HEIGHT + anchorElem.scrollTop;
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
  menuRef: React.RefObject<HTMLElement | null>,
  targetLineRef: React.RefObject<HTMLElement | null>,
  isEditable: boolean,
  menuComponent: ReactNode,
  targetLineComponent: ReactNode,
  isOnMenu: (element: HTMLElement) => boolean,
  onElementChanged?: (element: HTMLElement | null) => void,
): JSX.Element {
  const scrollerElem = anchorElem.parentElement;

  const isDraggingBlockRef = useRef<boolean>(false);
  const [draggableBlockElem, setDraggableBlockElemState] =
    useState<HTMLElement | null>(null);
  const draggedNodeKeyRef = useRef<string | null>(null);

  const setDraggableBlockElem = useCallback(
    (elem: HTMLElement | null) => {
      setDraggableBlockElemState(elem);
      if (onElementChanged) {
        onElementChanged(elem);
      }
    },
    [onElementChanged],
  );

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target;
      if (!isHTMLElement(target)) {
        setDraggableBlockElem(null);
        return;
      }

      if (isOnMenu(target)) {
        return;
      }

      const _draggableBlockElem = getBlockElement(anchorElem, editor, event);

      setDraggableBlockElem(_draggableBlockElem);
    }

    function onMouseLeave() {
      setDraggableBlockElem(null);
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
  }, [scrollerElem, anchorElem, editor, isOnMenu, setDraggableBlockElem]);

  useEffect(() => {
    const zoomLevel = calculateZoomLevel(
      document.getElementsByClassName('ContentEditable__root')[0],
      true,
    );
    if (menuRef.current) {
      setMenuPosition(
        draggableBlockElem,
        menuRef.current,
        anchorElem,
        zoomLevel,
      );
    }
  }, [anchorElem, draggableBlockElem, menuRef]);

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
      const targetBlockElem = getBlockElement(
        anchorElem,
        editor,
        event,
        true,
        draggedNodeKeyRef.current,
      );
      const targetLineElem = targetLineRef.current;
      if (targetBlockElem === null || targetLineElem === null) {
        return false;
      }
      setTargetLine(
        targetLineElem,
        targetBlockElem,
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
      const targetBlockElem = getBlockElement(
        anchorElem,
        editor,
        event,
        true,
        draggedNodeKeyRef.current,
      );
      if (!targetBlockElem) {
        return false;
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode) {
        return false;
      }
      if (targetNode === draggedNode) {
        // Firefox-specific fix: Even when no move occurs, restore focus to ensure cursor visibility
        if (IS_FIREFOX) {
          editor.focus();
        }
        return true;
      }
      const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
      const isInsertAfter =
        pageY / calculateZoomLevel(target) >= targetBlockElemTop;

      let insertTarget = targetNode;
      let nodeToInsert = draggedNode;

      //  Dragging a non-list-item (like a Paragraph) onto a list-item.
      // We must elevate the target to the parent List so we don't put a <p> inside a <ul>.
      if (!$isListItemNode(draggedNode) && $isListItemNode(targetNode)) {
        insertTarget = targetNode.getParentOrThrow();
      }

      //  Dragging a list-item out of a list and dropping it onto a non-list-item.
      // We must wrap the item in a brand new List so it isn't orphaned.
      if ($isListItemNode(draggedNode) && !$isListItemNode(targetNode)) {
        const parentList = draggedNode.getParent();
        // Match the original list type (bullet, number, etc.)
        const listType = $isListNode(parentList)
          ? parentList.getListType()
          : 'bullet';

        const newList = $createListNode(listType);
        newList.append(draggedNode);
        nodeToInsert = newList;
      }

      if (isInsertAfter) {
        insertTarget.insertAfter(nodeToInsert);
      } else {
        insertTarget.insertBefore(nodeToInsert);
      }
      setDraggableBlockElem(null);

      // Firefox-specific fix: Use editor.focus() after drop to properly restore
      // both focus and selection. This ensures cursor visibility immediately.
      if (IS_FIREFOX) {
        // Using $onUpdate ensures this happens after the current update cycle finishes
        $onUpdate(() => {
          editor.focus();
        });
      }

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
  }, [anchorElem, editor, targetLineRef, setDraggableBlockElem]);

  // Firefox-specific: Prevent blur when clicking on drag handle to maintain cursor visibility.
  // Firefox fires blur before dragstart, causing focus loss. We detect this by checking if
  // the blur's relatedTarget is on the menu using isOnMenu, then restore focus synchronously.
  useEffect(() => {
    if (!IS_FIREFOX || !isEditable) {
      return;
    }

    return mergeRegister(
      editor.registerRootListener((rootElement, prevRootElement) => {
        function onBlur(event: FocusEvent) {
          const relatedTarget = event.relatedTarget;
          if (
            relatedTarget &&
            relatedTarget instanceof HTMLElement &&
            isOnMenu(relatedTarget)
          ) {
            // Blur is caused by clicking on drag handle - restore focus immediately
            // to prevent cursor from disappearing. This must be synchronous to work.
            if (rootElement) {
              rootElement.focus({preventScroll: true});
              // Force selection update to ensure cursor is visible
              editor.update(() => {
                const selection = $getSelection();
                if (selection !== null && !selection.dirty) {
                  selection.dirty = true;
                }
              });
            }
            // Prevent the event from propagating to LexicalEvents handler
            event.stopImmediatePropagation();
          }
        }

        if (rootElement) {
          rootElement.addEventListener('blur', onBlur, true);
        }

        if (prevRootElement) {
          prevRootElement.removeEventListener('blur', onBlur, true);
        }
      }),
      // Intercept BLUR_COMMAND if focus is on the menu (fallback in case event propagation wasn't stopped)
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          const rootElement = editor.getRootElement();
          const activeElement = document.activeElement;
          if (
            rootElement &&
            activeElement &&
            activeElement instanceof HTMLElement &&
            isOnMenu(activeElement)
          ) {
            // Focus is on menu - restore to root and prevent blur command
            rootElement.focus({preventScroll: true});
            editor.update(() => {
              const selection = $getSelection();
              if (selection !== null && !selection.dirty) {
                selection.dirty = true;
              }
            });
            return true; // Prevent command from propagating
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, isEditable, isOnMenu]);

  function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer || !draggableBlockElem) {
      return;
    }

    setDragImage(dataTransfer, draggableBlockElem);
    let nodeKey = '';
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableBlockElem);
      if (node) {
        nodeKey = node.getKey();
      }
    });
    isDraggingBlockRef.current = true;
    draggedNodeKeyRef.current = nodeKey;
    dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);

    // Firefox-specific: Restore focus synchronously after drag starts to prevent cursor loss.
    // The blur handler should have already restored focus, but we do it here as a fallback
    // and to ensure selection is properly maintained during drag.
    if (IS_FIREFOX) {
      const rootElement = editor.getRootElement();
      if (rootElement !== null && document.activeElement !== rootElement) {
        // Restore focus synchronously - don't use requestAnimationFrame as blur already happened
        // and we need immediate focus restoration to maintain cursor visibility
        rootElement.focus({preventScroll: true});
        // Force selection update to ensure cursor is visible
        editor.update(() => {
          const selection = $getSelection();
          if (selection !== null && !selection.dirty) {
            selection.dirty = true;
          }
        });
      }
    }
  }

  function onDragEnd(): void {
    isDraggingBlockRef.current = false;
    draggedNodeKeyRef.current = null;
    hideTargetLine(targetLineRef.current);

    // Firefox-specific fix: Use editor.focus() to properly restore both focus and
    // selection after drag ends. This ensures cursor visibility immediately.
    if (IS_FIREFOX) {
      // editor.focus() handles both focus restoration and selection update properly
      editor.focus();
    }
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
}: {
  anchorElem?: HTMLElement;
  menuRef: React.RefObject<HTMLElement | null>;
  targetLineRef: React.RefObject<HTMLElement | null>;
  menuComponent: ReactNode;
  targetLineComponent: ReactNode;
  isOnMenu: (element: HTMLElement) => boolean;
  onElementChanged?: (element: HTMLElement | null) => void;
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
    onElementChanged,
  );
}
