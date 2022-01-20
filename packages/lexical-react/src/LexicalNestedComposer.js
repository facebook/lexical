/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorEditor, EditorThemeClasses} from 'lexical';

import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';
import LexicalComposer from '@lexical/react/LexicalComposer';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';

export default function LexicalNestedComposer({
  children,
  initialDecoratorEditor,
  theme,
}: {
  children?: React$Node,
  initialDecoratorEditor: DecoratorEditor,
  theme?: EditorThemeClasses,
}): React$Node {
  const [nestedEditor, setNestedEditor] = useState(null);

  useEffect(() => {
    if (!initialDecoratorEditor.isEmpty() && nestedEditor !== null) {
      initialDecoratorEditor.init(nestedEditor);
    }
  }, [initialDecoratorEditor, nestedEditor]);

  const onChange = useCallback(
    (editorState, nextNestedEditor) => {
      if (!editorState.isEmpty()) {
        initialDecoratorEditor.set(nextNestedEditor);
      } else {
        setNestedEditor(nextNestedEditor);
      }
    },
    [initialDecoratorEditor],
  );

  return (
    <LexicalComposer
      initialEditor={initialDecoratorEditor.editor}
      theme={theme}>
      <LexicalOnChangePlugin onChange={onChange} />
      {children}
    </LexicalComposer>
  );
}
