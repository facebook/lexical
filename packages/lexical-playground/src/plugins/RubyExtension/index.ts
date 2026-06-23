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
