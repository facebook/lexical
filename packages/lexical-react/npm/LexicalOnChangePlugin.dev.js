/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var react = require('react');

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
const useLayoutEffectImpl = CAN_USE_DOM ? react.useLayoutEffect : react.useEffect;
var useLayoutEffect = useLayoutEffectImpl;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function OnChangePlugin({
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false,
  onChange
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  useLayoutEffect(() => {
    if (onChange) {
      return editor.registerUpdateListener(({
        editorState,
        dirtyElements,
        dirtyLeaves,
        prevEditorState,
        tags
      }) => {
        if (ignoreSelectionChange && dirtyElements.size === 0 && dirtyLeaves.size === 0 || ignoreHistoryMergeTagChange && tags.has('history-merge') || prevEditorState.isEmpty()) {
          return;
        }
        onChange(editorState, editor, tags);
      });
    }
  }, [editor, ignoreHistoryMergeTagChange, ignoreSelectionChange, onChange]);
  return null;
}

exports.OnChangePlugin = OnChangePlugin;
