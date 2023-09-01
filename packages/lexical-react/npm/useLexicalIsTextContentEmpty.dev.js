/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var text = require('@lexical/text');
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
function useLexicalIsTextContentEmpty(editor, trim) {
  const [isEmpty, setIsEmpty] = react.useState(editor.getEditorState().read(text.$isRootTextContentEmptyCurry(editor.isComposing(), trim)));
  useLayoutEffect(() => {
    return editor.registerUpdateListener(({
      editorState
    }) => {
      const isComposing = editor.isComposing();
      const currentIsEmpty = editorState.read(text.$isRootTextContentEmptyCurry(isComposing, trim));
      setIsEmpty(currentIsEmpty);
    });
  }, [editor, trim]);
  return isEmpty;
}

exports.useLexicalIsTextContentEmpty = useLexicalIsTextContentEmpty;
