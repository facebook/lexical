/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX,type ReactNode, useEffect, useRef} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {eventFiles} from '@lexical/rich-text';
import {calculateZoomLevel, isHTMLElement, mergeRegister} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $onUpdate,
  BLUR_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {createPortal} from 'react-dom';
import {IS_FIREFOX} from 'shared/environment';

import {BLOCK_DRAG_HANDLE_ATTR} from './LexicalBlockDragHandleExtension';

const TARGET_LINE_HALF_HEIGHT = 2;
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';
const TEXT_BOX_HORIZONTAL_PADDING = 28;
const SPACE = 4;

/**
 * Find the block wrapper that owns the drag handle target. Wrappers are emitted
 * by {@link BlockDragHandleExtension} as siblings of the handle button.
 */
function getBlockElementFromHandle(handle: HTMLElement): HTMLElement | null {
  const wrapper = handle.parentElement;
  if (!wrapper) {
    return null;
  }
  // The inner element (the lexical-keyed block DOM) sits next to the handle.
  const inner = wrapper.querySelector<HTMLElement>(
    `:scope > :not([${BLOCK_DRAG_HANDLE_ATTR}])`,
  );
  return inner;
}

/**
 * Walk up from the event target to find the nearest block (via the wrapper).
 */
function getBlockElementFromEventTarget(
  target: EventTarget | null,
): HTMLElement | null {
  if (!isHTMLElement(target)) {
    return null;
  }
  const handle = target.closest<HTMLElement>(`[${BLOCK_DRAG_HANDLE_ATTR}]`);
  if (handle) {
    return getBlockElementFromHandle(handle);
  }
  // For drop/dragover: target is somewhere in/around a block, find the
  // wrapper's inner element via traversal.
  const wrapperChild = target.closest<HTMLElement>(
    '[data-lexical-block-drag-wrapper] > *',
  );
  if (
    wrapperChild &&
    !wrapperChild.hasAttribute(BLOCK_DRAG_HANDLE_ATTR) &&
    wrapperChild.parentElement !== null &&
    wrapperChild.parentElement.hasAttribute('data-lexical-block-drag-wrapper')
  ) {
    return wrapperChild;
  }
  return null;
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
  let lineTop = targetBlockElemTop;
  if (mouseY >= targetBlockElemTop + targetBlockElemHeight / 2) {
    lineTop += targetBlockElemHeight;
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

function setDragImage(
  dataTransfer: DataTransfer,
  draggableBlockElem: HTMLElement,
) {
  const {transform} = draggableBlockElem.style;
  draggableBlockElem.style.transform = 'translateZ(0)';
  dataTransfer.setDragImage(draggableBlockElem, 0, 0);
  setTimeout(() => {
    draggableBlockElem.style.transform = transform;
  });
}

function useDraggableBlockMenu(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  targetLineRef: React.RefObject<HTMLElement | null>,
  isEditable: boolean,
  targetLineComponent: ReactNode,
  onElementChanged?: (element: HTMLElement | null) => void,
): JSX.Element {
  const isDraggingBlockRef = useRef<boolean>(false);
  const onElementChangedRef = useRef(onElementChanged);
  onElementChangedRef.current = onElementChanged;

  // Wrapper hover → onElementChanged signal. Use event delegation on the
  // editor root rather than per-wrapper listeners so dynamic block changes
  // are handled automatically.
  useEffect(() => {
    return editor.registerRootListener(rootElement => {
      if (!rootElement) {
        return;
      }
      let currentBlockElem: HTMLElement | null = null;
      function notify(elem: HTMLElement | null) {
        if (elem !== currentBlockElem) {
          currentBlockElem = elem;
          const cb = onElementChangedRef.current;
          if (cb) {
            cb(elem);
          }
        }
      }
      function onMouseOver(event: MouseEvent) {
        notify(getBlockElementFromEventTarget(event.target));
      }
      function onMouseLeave() {
        notify(null);
      }
      rootElement.addEventListener('mouseover', onMouseOver);
      rootElement.addEventListener('mouseleave', onMouseLeave);
      return () => {
        rootElement.removeEventListener('mouseover', onMouseOver);
        rootElement.removeEventListener('mouseleave', onMouseLeave);
      };
    });
  }, [editor]);

  // dragstart on drag handles (event delegation). Sets the drag payload to
  // the nearest lexical node key for the block.
  useEffect(() => {
    return editor.registerRootListener(rootElement => {
      if (!rootElement) {
        return;
      }
      function onDragStart(event: DragEvent) {
        const target = event.target;
        if (
          !isHTMLElement(target) ||
          !target.matches(`[${BLOCK_DRAG_HANDLE_ATTR}]`)
        ) {
          return;
        }
        const blockElem = getBlockElementFromHandle(target);
        if (!blockElem || !event.dataTransfer) {
          return;
        }
        let nodeKey = '';
        editor.read(() => {
          const node = $getNearestNodeFromDOMNode(blockElem);
          if (node) {
            nodeKey = node.getKey();
          }
        });
        if (!nodeKey) {
          return;
        }
        setDragImage(event.dataTransfer, blockElem);
        event.dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
        isDraggingBlockRef.current = true;

        if (IS_FIREFOX && document.activeElement !== rootElement) {
          // Firefox: restore focus synchronously so caret stays visible.
          rootElement!.focus({preventScroll: true});
          editor.update(() => {
            const selection = $getSelection();
            if (selection !== null && !selection.dirty) {
              selection.dirty = true;
            }
          });
        }
      }
      function onDragEnd() {
        isDraggingBlockRef.current = false;
        hideTargetLine(targetLineRef.current);
        if (IS_FIREFOX) {
          editor.focus();
        }
      }
      rootElement.addEventListener('dragstart', onDragStart);
      rootElement.addEventListener('dragend', onDragEnd);
      return () => {
        rootElement.removeEventListener('dragstart', onDragStart);
        rootElement.removeEventListener('dragend', onDragEnd);
      };
    });
  }, [editor, targetLineRef]);

  // DRAGOVER for target line + DROP for the reorder. Mirrors the previous
  // command-based wiring; block detection now traverses block wrappers.
  useEffect(() => {
    function onDragover(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const targetBlockElem = getBlockElementFromEventTarget(event.target);
      const targetLineElem = targetLineRef.current;
      if (targetBlockElem === null || targetLineElem === null) {
        return false;
      }
      setTargetLine(
        targetLineElem,
        targetBlockElem,
        event.pageY /
          calculateZoomLevel(
            isHTMLElement(event.target) ? event.target : anchorElem,
          ),
        anchorElem,
      );
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
      const targetBlockElem = getBlockElementFromEventTarget(target);
      if (!targetBlockElem) {
        return false;
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode) {
        return false;
      }
      if (targetNode === draggedNode) {
        if (IS_FIREFOX) {
          editor.focus();
        }
        return true;
      }
      const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
      const targetBlockElemHeight =
        targetBlockElem.getBoundingClientRect().height;
      const zoom = calculateZoomLevel(
        isHTMLElement(target) ? target : anchorElem,
      );
      if (pageY / zoom >= targetBlockElemTop + targetBlockElemHeight / 2) {
        targetNode.insertAfter(draggedNode);
      } else {
        targetNode.insertBefore(draggedNode);
      }
      hideTargetLine(targetLineRef.current);

      if (IS_FIREFOX) {
        $onUpdate(() => {
          editor.focus();
        });
      }
      return true;
    }

    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        event => onDragover(event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        event => $onDrop(event),
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, anchorElem, targetLineRef]);

  // Firefox blur fix — handle is contenteditable=false, but Firefox still
  // fires blur on the root when focusing the handle button. Restore focus.
  useEffect(() => {
    if (!IS_FIREFOX || !isEditable) {
      return;
    }
    return mergeRegister(
      editor.registerRootListener(rootElement => {
        if (!rootElement) {
          return;
        }
        function onBlur(event: FocusEvent) {
          const relatedTarget = event.relatedTarget;
          if (
            isHTMLElement(relatedTarget) &&
            relatedTarget.matches(`[${BLOCK_DRAG_HANDLE_ATTR}]`)
          ) {
            if (rootElement) {
              rootElement.focus({preventScroll: true});
              editor.update(() => {
                const selection = $getSelection();
                if (selection !== null && !selection.dirty) {
                  selection.dirty = true;
                }
              });
            }
            event.stopImmediatePropagation();
          }
        }
        rootElement.addEventListener('blur', onBlur, true);
        return () => rootElement.removeEventListener('blur', onBlur, true);
      }),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          const rootElement = editor.getRootElement();
          const activeElement = document.activeElement;
          if (
            rootElement &&
            isHTMLElement(activeElement) &&
            activeElement.matches(`[${BLOCK_DRAG_HANDLE_ATTR}]`)
          ) {
            rootElement.focus({preventScroll: true});
            editor.update(() => {
              const selection = $getSelection();
              if (selection !== null && !selection.dirty) {
                selection.dirty = true;
              }
            });
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, isEditable]);

  return createPortal(targetLineComponent, anchorElem);
}

/**
 * Renders the drop-target indicator and wires drag-and-drop reorder for block
 * ElementNodes whose DOM has been wrapped by
 * {@link BlockDragHandleExtension}. The drag handle itself is rendered by the
 * extension as a sibling of each block's content element.
 *
 * Callers handle hover-related UI (e.g. an "add block" picker positioned next
 * to the hovered block) through `onElementChanged`, which reports the block
 * element currently under the pointer.
 *
 * @experimental
 */
export function DraggableBlockPlugin_EXPERIMENTAL({
  anchorElem = document.body,
  targetLineRef,
  targetLineComponent,
  onElementChanged,
}: {
  anchorElem?: HTMLElement;
  targetLineRef: React.RefObject<HTMLElement | null>;
  targetLineComponent: ReactNode;
  onElementChanged?: (element: HTMLElement | null) => void;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return useDraggableBlockMenu(
    editor,
    anchorElem,
    targetLineRef,
    editor._editable,
    targetLineComponent,
    onElementChanged,
  );
}
