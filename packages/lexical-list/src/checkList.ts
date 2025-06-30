/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ListItemNode} from './LexicalListItemNode';
import type {LexicalCommand, LexicalEditor} from 'lexical';

import {
  $findMatchingParent,
  calculateZoomLevel,
  isHTMLElement,
  mergeRegister,
} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  getNearestEditorFromDOMNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
} from 'lexical';

import {$insertList} from './formatList';
import {$isListItemNode} from './LexicalListItemNode';
import {$isListNode} from './LexicalListNode';

export const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_CHECK_LIST_COMMAND',
);

export function registerCheckList(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      INSERT_CHECK_LIST_COMMAND,
      () => {
        $insertList('check');
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        return handleArrowUpOrDown(event, editor, false);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        return handleArrowUpOrDown(event, editor, true);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ESCAPE_COMMAND,
      () => {
        const activeItem = getActiveCheckListItem();

        if (activeItem != null) {
          const rootElement = editor.getRootElement();

          if (rootElement != null) {
            rootElement.focus();
          }

          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_SPACE_COMMAND,
      (event) => {
        const activeItem = getActiveCheckListItem();

        if (activeItem != null && editor.isEditable()) {
          editor.update(() => {
            const listItemNode = $getNearestNodeFromDOMNode(activeItem);

            if ($isListItemNode(listItemNode)) {
              event.preventDefault();
              listItemNode.toggleChecked();
            }
          });
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_LEFT_COMMAND,
      (event) => {
        return editor.getEditorState().read(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const {anchor} = selection;
            const isElement = anchor.type === 'element';

            if (isElement || anchor.offset === 0) {
              const anchorNode = anchor.getNode();
              const elementNode = $findMatchingParent(
                anchorNode,
                (node) => $isElementNode(node) && !node.isInline(),
              );
              if ($isListItemNode(elementNode)) {
                const parent = elementNode.getParent();
                if (
                  $isListNode(parent) &&
                  parent.getListType() === 'check' &&
                  (isElement || elementNode.getFirstDescendant() === anchorNode)
                ) {
                  const domNode = editor.getElementByKey(elementNode.__key);

                  if (domNode != null && document.activeElement !== domNode) {
                    domNode.focus();
                    event.preventDefault();
                    return true;
                  }
                }
              }
            }
          }

          return false;
        });
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerRootListener((rootElement, prevElement) => {
      if (rootElement !== null) {
        rootElement.addEventListener('click', handleClick);
        rootElement.addEventListener('pointerdown', handlePointerDown);
      }

      if (prevElement !== null) {
        prevElement.removeEventListener('click', handleClick);
        prevElement.removeEventListener('pointerdown', handlePointerDown);
      }
    }),
  );
}

function handleCheckItemEvent(event: PointerEvent, callback: () => void) {
  const target = event.target;

  if (!isHTMLElement(target)) {
    return;
  }

  // Ignore clicks on LI that have nested lists
  const firstChild = target.firstChild;

  if (
    isHTMLElement(firstChild) &&
    (firstChild.tagName === 'UL' || firstChild.tagName === 'OL')
  ) {
    return;
  }

  const parentNode = target.parentNode;

  // @ts-ignore internal field
  if (!parentNode || parentNode.__lexicalListType !== 'check') {
    return;
  }

  const rect = target.getBoundingClientRect();
  const zoom = calculateZoomLevel(target);
  const clientX = (event as MouseEvent | PointerEvent).clientX / zoom;

  // Use getComputedStyle if available, otherwise fallback to 0px width
  const beforeStyles = window.getComputedStyle
    ? window.getComputedStyle(target, '::before')
    : ({width: '0px'} as CSSStyleDeclaration);
  const beforeWidthInPixels = parseFloat(beforeStyles.width);

  // Make click area slightly larger for touch devices to improve accessibility
  const isTouchEvent = event.pointerType === 'touch';
  const clickAreaPadding = isTouchEvent ? 32 : 0; // Add 32px padding for touch events

  if (
    target.dir === 'rtl'
      ? clientX < rect.right + clickAreaPadding &&
        clientX > rect.right - beforeWidthInPixels - clickAreaPadding
      : clientX > rect.left - clickAreaPadding &&
        clientX < rect.left + beforeWidthInPixels + clickAreaPadding
  ) {
    callback();
  }
}

function handleClick(event: Event) {
  handleCheckItemEvent(event as PointerEvent, () => {
    if (isHTMLElement(event.target)) {
      const domNode = event.target;
      const editor = getNearestEditorFromDOMNode(domNode);

      if (editor != null && editor.isEditable()) {
        editor.update(() => {
          const node = $getNearestNodeFromDOMNode(domNode);

          if ($isListItemNode(node)) {
            domNode.focus();
            node.toggleChecked();
          }
        });
      }
    }
  });
}

function handlePointerDown(event: PointerEvent) {
  handleCheckItemEvent(event, () => {
    // Prevents caret moving when clicking on check mark
    event.preventDefault();
  });
}

function getActiveCheckListItem(): HTMLElement | null {
  const activeElement = document.activeElement;

  return isHTMLElement(activeElement) &&
    activeElement.tagName === 'LI' &&
    activeElement.parentNode != null &&
    // @ts-ignore internal field
    activeElement.parentNode.__lexicalListType === 'check'
    ? activeElement
    : null;
}

function findCheckListItemSibling(
  node: ListItemNode,
  backward: boolean,
): ListItemNode | null {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  let parent: ListItemNode | null = node;

  // Going up in a tree to get non-null sibling
  while (sibling == null && $isListItemNode(parent)) {
    // Get li -> parent ul/ol -> parent li
    parent = parent.getParentOrThrow().getParent();

    if (parent != null) {
      sibling = backward
        ? parent.getPreviousSibling()
        : parent.getNextSibling();
    }
  }

  // Going down in a tree to get first non-nested list item
  while ($isListItemNode(sibling)) {
    const firstChild = backward
      ? sibling.getLastChild()
      : sibling.getFirstChild();

    if (!$isListNode(firstChild)) {
      return sibling;
    }

    sibling = backward ? firstChild.getLastChild() : firstChild.getFirstChild();
  }

  return null;
}

function handleArrowUpOrDown(
  event: KeyboardEvent,
  editor: LexicalEditor,
  backward: boolean,
) {
  const activeItem = getActiveCheckListItem();

  if (activeItem != null) {
    editor.update(() => {
      const listItem = $getNearestNodeFromDOMNode(activeItem);

      if (!$isListItemNode(listItem)) {
        return;
      }

      const nextListItem = findCheckListItemSibling(listItem, backward);

      if (nextListItem != null) {
        nextListItem.selectStart();
        const dom = editor.getElementByKey(nextListItem.__key);

        if (dom != null) {
          event.preventDefault();
          setTimeout(() => {
            dom.focus();
          }, 0);
        }
      }
    });
  }

  return false;
}
