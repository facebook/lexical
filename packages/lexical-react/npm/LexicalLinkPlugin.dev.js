/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var link = require('@lexical/link');
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
function LinkPlugin({
  validateUrl
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  react.useEffect(() => {
    if (!editor.hasNodes([link.LinkNode])) {
      throw new Error('LinkPlugin: LinkNode not registered on editor');
    }
    return utils.mergeRegister(editor.registerCommand(link.TOGGLE_LINK_COMMAND, payload => {
      if (payload === null) {
        link.toggleLink(payload);
        return true;
      } else if (typeof payload === 'string') {
        if (validateUrl === undefined || validateUrl(payload)) {
          link.toggleLink(payload);
          return true;
        }
        return false;
      } else {
        const {
          url,
          target,
          rel,
          title
        } = payload;
        link.toggleLink(url, {
          rel,
          target,
          title
        });
        return true;
      }
    }, lexical.COMMAND_PRIORITY_LOW), validateUrl !== undefined ? editor.registerCommand(lexical.PASTE_COMMAND, event => {
      const selection = lexical.$getSelection();
      if (!lexical.$isRangeSelection(selection) || selection.isCollapsed() || !(event instanceof ClipboardEvent) || event.clipboardData == null) {
        return false;
      }
      const clipboardText = event.clipboardData.getData('text');
      if (!validateUrl(clipboardText)) {
        return false;
      }
      // If we select nodes that are elements then avoid applying the link.
      if (!selection.getNodes().some(node => lexical.$isElementNode(node))) {
        editor.dispatchCommand(link.TOGGLE_LINK_COMMAND, clipboardText);
        event.preventDefault();
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW) : () => {
      // Don't paste arbritrary text as a link when there's no validate function
    });
  }, [editor, validateUrl]);
  return null;
}

exports.LinkPlugin = LinkPlugin;
