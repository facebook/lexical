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
  $addUpdateTag,
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
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
} from 'lexical';

import {$insertList} from './formatList';
import {$isListItemNode} from './LexicalListItemNode';
import {$isListNode} from './LexicalListNode';

export const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_CHECK_LIST_COMMAND',
);

/**
 * Registers the checklist plugin with the editor.
 * @param editor The LexicalEditor instance.
 * @param options Optional configuration.
 *   - disableTakeFocusOnClick: If true, clicking a checklist item will not focus the editor (useful for mobile).
 */
export function registerCheckList(
  editor: LexicalEditor,
  options?: {disableTakeFocusOnClick?: boolean},
) {
  const disableTakeFocusOnClick =
    (options && options.disableTakeFocusOnClick) || false;

  const configHandleClick = (event: MouseEvent | TouchEvent) => {
    handleClick(event, disableTakeFocusOnClick);
  };
  const configHandleSelectDefaults = (event: MouseEvent | TouchEvent) => {
    handleSelectDefaults(event, disableTakeFocusOnClick);
  };
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
        rootElement.addEventListener('click', configHandleClick);
        // Use capture so we run before other listeners that might move focus.
        rootElement.addEventListener(
          'pointerdown',
          configHandleSelectDefaults,
          {
            capture: true,
          },
        );
        // Some browsers / integrations still generate mousedown events; handle them too.
        rootElement.addEventListener('mousedown', configHandleSelectDefaults, {
          capture: true,
        });
        // Intercept touchstart to stop the mobile browser from placing the caret
        // and opening the keyboard when tapping the checklist marker.
        rootElement.addEventListener('touchstart', configHandleSelectDefaults, {
          capture: true,
          passive: false,
        });
      }

      if (prevElement !== null) {
        prevElement.removeEventListener('click', configHandleClick);
        prevElement.removeEventListener(
          'pointerdown',
          configHandleSelectDefaults,
          {
            capture: true,
          },
        );
        prevElement.removeEventListener(
          'mousedown',
          configHandleSelectDefaults,
          {
            capture: true,
          },
        );
        prevElement.removeEventListener(
          'touchstart',
          configHandleSelectDefaults,
          {
            capture: true,
          },
        );
      }
    }),
  );
}

function handleCheckItemEvent(
  event: MouseEvent | TouchEvent,
  callback: () => void,
) {
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
  let clientX: number | null = null;
  let pointerType: string | null = null;

  if ('clientX' in event) {
    clientX = event.clientX;
  } else if ('touches' in event) {
    const touches = event.touches;
    if (touches.length > 0) {
      clientX = touches[0].clientX;
      pointerType = 'touch';
    }
  }

  // If we couldn't resolve a clientX (unexpected input), bail out.
  if (clientX == null) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const zoom = calculateZoomLevel(target);
  const clientXInPixels = clientX / zoom;

  // Use getComputedStyle if available, otherwise fallback to 0px width
  const beforeStyles = window.getComputedStyle
    ? window.getComputedStyle(target, '::before')
    : ({width: '0px'} as CSSStyleDeclaration);
  const beforeWidthInPixels = parseFloat(beforeStyles.width);

  // Make click area slightly larger for touch devices to improve accessibility
  // Determine whether this is a touch event; some environments may supply
  // pointerType on PointerEvent while touch events use the `touches` API above.
  const isTouchEvent =
    pointerType === 'touch' || (event as PointerEvent).pointerType === 'touch';
  const clickAreaPadding = isTouchEvent ? 32 : 0; // Add 32px padding for touch events

  if (
    target.dir === 'rtl'
      ? clientXInPixels < rect.right + clickAreaPadding &&
        clientXInPixels > rect.right - beforeWidthInPixels - clickAreaPadding
      : clientXInPixels > rect.left - clickAreaPadding &&
        clientXInPixels < rect.left + beforeWidthInPixels + clickAreaPadding
  ) {
    callback();
  }
}

function handleClick(
  event: MouseEvent | TouchEvent,
  disableFocusOnClick: boolean,
) {
  handleCheckItemEvent(event, () => {
    if (isHTMLElement(event.target)) {
      const domNode = event.target;
      const editor = getNearestEditorFromDOMNode(domNode);

      if (editor != null && editor.isEditable()) {
        editor.update(() => {
          const node = $getNearestNodeFromDOMNode(domNode);

          if ($isListItemNode(node)) {
            if (disableFocusOnClick) {
              $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
              $addUpdateTag(SKIP_DOM_SELECTION_TAG);
            } else {
              domNode.focus();
            }
            node.toggleChecked();
          }
        });
      }
    }
  });
}

/**
 * Prevents default focus switch behavior
 *
 * @param event might be of type PointerEvent, MouseEvent, or TouchEvent, hence the generic Event type
 *
 */
function handleSelectDefaults(
  event: MouseEvent | TouchEvent,
  disableTakeFocusOnClick: boolean,
) {
  handleCheckItemEvent(event, () => {
    // Prevents caret moving when clicking on check mark.
    event.preventDefault();
    if (disableTakeFocusOnClick) {
      event.stopPropagation();
    }
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
