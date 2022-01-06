/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {HistoryState} from 'lexical-react/useLexicalHistory';

import * as React from 'react';
import {useMemo} from 'react';

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import useLexicalEditor from 'lexical-react/useLexicalEditor';
import useLexicalRichText from 'lexical-react/useLexicalRichText';
import useLexicalDecorators from 'lexical-react/useLexicalDecorators';

function onError(e: Error): void {
  throw e;
}

export default function RichTextPlugin({
  contentEditable,
  placeholder,
  historyState,
}: {
  contentEditable: (
    rootElementRef: (node: null | HTMLElement) => void,
    clear: () => void,
  ) => React$Node,
  placeholder: () => React$Node,
  historyState?: HistoryState,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor, onError);
  const clear = useLexicalRichText(editor, historyState);
  const decorators = useLexicalDecorators(editor);
  const contentEditableNode: React$Node = useMemo(
    () => contentEditable(rootElementRef, clear),
    [contentEditable, rootElementRef, clear],
  );
  const placeholderNode: React$Node = useMemo(placeholder, [placeholder]);

  return (
    <>
      {contentEditableNode}
      {showPlaceholder && placeholderNode}
      {decorators}
    </>
  );
}
