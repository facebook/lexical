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
function findMatchingDOM(startNode, predicate) {
  let node = startNode;
  while (node != null) {
    if (predicate(node)) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}
function LexicalClickableLinkPlugin({
  newTab = true
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  react.useEffect(() => {
    const onClick = event => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const nearestEditor = lexical.getNearestEditorFromDOMNode(target);
      if (nearestEditor === null) {
        return;
      }
      let url = null;
      let urlTarget = null;
      nearestEditor.update(() => {
        const clickedNode = lexical.$getNearestNodeFromDOMNode(target);
        if (clickedNode !== null) {
          const maybeLinkNode = utils.$findMatchingParent(clickedNode, lexical.$isElementNode);
          if (link.$isLinkNode(maybeLinkNode)) {
            url = maybeLinkNode.getURL();
            urlTarget = maybeLinkNode.getTarget();
          } else {
            const a = findMatchingDOM(target, utils.isHTMLAnchorElement);
            if (a !== null) {
              url = a.href;
              urlTarget = a.target;
            }
          }
        }
      });
      if (url === null || url === '') {
        return;
      }

      // Allow user to select link text without follwing url
      const selection = editor.getEditorState().read(lexical.$getSelection);
      if (lexical.$isRangeSelection(selection) && !selection.isCollapsed()) {
        event.preventDefault();
        return;
      }
      const isMiddle = event.type === 'auxclick' && event.button === 1;
      window.open(url, newTab || isMiddle || event.metaKey || event.ctrlKey || urlTarget === '_blank' ? '_blank' : '_self');
      event.preventDefault();
    };
    const onMouseUp = event => {
      if (event.button === 1 && editor.isEditable()) {
        onClick(event);
      }
    };
    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement !== null) {
        prevRootElement.removeEventListener('click', onClick);
        prevRootElement.removeEventListener('mouseup', onMouseUp);
      }
      if (rootElement !== null) {
        rootElement.addEventListener('click', onClick);
        rootElement.addEventListener('mouseup', onMouseUp);
      }
    });
  }, [editor, newTab]);
  return null;
}

module.exports = LexicalClickableLinkPlugin;
