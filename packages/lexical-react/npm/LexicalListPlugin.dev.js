/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var list = require('@lexical/list');
var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var react = require('react');
var utils = require('@lexical/utils');
var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function useList(editor) {
  react.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(list.INSERT_ORDERED_LIST_COMMAND, () => {
      list.insertList(editor, 'number');
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(list.INSERT_UNORDERED_LIST_COMMAND, () => {
      list.insertList(editor, 'bullet');
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(list.REMOVE_LIST_COMMAND, () => {
      list.removeList(editor);
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, () => {
      const hasHandledInsertParagraph = list.$handleListInsertParagraph();
      if (hasHandledInsertParagraph) {
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW));
  }, [editor]);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function ListPlugin() {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  react.useEffect(() => {
    if (!editor.hasNodes([list.ListNode, list.ListItemNode])) {
      throw new Error('ListPlugin: ListNode and/or ListItemNode not registered on editor');
    }
  }, [editor]);
  useList(editor);
  return null;
}

exports.ListPlugin = ListPlugin;
