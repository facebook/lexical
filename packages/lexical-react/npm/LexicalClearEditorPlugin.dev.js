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
function ClearEditorPlugin({
  onClear
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  useLayoutEffect(() => {
    return editor.registerCommand(lexical.CLEAR_EDITOR_COMMAND, payload => {
      editor.update(() => {
        if (onClear == null) {
          const root = lexical.$getRoot();
          const selection = lexical.$getSelection();
          const paragraph = lexical.$createParagraphNode();
          root.clear();
          root.append(paragraph);
          if (selection !== null) {
            paragraph.select();
          }
        } else {
          onClear();
        }
      });
      return true;
    }, lexical.COMMAND_PRIORITY_EDITOR);
  }, [editor, onClear]);
  return null;
}

exports.ClearEditorPlugin = ClearEditorPlugin;
