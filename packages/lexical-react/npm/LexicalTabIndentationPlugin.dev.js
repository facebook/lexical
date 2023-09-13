/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

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
function indentOverTab(selection) {
  // const handled = new Set();
  const nodes = selection.getNodes();
  const canIndentBlockNodes = utils.$filter(nodes, node => {
    if (lexical.$isBlockElementNode(node) && node.canIndent()) {
      return node;
    }
    return null;
  });
  // 1. If selection spans across canIndent block nodes: indent
  if (canIndentBlockNodes.length > 0) {
    return true;
  }
  // 2. If first (anchor/focus) is at block start: indent
  const anchor = selection.anchor;
  const focus = selection.focus;
  const first = focus.isBefore(anchor) ? focus : anchor;
  const firstNode = first.getNode();
  const firstBlock = utils.$getNearestBlockElementAncestorOrThrow(firstNode);
  if (firstBlock.canIndent()) {
    const firstBlockKey = firstBlock.getKey();
    let selectionAtStart = lexical.$createRangeSelection();
    selectionAtStart.anchor.set(firstBlockKey, 0, 'element');
    selectionAtStart.focus.set(firstBlockKey, 0, 'element');
    selectionAtStart = lexical.$normalizeSelection__EXPERIMENTAL(selectionAtStart);
    if (selectionAtStart.anchor.is(first)) {
      return true;
    }
  }
  // 3. Else: tab
  return false;
}
function registerTabIndentation(editor) {
  return editor.registerCommand(lexical.KEY_TAB_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    const command = indentOverTab(selection) ? event.shiftKey ? lexical.OUTDENT_CONTENT_COMMAND : lexical.INDENT_CONTENT_COMMAND : lexical.INSERT_TAB_COMMAND;
    return editor.dispatchCommand(command, undefined);
  }, lexical.COMMAND_PRIORITY_EDITOR);
}

/**
 * This plugin adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect acessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
function TabIndentationPlugin() {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  react.useEffect(() => {
    return registerTabIndentation(editor);
  });
  return null;
}

exports.TabIndentationPlugin = TabIndentationPlugin;
exports.registerTabIndentation = registerTabIndentation;
