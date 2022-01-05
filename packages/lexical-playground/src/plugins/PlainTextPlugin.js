/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import useLexicalEditor from 'lexical-react/useLexicalEditor';
import useLexicalPlainText from 'lexical-react/useLexicalPlainText';
import useLexicalDecorators from 'lexical-react/useLexicalDecorators';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';
import useEditorListeners from '../hooks/useEditorListeners';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';

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
  const clear = useLexicalPlainText(editor, historyState);
  const decorators = useLexicalDecorators(editor);
  const isReadOnly = useEditorListeners(clear);

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
