/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, Selection} from 'outline';

import {useEffect, useRef} from 'react';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import useOutlineFocusIn from 'outline-react/useOutlineFocusIn';
import {ParagraphNode} from 'outline-extensions/ParagraphNode';

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const pluginStateRef = useRef<{
    isReadOnly: boolean,
    richText: false,
    compositionSelection: null | Selection,
  } | null>(null);

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        isReadOnly,
        richText: false,
        compositionSelection: null,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (editor !== null) {
      return editor.addNodeType('paragraph', ParagraphNode);
    }
  }, [editor]);

  const inputEvents = useOutlineInputEvents(editor, pluginStateRef);
  useOutlineFocusIn(editor, pluginStateRef);
  return inputEvents;
}
