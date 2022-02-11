/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorEditor, EditorThemeClasses, LexicalNode} from 'lexical';

import LexicalComposer from '@lexical/react/LexicalComposer';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';

export default function LexicalNestedComposer({
  initialConfig = {},
  children,
}: {
  children?: React$Node,
  initialConfig?: {
    decoratorEditor: DecoratorEditor,
    namespace?: string,
    nodes?: Array<Class<LexicalNode>>,
    onError?: (Error) => void,
    theme?: EditorThemeClasses,
  },
}): React$Node {
  const [nestedEditor, setNestedEditor] = useState(null);
  const {decoratorEditor, namespace, theme, nodes, onError} = initialConfig;

  useEffect(() => {
    if (!decoratorEditor.isEmpty() && nestedEditor !== null) {
      decoratorEditor.init(nestedEditor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nestedEditor]);

  const onChange = useCallback(
    (editorState, nextNestedEditor) => {
      if (!editorState.isEmpty()) {
        decoratorEditor.set(nextNestedEditor);
      } else {
        setNestedEditor(nextNestedEditor);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <LexicalComposer
      initialConfig={{
        editor: decoratorEditor.editor,
        namespace,
        nodes,
        onError,
        theme,
      }}>
      <LexicalOnChangePlugin onChange={onChange} />
      {children}
    </LexicalComposer>
  );
}
