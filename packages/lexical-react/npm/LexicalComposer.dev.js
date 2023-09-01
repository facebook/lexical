/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var lexical = require('lexical');
var React = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const useLayoutEffectImpl = CAN_USE_DOM ? React.useLayoutEffect : React.useEffect;
var useLayoutEffect = useLayoutEffectImpl;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const HISTORY_MERGE_OPTIONS = {
  tag: 'history-merge'
};
function LexicalComposer({
  initialConfig,
  children
}) {
  const composerContext = React.useMemo(() => {
    const {
      theme,
      namespace,
      editor__DEPRECATED: initialEditor,
      nodes,
      onError,
      editorState: initialEditorState
    } = initialConfig;
    const context = LexicalComposerContext.createLexicalComposerContext(null, theme);
    let editor = initialEditor || null;
    if (editor === null) {
      const newEditor = lexical.createEditor({
        editable: initialConfig.editable,
        namespace,
        nodes,
        onError: error => onError(error, newEditor),
        theme
      });
      initializeEditor(newEditor, initialEditorState);
      editor = newEditor;
    }
    return [editor, context];
  },
  // We only do this for init
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);
  useLayoutEffect(() => {
    const isEditable = initialConfig.editable;
    const [editor] = composerContext;
    editor.setEditable(isEditable !== undefined ? isEditable : true);

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return /*#__PURE__*/React.createElement(LexicalComposerContext.LexicalComposerContext.Provider, {
    value: composerContext
  }, children);
}
function initializeEditor(editor, initialEditorState) {
  if (initialEditorState === null) {
    return;
  } else if (initialEditorState === undefined) {
    editor.update(() => {
      const root = lexical.$getRoot();
      if (root.isEmpty()) {
        const paragraph = lexical.$createParagraphNode();
        root.append(paragraph);
        const activeElement = CAN_USE_DOM ? document.activeElement : null;
        if (lexical.$getSelection() !== null || activeElement !== null && activeElement === editor.getRootElement()) {
          paragraph.select();
        }
      }
    }, HISTORY_MERGE_OPTIONS);
  } else if (initialEditorState !== null) {
    switch (typeof initialEditorState) {
      case 'string':
        {
          const parsedEditorState = editor.parseEditorState(initialEditorState);
          editor.setEditorState(parsedEditorState, HISTORY_MERGE_OPTIONS);
          break;
        }
      case 'object':
        {
          editor.setEditorState(initialEditorState, HISTORY_MERGE_OPTIONS);
          break;
        }
      case 'function':
        {
          editor.update(() => {
            const root = lexical.$getRoot();
            if (root.isEmpty()) {
              initialEditorState(editor);
            }
          }, HISTORY_MERGE_OPTIONS);
          break;
        }
    }
  }
}

exports.LexicalComposer = LexicalComposer;
