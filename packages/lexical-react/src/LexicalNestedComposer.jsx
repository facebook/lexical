/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorEditor, EditorThemeClasses} from 'lexical';

import LexicalComposer from '@lexical/react/LexicalComposer';
import {LexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import * as React from 'react';
import {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import invariant from 'shared/invariant';

export default function LexicalNestedComposer({
  initialConfig = {},
  children,
}: {
  children: React$Node,
  initialConfig: $ReadOnly<{
    decoratorEditor: DecoratorEditor,
    theme?: EditorThemeClasses,
  }>,
}): React$Node {
  const parentContext = useContext(LexicalComposerContext);
  if (parentContext == null) {
    invariant(false, 'Unexpected parent context null on a nested composer');
  }
  const [nestedEditor, setNestedEditor] = useState(null);
  const {decoratorEditor, theme} = initialConfig;

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
      initialConfig={useMemo(() => {
        const [parentEditor] = parentContext;
        return {
          editor: decoratorEditor.editor,
          namespace: parentEditor._config.namespace,
          nodes: Array.from(parentEditor._nodes.values()).map(
            (registeredNode) => registeredNode.klass,
          ),
          onError: parentEditor._onError,
          theme,
        };
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])}>
      <LexicalOnChangePlugin onChange={onChange} />
      {children}
    </LexicalComposer>
  );
}
