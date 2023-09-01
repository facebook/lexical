/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var LexicalDecoratorBlockNode = require('@lexical/react/LexicalDecoratorBlockNode');
var useLexicalNodeSelection = require('@lexical/react/useLexicalNodeSelection');
var utils = require('@lexical/utils');
var lexical = require('lexical');
var React = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function BlockWithAlignableContents({
  children,
  format,
  nodeKey,
  className
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection.useLexicalNodeSelection(nodeKey);
  const ref = React.useRef(null);
  const onDelete = React.useCallback(event => {
    if (isSelected && lexical.$isNodeSelection(lexical.$getSelection())) {
      event.preventDefault();
      const node = lexical.$getNodeByKey(nodeKey);
      if (lexical.$isDecoratorNode(node)) {
        node.remove();
      }
    }
    return false;
  }, [isSelected, nodeKey]);
  React.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(lexical.FORMAT_ELEMENT_COMMAND, formatType => {
      if (isSelected) {
        const selection = lexical.$getSelection();
        if (lexical.$isNodeSelection(selection)) {
          const node = lexical.$getNodeByKey(nodeKey);
          if (LexicalDecoratorBlockNode.$isDecoratorBlockNode(node)) {
            node.setFormat(formatType);
          }
        } else if (lexical.$isRangeSelection(selection)) {
          const nodes = selection.getNodes();
          for (const node of nodes) {
            if (LexicalDecoratorBlockNode.$isDecoratorBlockNode(node)) {
              node.setFormat(formatType);
            } else {
              const element = utils.$getNearestBlockElementAncestorOrThrow(node);
              element.setFormat(formatType);
            }
          }
        }
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.CLICK_COMMAND, event => {
      if (event.target === ref.current) {
        event.preventDefault();
        if (!event.shiftKey) {
          clearSelection();
        }
        setSelected(!isSelected);
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_DELETE_COMMAND, onDelete, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, onDelete, lexical.COMMAND_PRIORITY_LOW));
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);
  return /*#__PURE__*/React.createElement("div", {
    className: [className.base, isSelected ? className.focus : null].filter(Boolean).join(' '),
    ref: ref,
    style: {
      textAlign: format ? format : undefined
    }
  }, children);
}

exports.BlockWithAlignableContents = BlockWithAlignableContents;
