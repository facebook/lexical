/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';

import {useEffect, useMemo} from 'react';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import {ParagraphNode} from 'outline-extensions/ParagraphNode';

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const pluginState = useMemo(() => ({
    isReadOnly: false,
    richText: false,
    compositionSelection: null,
    isHandlingPointer: false,
  }), []);

  useEffect(() => {
    pluginState.isReadOnly = isReadOnly;
  }, [isReadOnly, pluginState]);

  useEffect(() => {
    if (editor !== null) {
      return editor.addNodeType('paragraph', ParagraphNode);
    }
  }, [editor]);

  return useOutlineInputEvents(editor, pluginState);
}
