/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ListItemNode} from '@lexical/list';
import type {LexicalEditor} from 'lexical';

import {
  $isListItemNode,
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  insertList,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

export default function ListPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INSERT_CHECK_LIST_COMMAND,
        () => {
          insertList(editor, 'check');
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          return handleArrownUpOrDown(event, editor, false);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          return handleArrownUpOrDown(event, editor, true);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
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
      editor.registerCommand(
        KEY_SPACE_COMMAND,
        (event) => {
          const activeItem = getActiveCheckListItem();
          if (activeItem != null) {
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
      editor.registerCommand(
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

                if (
                  $isListItemNode(elementNode) &&
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

            return false;
          });
        },
        COMMAND_PRIORITY_LOW,
      ),
      listenPointerDown(),
    );
  });

  return null;
}

let listenersCount = 0;
function listenPointerDown() {
  if (listenersCount++ === 0) {
    // $FlowFixMe[speculation-ambiguous]
    document.addEventListener('click', handleClick);
    // $FlowFixMe[speculation-ambiguous]
    document.addEventListener('pointerdown', handlePointerDown);
  }

  return () => {
    if (--listenersCount === 0) {
      // $FlowFixMe[speculation-ambiguous]
      document.removeEventListener('click', handleClick);
      // $FlowFixMe[speculation-ambiguous]
      document.removeEventListener('pointerdown', handlePointerDown);
    }
  };
}

function handleCheckItemEvent(event: PointerEvent, callback) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  // Ignore clicks on LI that have nested lists
  // $FlowFixMe
  const firstChild: HTMLElement | null = target.firstChild;
  if (
    firstChild != null &&
    (firstChild.tagName === 'UL' || firstChild.tagName === 'OL')
  ) {
    return;
  }

  const parentNode = target.parentNode;
  // $FlowFixMe[prop-missing] internal field
  if (!parentNode || parentNode.__lexicalListType !== 'check') {
    return;
  }

  const pageX = event.pageX;
  const rect = target.getBoundingClientRect();

  if (
    target.dir === 'rtl'
      ? pageX < rect.right && pageX > rect.right - 20
      : pageX > rect.left && pageX < rect.left + 20
  ) {
    callback();
  }
}

function handleClick(event) {
  handleCheckItemEvent(event, () => {
    const editor = findEditor(event.target);
    if (editor != null) {
      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(event.target);
        if ($isListItemNode(node)) {
          event.target.focus();
          node.toggleChecked();
        }
      });
    }
  });
}

function handlePointerDown(event) {
  handleCheckItemEvent(event, () => {
    // Prevents caret moving when clicking on check mark
    event.preventDefault();
  });
}

function findEditor(target) {
  let node = target;
  while (node) {
    if (node.__lexicalEditor) {
      return (node.__lexicalEditor: LexicalEditor);
    }
    node = node.parentNode;
  }
  return null;
}

function getActiveCheckListItem(): HTMLElement | null {
  const {activeElement} = document;
  return activeElement != null &&
    activeElement.tagName === 'LI' &&
    activeElement.parentNode != null &&
    // $FlowFixMe[prop-missing] internal field
    activeElement.parentNode.__lexicalListType === 'check'
    ? activeElement
    : null;
}

function findCheckListItemSibling(
  node: ListItemNode,
  backward: boolean,
): ListItemNode | null {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  let parent = node;
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

function handleArrownUpOrDown(
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
