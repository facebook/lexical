/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
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
const INSERT_HORIZONTAL_RULE_COMMAND = lexical.createCommand('INSERT_HORIZONTAL_RULE_COMMAND');
function HorizontalRuleComponent({
  nodeKey
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection.useLexicalNodeSelection(nodeKey);
  const onDelete = React.useCallback(event => {
    if (isSelected && lexical.$isNodeSelection(lexical.$getSelection())) {
      event.preventDefault();
      const node = lexical.$getNodeByKey(nodeKey);
      if ($isHorizontalRuleNode(node)) {
        node.remove();
      }
    }
    return false;
  }, [isSelected, nodeKey]);
  React.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(lexical.CLICK_COMMAND, event => {
      const hrElem = editor.getElementByKey(nodeKey);
      if (event.target === hrElem) {
        if (!event.shiftKey) {
          clearSelection();
        }
        setSelected(!isSelected);
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_DELETE_COMMAND, onDelete, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, onDelete, lexical.COMMAND_PRIORITY_LOW));
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);
  React.useEffect(() => {
    const hrElem = editor.getElementByKey(nodeKey);
    if (hrElem !== null) {
      hrElem.className = isSelected ? 'selected' : '';
    }
  }, [editor, isSelected, nodeKey]);
  return null;
}
class HorizontalRuleNode extends lexical.DecoratorNode {
  static getType() {
    return 'horizontalrule';
  }
  static clone(node) {
    return new HorizontalRuleNode(node.__key);
  }
  static importJSON(serializedNode) {
    return $createHorizontalRuleNode();
  }
  static importDOM() {
    return {
      hr: () => ({
        conversion: convertHorizontalRuleElement,
        priority: 0
      })
    };
  }
  exportJSON() {
    return {
      type: 'horizontalrule',
      version: 1
    };
  }
  exportDOM() {
    return {
      element: document.createElement('hr')
    };
  }
  createDOM() {
    return document.createElement('hr');
  }
  getTextContent() {
    return '\n';
  }
  isInline() {
    return false;
  }
  updateDOM() {
    return false;
  }
  decorate() {
    return /*#__PURE__*/React.createElement(HorizontalRuleComponent, {
      nodeKey: this.__key
    });
  }
}
function convertHorizontalRuleElement() {
  return {
    node: $createHorizontalRuleNode()
  };
}
function $createHorizontalRuleNode() {
  return lexical.$applyNodeReplacement(new HorizontalRuleNode());
}
function $isHorizontalRuleNode(node) {
  return node instanceof HorizontalRuleNode;
}

exports.$createHorizontalRuleNode = $createHorizontalRuleNode;
exports.$isHorizontalRuleNode = $isHorizontalRuleNode;
exports.HorizontalRuleNode = HorizontalRuleNode;
exports.INSERT_HORIZONTAL_RULE_COMMAND = INSERT_HORIZONTAL_RULE_COMMAND;
