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
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  LexicalNode,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';

import {$createRubyNode, $isRubyNode, RubyNode} from '../../nodes/RubyNode';

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

function $unwrapRubiesInSelection(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return false;
  }
  const nodes = selection.getNodes();
  let found = false;
  for (const node of nodes) {
    if ($isRubyNode(node)) {
      found = true;
      const text = $createTextNode(node.getTextContent());
      node.replace(text);
    }
  }
  return found;
}

function $skipRubyOnArrow(isBackward: boolean): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }
  const {anchor} = selection;
  if (anchor.type !== 'text') {
    return false;
  }
  const node = anchor.getNode();

  let rubyToSkip: LexicalNode | null = null;

  if ($isRubyNode(node) && !node.isComposing()) {
    rubyToSkip = node;
  } else if (!$isRubyNode(node)) {
    if (isBackward && anchor.offset === 0) {
      const prev = node.getPreviousSibling();
      if ($isRubyNode(prev)) {
        rubyToSkip = prev;
      }
    } else if (!isBackward && anchor.offset === node.getTextContentSize()) {
      const next = node.getNextSibling();
      if ($isRubyNode(next)) {
        rubyToSkip = next;
      }
    }
  }

  if (rubyToSkip === null) {
    return false;
  }

  let target: LexicalNode | null = isBackward
    ? rubyToSkip.getPreviousSibling()
    : rubyToSkip.getNextSibling();
  while (target != null && $isRubyNode(target)) {
    target = isBackward ? target.getPreviousSibling() : target.getNextSibling();
  }

  if ($isTextNode(target) && !$isRubyNode(target)) {
    const offset = isBackward ? target.getTextContentSize() : 0;
    selection.anchor.set(target.getKey(), offset, 'text');
    selection.focus.set(target.getKey(), offset, 'text');
    return true;
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
    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        event => {
          if (
            event.shiftKey ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey
          ) {
            return false;
          }
          if (editor.isComposing()) {
            return false;
          }
          return $skipRubyOnArrow(true);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        event => {
          if (
            event.shiftKey ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey
          ) {
            return false;
          }
          if (editor.isComposing()) {
            return false;
          }
          return $skipRubyOnArrow(false);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => $nudgeOffRuby(),
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
