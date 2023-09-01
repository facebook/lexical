/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var lexical = require('lexical');
var react = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function isNodeSelected(editor, key) {
  return editor.getEditorState().read(() => {
    const node = lexical.$getNodeByKey(key);
    if (node === null) {
      return false;
    }
    return node.isSelected();
  });
}
function useLexicalNodeSelection(key) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const [isSelected, setIsSelected] = react.useState(() => isNodeSelected(editor, key));
  react.useEffect(() => {
    let isMounted = true;
    const unregister = editor.registerUpdateListener(() => {
      if (isMounted) {
        setIsSelected(isNodeSelected(editor, key));
      }
    });
    return () => {
      isMounted = false;
      unregister();
    };
  }, [editor, key]);
  const setSelected = react.useCallback(selected => {
    editor.update(() => {
      let selection = lexical.$getSelection();
      if (!lexical.$isNodeSelection(selection)) {
        selection = lexical.$createNodeSelection();
        lexical.$setSelection(selection);
      }
      if (selected) {
        selection.add(key);
      } else {
        selection.delete(key);
      }
    });
  }, [editor, key]);
  const clearSelected = react.useCallback(() => {
    editor.update(() => {
      const selection = lexical.$getSelection();
      if (lexical.$isNodeSelection(selection)) {
        selection.clear();
      }
    });
  }, [editor]);
  return [isSelected, setSelected, clearSelected];
}

exports.useLexicalNodeSelection = useLexicalNodeSelection;
