/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var list = require('@lexical/list');
var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var utils = require('@lexical/utils');
var lexical = require('lexical');
var react = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function CheckListPlugin() {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  react.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(list.INSERT_CHECK_LIST_COMMAND, () => {
      list.insertList(editor, 'check');
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, event => {
      return handleArrownUpOrDown(event, editor, false);
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, event => {
      return handleArrownUpOrDown(event, editor, true);
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ESCAPE_COMMAND, event => {
      const activeItem = getActiveCheckListItem();
      if (activeItem != null) {
        const rootElement = editor.getRootElement();
        if (rootElement != null) {
          rootElement.focus();
        }
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_SPACE_COMMAND, event => {
      const activeItem = getActiveCheckListItem();
      if (activeItem != null && editor.isEditable()) {
        editor.update(() => {
          const listItemNode = lexical.$getNearestNodeFromDOMNode(activeItem);
          if (list.$isListItemNode(listItemNode)) {
            event.preventDefault();
            listItemNode.toggleChecked();
          }
        });
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, event => {
      return editor.getEditorState().read(() => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
          const {
            anchor
          } = selection;
          const isElement = anchor.type === 'element';
          if (isElement || anchor.offset === 0) {
            const anchorNode = anchor.getNode();
            const elementNode = utils.$findMatchingParent(anchorNode, node => lexical.$isElementNode(node) && !node.isInline());
            if (list.$isListItemNode(elementNode)) {
              const parent = elementNode.getParent();
              if (list.$isListNode(parent) && parent.getListType() === 'check' && (isElement || elementNode.getFirstDescendant() === anchorNode)) {
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
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerRootListener((rootElement, prevElement) => {
      if (rootElement !== null) {
        rootElement.addEventListener('click', handleClick);
        rootElement.addEventListener('pointerdown', handlePointerDown);
      }
      if (prevElement !== null) {
        prevElement.removeEventListener('click', handleClick);
        prevElement.removeEventListener('pointerdown', handlePointerDown);
      }
    }));
  });
  return null;
}
function handleCheckItemEvent(event, callback) {
  const target = event.target;
  if (target === null || !utils.isHTMLElement(target)) {
    return;
  }

  // Ignore clicks on LI that have nested lists
  const firstChild = target.firstChild;
  if (firstChild != null && utils.isHTMLElement(firstChild) && (firstChild.tagName === 'UL' || firstChild.tagName === 'OL')) {
    return;
  }
  const parentNode = target.parentNode;

  // @ts-ignore internal field
  if (!parentNode || parentNode.__lexicalListType !== 'check') {
    return;
  }
  const pageX = event.pageX;
  const rect = target.getBoundingClientRect();
  if (target.dir === 'rtl' ? pageX < rect.right && pageX > rect.right - 20 : pageX > rect.left && pageX < rect.left + 20) {
    callback();
  }
}
function handleClick(event) {
  handleCheckItemEvent(event, () => {
    const domNode = event.target;
    const editor = findEditor(domNode);
    if (editor != null && editor.isEditable()) {
      editor.update(() => {
        if (event.target) {
          const node = lexical.$getNearestNodeFromDOMNode(domNode);
          if (list.$isListItemNode(node)) {
            domNode.focus();
            node.toggleChecked();
          }
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
    // @ts-ignore internal field
    if (node.__lexicalEditor) {
      // @ts-ignore internal field
      return node.__lexicalEditor;
    }
    node = node.parentNode;
  }
  return null;
}
function getActiveCheckListItem() {
  const activeElement = document.activeElement;
  return activeElement != null && activeElement.tagName === 'LI' && activeElement.parentNode != null &&
  // @ts-ignore internal field
  activeElement.parentNode.__lexicalListType === 'check' ? activeElement : null;
}
function findCheckListItemSibling(node, backward) {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  let parent = node;

  // Going up in a tree to get non-null sibling
  while (sibling == null && list.$isListItemNode(parent)) {
    // Get li -> parent ul/ol -> parent li
    parent = parent.getParentOrThrow().getParent();
    if (parent != null) {
      sibling = backward ? parent.getPreviousSibling() : parent.getNextSibling();
    }
  }

  // Going down in a tree to get first non-nested list item
  while (list.$isListItemNode(sibling)) {
    const firstChild = backward ? sibling.getLastChild() : sibling.getFirstChild();
    if (!list.$isListNode(firstChild)) {
      return sibling;
    }
    sibling = backward ? firstChild.getLastChild() : firstChild.getFirstChild();
  }
  return null;
}
function handleArrownUpOrDown(event, editor, backward) {
  const activeItem = getActiveCheckListItem();
  if (activeItem != null) {
    editor.update(() => {
      const listItem = lexical.$getNearestNodeFromDOMNode(activeItem);
      if (!list.$isListItemNode(listItem)) {
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

exports.CheckListPlugin = CheckListPlugin;
