/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import * as React from 'react';
import {useEffect, useState} from 'react';
import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import useLexicalEditor from 'lexical-react/useLexicalEditor';
import useLexicalPlainText from 'lexical-react/useLexicalPlainText';
import useLexicalDecorators from 'lexical-react/useLexicalDecorators';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';

const EditorPriority: CommandListenerEditorPriority = 0;

function onError(e: Error): void {
  throw e;
}

export default function PlainTextPlugin({
  placeholder = 'Enter some plain text...',
}: {
  placeholder?: string,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor, onError);
  const {historyState} = useSharedHistoryContext();
  const [isReadOnly, setIsReadyOnly] = useState(false);
  useLexicalPlainText(editor, historyState);
  const decorators = useLexicalDecorators(editor);

  useEffect(() => {
    return editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'readOnly') {
          const readOnly = payload;
          setIsReadyOnly(readOnly);
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor]);

  return (
    <>
      <ContentEditable
        isReadOnly={isReadOnly}
        rootElementRef={rootElementRef}
      />
      {showPlaceholder && <Placeholder>{placeholder}</Placeholder>}
      {decorators}
    </>
  );
}
