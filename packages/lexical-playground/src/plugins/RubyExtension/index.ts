/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  configExtension,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  defineExtension,
  getDOMSelection,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  LexicalNode,
  registerEventListener,
  registerEventListeners,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';

import {$createRubyNode, $isRubyNode, RubyNode} from './RubyNode';

const RubyImportRule = /* @__PURE__ */ defineImportRule({
  $import: (ctx, el) => {
    const children = el.childNodes;
    const results = [];
    let pendingText = '';

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeName === 'RT') {
        const annotation = child.textContent || '';
        if (pendingText) {
          results.push($createRubyNode(pendingText, annotation));
          pendingText = '';
        }
      } else if (child.nodeName === 'RP') {
        continue;
      } else {
        pendingText += child.textContent || '';
      }
    }

    if (pendingText) {
      results.push($createTextNode(pendingText));
    }

    return results;
  },
  match: sel.tag('ruby'),
  name: '@lexical/playground/ruby',
});

function $unwrapRubiesInSelection(): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return;
  }
  for (const node of selection.getNodes()) {
    if ($isRubyNode(node)) {
      const text = $createTextNode(node.getTextContent());
      text.setFormat(node.getFormat());
      text.setStyle(node.getStyle());
      node.replace(text);
    }
  }
}

function $walkPastRubyChain(
  start: RubyNode,
  isBackward: boolean,
): {edge: RubyNode; beyond: LexicalNode | null} {
  const getSibling = isBackward
    ? (n: LexicalNode) => n.getPreviousSibling()
    : (n: LexicalNode) => n.getNextSibling();
  let edge: RubyNode = start;
  let beyond = getSibling(edge);
  while ($isRubyNode(beyond)) {
    edge = beyond;
    beyond = getSibling(edge);
  }
  return {beyond, edge};
}

function $skipRubyOnArrow(isBackward: boolean, isShift: boolean): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }
  if (!isShift && !selection.isCollapsed()) {
    return false;
  }
  const point = isShift ? selection.focus : selection.anchor;
  if (point.type !== 'text') {
    return false;
  }
  const node = point.getNode();

  let ruby: RubyNode | null = null;

  if ($isRubyNode(node) && !node.isComposing()) {
    if (isShift) {
      // Offset >=1 prevents normalization from snapping focus back onto the ruby.
      const {edge, beyond} = $walkPastRubyChain(node, isBackward);
      if (beyond !== null && $isTextNode(beyond)) {
        const offset = !isBackward
          ? Math.min(1, beyond.getTextContentSize())
          : beyond.getTextContentSize();
        selection.focus.set(beyond.getKey(), offset, 'text');
        return true;
      }
      const parent = edge.getParent();
      if (parent !== null) {
        const offset = isBackward ? 0 : parent.getChildrenSize();
        selection.focus.set(parent.getKey(), offset, 'element');
        return true;
      }
      return false;
    }
    ruby = node;
  } else if (!$isRubyNode(node)) {
    if (isBackward && point.offset === 0) {
      const prev = node.getPreviousSibling();
      if ($isRubyNode(prev)) {
        ruby = prev;
      }
    } else if (!isBackward && point.offset === node.getTextContentSize()) {
      const next = node.getNextSibling();
      if ($isRubyNode(next)) {
        ruby = next;
      }
    }
  }

  if (ruby === null) {
    return false;
  }

  const {edge, beyond} = $walkPastRubyChain(ruby, isBackward);

  if (beyond !== null && $isTextNode(beyond)) {
    const offset = isBackward ? beyond.getTextContentSize() : 0;
    if (isShift) {
      selection.focus.set(beyond.getKey(), offset, 'text');
    } else {
      selection.anchor.set(beyond.getKey(), offset, 'text');
      selection.focus.set(beyond.getKey(), offset, 'text');
    }
    return true;
  }

  if (beyond === null) {
    const parent = edge.getParent();
    if (parent !== null) {
      const offset = isBackward ? 0 : parent.getChildrenSize();
      if (isShift) {
        selection.focus.set(parent.getKey(), offset, 'element');
      } else {
        selection.anchor.set(parent.getKey(), offset, 'element');
        selection.focus.set(parent.getKey(), offset, 'element');
      }
      return true;
    }
  }

  return false;
}

