/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';
import type {EventHandlerState} from 'outline-react/useOutlineInputEvents';

import {useEffect, useMemo} from 'react';
import {createTextNode} from 'outline';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import {
  createParagraphNode,
  ParagraphNode,
} from 'outline-extensions/ParagraphNode';

function initEditor(editor: OutlineEditor): void {
  editor.update((view) => {
    const root = view.getRoot();

    if (root.getFirstChild() === null) {
      const text = createTextNode();
      root.append(createParagraphNode().append(text));
      text.select();
    }
  });
}

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const pluginState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
      richText: false,
      compositionSelection: null,
      isHandlingPointer: false,
    }),
    [],
  );

  useEffect(() => {
    pluginState.isReadOnly = isReadOnly;
  }, [isReadOnly, pluginState]);

  useEffect(() => {
    if (editor !== null) {
      initEditor(editor);
      return editor.addNodeType('paragraph', ParagraphNode);
    }
  }, [editor]);

  return useOutlineInputEvents(editor, pluginState);
}