function $nudgeOffRuby(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }
  const {anchor} = selection;
  if (anchor.type !== 'text') {
    return false;
  }
  const node = anchor.getNode();
  if (!$isRubyNode(node)) {
    return false;
  }
  if (node.isComposing()) {
    return false;
  }
  const len = node.getTextContentSize();
  if (anchor.offset === len || anchor.offset === 0) {
    const isEnd = anchor.offset === len;
    const sibling = isEnd ? node.getNextSibling() : node.getPreviousSibling();
    if ($isTextNode(sibling) && !$isRubyNode(sibling)) {
      const offset = isEnd ? 0 : sibling.getTextContentSize();
      selection.anchor.set(sibling.getKey(), offset, 'text');
      selection.focus.set(sibling.getKey(), offset, 'text');
      return false;
    }
  }
  return false;
}

export const RubyExtension = /* @__PURE__  */ defineExtension({
  dependencies: [
    CoreImportExtension,
    /* @__PURE__ */ configExtension(DOMImportExtension, {
      rules: [RubyImportRule],
    }),
  ],
  name: '@lexical/playground/Ruby',
  nodes: [RubyNode],
  register: editor => {
    let composingRubyInner: HTMLElement | null = null;
    let isMouseDown = false;

    function checkCompositionInRuby() {
      if (composingRubyInner) {
        return;
      }
      const domSelection = getDOMSelection(editor._window);
      if (!domSelection || !domSelection.anchorNode) {
        return;
      }
      let el: HTMLElement | null = domSelection.anchorNode.parentElement;
      while (el && !el.dataset.rubyAnnotation) {
        if (el.hasAttribute('data-lexical-key')) {
          break;
        }
        el = el.parentElement;
      }
      if (el && el.dataset.rubyAnnotation) {
        el.classList.add('PlaygroundEditorTheme__ruby--composing');
        composingRubyInner = el;
      }
    }

    function onCompositionEnd() {
      if (composingRubyInner) {
        composingRubyInner.classList.remove(
          'PlaygroundEditorTheme__ruby--composing',
        );
        composingRubyInner = null;
      }
    }

    return mergeRegister(
      editor.registerRootListener(rootElement => {
        if (rootElement) {
          return mergeRegister(
            registerEventListeners(
              rootElement,
              {
                compositionend: onCompositionEnd,
                compositionstart: checkCompositionInRuby,
                compositionupdate: checkCompositionInRuby,
              },
              true,
            ),
            registerEventListener(rootElement, 'mousedown', () => {
              isMouseDown = true;
            }),
            registerEventListener(rootElement.ownerDocument, 'mouseup', () => {
              isMouseDown = false;
            }),
          );
        }
      }),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        event => {
          if (editor.isComposing()) {
            return false;
          }
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }
          const {anchor} = selection;
          if (anchor.type !== 'text') {
            return false;
          }
          const node = anchor.getNode();
          if (anchor.offset === 0) {
            const prev = node.getPreviousSibling();
            if ($isRubyNode(prev)) {
              prev.remove();
              event.preventDefault();
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        event => {
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return false;
          }
          if (editor.isComposing()) {
            return false;
          }
          const handled = $skipRubyOnArrow(true, event.shiftKey);
          if (handled) {
            event.preventDefault();
          }
          return handled;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        event => {
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return false;
          }
          if (editor.isComposing()) {
            return false;
          }
          const handled = $skipRubyOnArrow(false, event.shiftKey);
          if (handled) {
            event.preventDefault();
          }
          return handled;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          if (isMouseDown) {
            return false;
          }
          return $nudgeOffRuby();
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        text => {
          if (typeof text === 'string') {
            $unwrapRubiesInSelection();
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  },
});
